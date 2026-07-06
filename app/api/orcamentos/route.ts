import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();

  const { itens, clienteId, nomeAvulso, placaAvulsa, modeloAvulso, validade, observacoes, desconto, valorTotal } = await req.json();

  const { data: orc, error } = await supabaseAdmin.from("orcamentos")
    .insert({
      tenant_id: profile!.tenant_id,
      cliente_id: clienteId ?? null,
      nome_avulso: nomeAvulso ?? null,
      placa_avulsa: placaAvulsa ?? null,
      modelo_avulso: modeloAvulso ?? null,
      validade: validade ?? null,
      observacoes: observacoes ?? null,
      desconto: desconto ?? 0,
      valor_total: valorTotal ?? 0,
      status: "pendente",
    })
    .select("*, clientes(nome), veiculos(placa,modelo)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (itens?.length) {
    await supabaseAdmin.from("orcamento_servicos").insert(
      itens.map((i: any) => ({ ...i, orcamento_id: orc.id }))
    );
  }
  return NextResponse.json(orc);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from("orcamentos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
