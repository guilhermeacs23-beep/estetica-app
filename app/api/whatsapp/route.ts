import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const EVO_URL = process.env.EVOLUTION_API_URL ?? "";
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "studiorpm";

async function evo(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${EVO_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!EVO_URL || !EVO_KEY) {
    return NextResponse.json({ error: "Evolution API nao configurada", configured: false });
  }

  const action = req.nextUrl.searchParams.get("action") ?? "status";

  if (action === "status") {
    try {
      const data = await evo(`/instance/connectionState/${INSTANCE}`);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ state: "close", error: "Evolution API offline" });
    }
  }

  if (action === "qrcode") {
    try {
      // Criar instancia se nao existir
      await evo(`/instance/create`, "POST", {
        instanceName: INSTANCE,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }).catch(() => {});

      // Aguardar um momento
      await new Promise(r => setTimeout(r, 1000));

      // Pegar QR code
      const data = await evo(`/instance/connect/${INSTANCE}`);

      // Extrair base64 de diferentes formatos da Evolution API
      const base64 =
        data?.base64 ||
        data?.qrcode?.base64 ||
        data?.code ||
        null;

      return NextResponse.json({ base64, raw: data });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "action invalida" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { telefone, mensagem } = await req.json();
  if (!telefone || !mensagem) return NextResponse.json({ error: "telefone e mensagem obrigatorios" }, { status: 400 });

  const tel = telefone.replace(/\D/g, "");
  const numero = tel.startsWith("55") ? tel : `55${tel}`;

  try {
    const data = await evo(`/message/sendText/${INSTANCE}`, "POST", {
      number: numero,
      text: mensagem,
    });
    const ok = !data?.error && !data?.message?.includes("error");
    return NextResponse.json({ ok, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
