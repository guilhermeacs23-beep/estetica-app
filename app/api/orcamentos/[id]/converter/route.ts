import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();

  const { data: orc } = await supabaseAdmin.from("orcamentos")
    .select("*, orcamento_servicos(*)").eq("id", params.id).single();
  if (!orc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Criar OS
  const { data: os } = await supabaseAdmin.from("ordens_servico").insert({
    tenant_id: profile!.tenant_id,
    cliente_id: orc.cliente_id,
    veiculo_id: orc.veiculo_id,
    status: "aceito",
    valor_total: orc.valor_total,
    valor_final: orc.valor_total,
    desconto: orc.desconto,
    data_entrada: new Date().toISOString().slice(0,10),
    observacoes: orc.observacoes,
  }).select().single();

  if (!os) return NextResponse.json({ error: "Erro ao criar OS" }, { status: 500 });

  // Copiar serviços
  if (orc.orcamento_servicos?.length) {
    await supabaseAdmin.from("os_servicos").insert(
      orc.orcamento_servicos.map((s: any) => ({
        os_id: os.id, tenant_id: profile!.tenant_id,
        servico_id: s.servico_id, servico_nome: s.servico_nome,
        preco_aplicado: s.preco, quantidade: s.quantidade,
      }))
    );
  }

  // Atualizar orçamento com OS gerada
  await supabaseAdmin.from("orcamentos").update({ status: "aprovado", os_id: os.id }).eq("id", params.id);
  return NextResponse.json({ os_id: os.id });
}
