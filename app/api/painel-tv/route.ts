import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ordens: [] });
  const { data: profile } = await supabaseAdmin.schema("rpm").from("profiles").select("tenant_id").eq("id", user.id).single();
  const hoje = new Date().toISOString().split("T")[0];
  const { data: ordens } = await supabaseAdmin.schema("rpm").from("ordens_servico")
    .select("*, clientes(nome), veiculos(placa, modelo), os_servicos(nome, funcionarios(nome))")
    .eq("tenant_id", profile!.tenant_id).eq("data_entrada", hoje)
    .neq("status", "recusado").order("hora_entrada");
  return NextResponse.json({ ordens: ordens ?? [] });
}
