import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ data: [] });
  const { data } = await supabaseAdmin
    .from("veiculos")
    .select("id, placa, modelo, marca, cor, ano")
    .eq("cliente_id", clienteId)
    .order("placa");
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("tenant_id").eq("id", user.id).single();
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("veiculos")
    .insert({ tenant_id: profile!.tenant_id, ...body })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...rest } = body;
  const { data, error } = await supabaseAdmin
    .from("veiculos").update(rest).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
