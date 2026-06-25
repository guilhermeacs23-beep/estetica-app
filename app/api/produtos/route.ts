import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
  const { data } = await supabaseAdmin
    .from("produtos")
    .select("*")
    .eq("tenant_id", profile!.tenant_id)
    .order("nome");
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("produtos")
    .insert({ tenant_id: profile!.tenant_id, ativo: true, ...body })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...rest } = body;
  const { data, error } = await supabaseAdmin
    .from("produtos")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await supabaseAdmin.from("produtos").update({ ativo: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}
