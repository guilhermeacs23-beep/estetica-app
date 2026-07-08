import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function getTenantId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
  return p?.tenant_id ?? null;
}

export async function GET(req: NextRequest) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const numero = req.nextUrl.searchParams.get("numero");

  if (numero) {
    const { data: mensagens } = await supabaseAdmin
      .from("whatsapp_inbox").select("*")
      .eq("tenant_id", tenantId).eq("numero", numero)
      .order("timestamp", { ascending: true }).limit(200);
    return NextResponse.json({ mensagens: mensagens ?? [] });
  }

  const { data: rows } = await supabaseAdmin
    .from("whatsapp_inbox")
    .select("numero, nome_contato, mensagem, tipo, lida, timestamp")
    .eq("tenant_id", tenantId)
    .order("timestamp", { ascending: false });

  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows ?? []) {
    if (!map.has(row.numero)) {
      map.set(row.numero, {
        numero: row.numero,
        nome: row.nome_contato || row.numero,
        ultimaMensagem: row.mensagem,
        timestamp: row.timestamp,
        naoLidas: 0,
      });
    }
    if (!row.lida && row.tipo === "recebida") {
      (map.get(row.numero) as any).naoLidas++;
    }
  }

  return NextResponse.json({ conversas: Array.from(map.values()) });
}

export async function PATCH(req: NextRequest) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { numero } = await req.json();
  await supabaseAdmin.from("whatsapp_inbox")
    .update({ lida: true })
    .eq("tenant_id", tenantId).eq("numero", numero).eq("tipo", "recebida");
  return NextResponse.json({ ok: true });
}
