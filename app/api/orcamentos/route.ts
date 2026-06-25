import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
  const { itens, ...body } = await req.json();
  const { data: orc, error } = await supabaseAdmin.from("orcamentos")
    .insert({ ...body, tenant_id: profile!.tenant_id }).select("*, clientes(nome), veiculos(placa,modelo)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (itens?.length) {
    await supabaseAdmin.from("orcamento_servicos").insert(
      itens.map((i: any) => ({ ...i, orcamento_id: orc.id }))
    );
  }
  return NextResponse.json(orc);
}
