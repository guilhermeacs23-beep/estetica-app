import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { tokenConfere, INSTANCE } from "@/lib/whatsapp";
import { atualizarContato } from "@/lib/contatos";

/**
 * Webhook da Evolution — grava na conversa o que chega e o que sai do número da loja.
 *
 * O que mudou em 11/11/2026 (nenhuma mensagem recebida tinha entrado desde julho):
 *  - autenticação por ?t=<token> na URL, que o app mesmo configura na Evolution.
 *    Antes esperava a chave no cabeçalho "apikey", que a Evolution não manda.
 *  - aceita "messages.upsert" (v2) e "MESSAGES_UPSERT" (v1). Antes só o segundo.
 *  - a empresa vem da instância (configuracoes.wpp_instancia), não da primeira linha.
 *  - idempotente por (tenant_id, wa_id): reenvio da Evolution e eco do painel não duplicam.
 *  - fromMe entra como "enviada": o que o Alex responde pelo celular aparece no painel.
 *  - nome e foto do contato ficam em whatsapp_contatos.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  return NextResponse.json({ ok: true, webhook: "active" });
}

function extrairTexto(m: any): string | null {
  const msg = m?.message ?? {};
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage) return msg.imageMessage.caption ? `📷 ${msg.imageMessage.caption}` : "📷 Foto";
  if (msg.videoMessage) return msg.videoMessage.caption ? `🎥 ${msg.videoMessage.caption}` : "🎥 Vídeo";
  if (msg.audioMessage) return "🎤 Áudio";
  if (msg.documentMessage) return `📄 ${msg.documentMessage.fileName ?? "Documento"}`;
  if (msg.stickerMessage) return "Figurinha";
  if (msg.locationMessage) return "📍 Localização";
  if (msg.contactMessage) return `👤 Contato: ${msg.contactMessage.displayName ?? ""}`.trim();
  return null; // reações, edições, protocolos: não viram mensagem
}

async function marcarLidas(tenantId: string, numero: string, ate?: string) {
  let q = supabaseAdmin.from("whatsapp_inbox").update({ lida: true })
    .eq("tenant_id", tenantId).eq("numero", numero).eq("tipo", "recebida").eq("lida", false);
  if (ate) q = q.lte("timestamp", ate);
  await q;
}

async function tenantDaInstancia(instancia: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("configuracoes").select("tenant_id").eq("wpp_instancia", instancia).maybeSingle();
  return data?.tenant_id ?? null;
}

export async function POST(req: NextRequest) {
  if (!tokenConfere(req.nextUrl.searchParams.get("t") ?? req.headers.get("x-ponte-token") ?? "")) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const evento = String(body?.event ?? "").toLowerCase().replace(/_/g, ".");
  if (evento !== "messages.upsert" && evento !== "chats.update") return NextResponse.json({ ok: true, ignorado: evento });

  const tenantId = await tenantDaInstancia(String(body?.instance ?? INSTANCE));
  if (!tenantId) return NextResponse.json({ ok: false, error: "instância sem empresa" }, { status: 200 });

  // Conversa lida no celular: o WhatsApp avisa que zerou as não lidas daquele chat.
  if (evento === "chats.update") {
    const chats: any[] = Array.isArray(body?.data) ? body.data : [body?.data];
    for (const ch of chats) {
      const jid: string = ch?.remoteJid ?? ch?.id ?? "";
      const zerou = ch?.unreadMessages === 0 || ch?.unreadCount === 0;
      if (jid.endsWith("@s.whatsapp.net") && zerou) await marcarLidas(tenantId, jid.replace("@s.whatsapp.net", ""));
    }
    return NextResponse.json({ ok: true });
  }

  const lista: any[] = Array.isArray(body?.data) ? body.data : (body?.data?.messages ?? [body?.data]);
  const linhas: Record<string, unknown>[] = [];
  const contatos = new Map<string, string | null>();

  for (const m of lista) {
    const key = m?.key;
    const jid: string = key?.remoteJid ?? "";
    if (!jid.endsWith("@s.whatsapp.net")) continue; // grupos, status, listas
    const texto = extrairTexto(m);
    if (!texto) continue;
    const numero = jid.replace("@s.whatsapp.net", "");
    const saiu = Boolean(key?.fromMe);
    const ts = m?.messageTimestamp
      ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();
    if (!saiu) contatos.set(numero, m?.pushName ?? null);
    else if (!contatos.has(numero)) contatos.set(numero, null);
    linhas.push({
      tenant_id: tenantId,
      wa_id: key?.id ?? null,
      numero,
      nome_contato: saiu ? null : (m?.pushName ?? null),
      mensagem: String(texto).slice(0, 4000),
      tipo: saiu ? "enviada" : "recebida",
      lida: saiu,
      timestamp: ts,
    });
  }

  if (!linhas.length) return NextResponse.json({ ok: true, inseridos: 0 });

  // Nome e foto antes da mensagem: a tela já recebe o contato completo.
  for (const [numero, pushName] of contatos) {
    try {
      const c = await atualizarContato(tenantId, numero, pushName);
      for (const l of linhas) if (l.numero === numero && l.tipo === "recebida" && c.nome) l.nome_contato = c.nome;
    } catch { /* contato nunca derruba o webhook */ }
  }

  const { error } = await supabaseAdmin
    .from("whatsapp_inbox")
    .upsert(linhas, { onConflict: "tenant_id,wa_id", ignoreDuplicates: true });

  // Respondeu pelo celular = leu: o que o cliente mandou antes disso sai de "não lida".
  for (const l of linhas) {
    if (l.tipo === "enviada") await marcarLidas(tenantId, String(l.numero), String(l.timestamp));
  }

  // 200 mesmo com erro: senão a Evolution reenvia em loop. O erro fica no log da Vercel.
  if (error) console.error("webhook whatsapp:", error.message);
  return NextResponse.json({ ok: !error, recebidos: linhas.length });
}
