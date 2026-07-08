import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  return NextResponse.json({ ok: true, webhook: "active" });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("apikey");
    if (process.env.EVOLUTION_API_KEY && apiKey !== process.env.EVOLUTION_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body?.event !== "MESSAGES_UPSERT" || !body?.data) {
      return NextResponse.json({ ok: true });
    }

    const msg = body.data;
    const remoteJid: string = msg?.key?.remoteJid ?? "";
    if (remoteJid.includes("@g.us")) return NextResponse.json({ ok: true });

    const fromMe: boolean = msg?.key?.fromMe ?? false;
    const numero = remoteJid.replace("@s.whatsapp.net", "");
    const texto: string =
      msg?.message?.conversation ||
      msg?.message?.extendedTextMessage?.text ||
      msg?.message?.imageMessage?.caption ||
      "[Midia]";
    const pushName: string | null = msg?.pushName ?? null;
    const ts = msg?.messageTimestamp
      ? new Date(parseInt(msg.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();

    // Encontrar tenant (MVP: primeiro tenant com configuracao)
    const { data: configs } = await supabaseAdmin
      .from("configuracoes").select("tenant_id").limit(1);
    const tenantId = configs?.[0]?.tenant_id;
    if (!tenantId) return NextResponse.json({ ok: true });

    // Buscar nome do cliente
    let nomeContato: string | null = fromMe ? null : pushName;
    if (!fromMe) {
      const { data: cli } = await supabaseAdmin
        .from("clientes").select("nome")
        .eq("tenant_id", tenantId)
        .ilike("whatsapp", "%" + numero.slice(-9))
        .maybeSingle();
      if (cli?.nome) nomeContato = cli.nome;
    }

    await supabaseAdmin.from("whatsapp_inbox").insert({
      tenant_id: tenantId,
      numero,
      nome_contato: nomeContato,
      mensagem: texto,
      tipo: fromMe ? "enviada" : "recebida",
      lida: fromMe,
      timestamp: ts,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
