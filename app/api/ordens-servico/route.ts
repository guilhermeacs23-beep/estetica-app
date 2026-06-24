import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, userId, clienteId, novoCliente, veiculoId, novoVeiculo,
      checklist, itens, dataEntrada, horaEntrada, vaga, observacoes,
      formaPagamentoId, desconto, valorTotal, valorFinal } = body;

    let cId = clienteId;
    let vId = veiculoId;

    // Criar cliente se novo
    if (novoCliente) {
      const { data: c } = await supabaseAdmin.schema("rpm").from("clientes")
        .insert({ tenant_id: tenantId, ...novoCliente }).select().single();
      cId = c?.id;
    }

    // Criar veículo se novo
    if (novoVeiculo && cId) {
      const { data: v } = await supabaseAdmin.schema("rpm").from("veiculos")
        .insert({ tenant_id: tenantId, cliente_id: cId, ...novoVeiculo }).select().single();
      vId = v?.id;
    }

    // Próximo número de OS
    const { count } = await supabaseAdmin.schema("rpm").from("ordens_servico")
      .select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
    const numero = (count ?? 0) + 1;

    // Criar OS
    const { data: os, error: osErr } = await supabaseAdmin.schema("rpm").from("ordens_servico").insert({
      tenant_id: tenantId, numero, cliente_id: cId, veiculo_id: vId,
      status: "aguardando", data_entrada: dataEntrada, hora_entrada: horaEntrada,
      vaga, checklist_entrada: checklist, observacoes,
      forma_pagamento_id: formaPagamentoId || null,
      desconto: desconto || 0, valor_total: valorTotal, valor_final: valorFinal,
      created_by: userId,
    }).select().single();

    if (osErr) return NextResponse.json({ error: osErr.message }, { status: 500 });

    // Criar itens
    if (itens?.length) {
      await supabaseAdmin.schema("rpm").from("os_servicos").insert(
        itens.map((i: any) => ({
          os_id: os.id, servico_id: i.servicoId, nome: i.nome, preco: i.preco,
          funcionario_id: i.funcionarioId || null,
        }))
      );
    }

    return NextResponse.json({ osId: os.id });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
