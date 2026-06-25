import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
  const { data } = await supabaseAdmin.from("produtos").select("*").eq("tenant_id", profile!.tenant_id).eq("ativo", true).order("nome");
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("produtos").insert({ ...body, tenant_id: profile!.tenant_id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
