import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.schema("rpm").from("profiles").select("tenant_id").eq("id", user.id).single();
  const body = await req.json();
  const { data, error } = await supabaseAdmin.schema("rpm").from("clientes")
    .insert({ tenant_id: profile!.tenant_id, ...body }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
