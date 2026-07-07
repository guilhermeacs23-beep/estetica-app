import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
  const { data } = await supabaseAdmin.from("configuracoes").select("*").eq("tenant_id", profile!.tenant_id).single();
  return NextResponse.json(data ?? {});
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
  const body = await req.json();
  // upsert garante que cria a linha se não existir
  const { error } = await supabaseAdmin
    .from("configuracoes")
    .upsert({ ...body, tenant_id: profile!.tenant_id, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
