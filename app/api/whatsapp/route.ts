import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  INSTANCE, configurado, evo, enviarTexto, configurarWebhook, webhookAtual, webhookUrl, versaoServidor,
} from "@/lib/whatsapp";
import { atualizarContato } from "@/lib/contatos";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function usuario() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabaseAdmin.from("profiles").select("tenant_id, role").eq("id", user.id).single();
  return p ? { id: user.id, tenantId: p.tenant_id as string, role: p.role as string } : null;
}

function origem(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const u = await usuario();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!configurado()) return NextResponse.json({ error: "WhatsApp não configurado no servidor", configured: false });

  const action = req.nextUrl.searchParams.get("action") ?? "status";

  if (action === "status") {
    const { ok, status, dado } = await evo(`/instance/connectionState/${INSTANCE}`).catch(() => ({ ok: false, status: 0, dado: null }));
    if (status === 404) return NextResponse.json({ state: "sem_instancia" });
    if (!ok) return NextResponse.json({ state: "close", error: "Servidor do WhatsApp fora do ar" });
    return NextResponse.json(dado);
  }

  if (action === "qrcode") {
    // Cria a instância só se ela não existir (o nome é fixo; nada de criar duplicata).
    const st = await evo(`/instance/connectionState/${INSTANCE}`).catch(() => ({ status: 0 } as any));
    if (st.status === 404) {
      const v = await versaoServidor();
      await evo(`/instance/create`, "POST", v.startsWith("1")
        ? { instanceName: INSTANCE, qrcode: true }
        : { instanceName: INSTANCE, qrcode: true, integration: "WHATSAPP-BAILEYS" });
    }
    // O webhook já sai apontado antes da leitura do QR: a primeira mensagem não se perde.
    await configurarWebhook(webhookUrl(origem(req))).catch(() => null);
    const { dado } = await evo(`/instance/connect/${INSTANCE}`);
    const d = dado as any;
    const base64 = d?.base64 || d?.qrcode?.base64 || null;
    return NextResponse.json({ base64 });
  }

  if (action === "setup-webhook") {
    const url = webhookUrl(origem(req));
    const r = await configurarWebhook(url);
    const gravado = await webhookAtual();
    return NextResponse.json({ ok: r.ok && gravado === url, versao: r.versao, conferido: gravado === url });
  }

  if (action === "desconectar" && u.role === "owner") {
    const r = await evo(`/instance/logout/${INSTANCE}`, "DELETE");
    return NextResponse.json({ ok: r.ok });
  }

  return NextResponse.json({ error: "action invalida" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const u = await usuario();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { telefone, mensagem } = await req.json();
  if (!telefone || !mensagem) return NextResponse.json({ error: "telefone e mensagem obrigatorios" }, { status: 400 });

  const r = await enviarTexto(telefone, mensagem);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.erro ?? "falha no envio" });

  // Grava com o wa_id: quando o eco voltar pelo webhook, o índice único descarta.
  const c = await atualizarContato(u.tenantId, r.numero).catch(() => ({ nome: null }));
  await supabaseAdmin.from("whatsapp_inbox").upsert({
    tenant_id: u.tenantId,
    wa_id: r.waId,
    numero: r.numero,
    nome_contato: c.nome,
    mensagem,
    tipo: "enviada",
    lida: true,
    timestamp: new Date().toISOString(),
  }, { onConflict: "tenant_id,wa_id", ignoreDuplicates: true });

  return NextResponse.json({ ok: true });
}
