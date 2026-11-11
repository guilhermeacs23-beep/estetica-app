import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** "" vira null: o banco não aceita texto vazio em coluna uuid. */
const id = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function POST(req: NextRequest) {
  try {
    // Empresa e usuário vêm da sessão, não do corpo: antes qualquer um podia
    // mandar o tenantId que quisesse para esta rota.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sessão expirada. Entre de novo." }, { status: 401 });
    const { data: perfil } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();
    const tenantId = perfil?.tenant_id;
    if (!tenantId) return NextResponse.json({ error: "Usuário sem empresa." }, { status: 403 });
    const userId = user.id;

    const body = await req.json();
    const { novoCliente, novoVeiculo,
      checklist, itens, dataEntrada, horaEntrada, observacoes,
      formaPagamentoId, desconto, valorTotal, valorFinal } = body;

    let cId = id(body.clienteId);
    let vId = id(body.veiculoId);

    if (novoCliente) {
      const { data: c, error } = await supabaseAdmin.from("clientes")
        .insert({ tenant_id: tenantId, ...novoCliente }).select().single();
      if (error) return NextResponse.json({ error: "Não consegui cadastrar o cliente: " + error.message }, { status: 400 });
      cId = c?.id ?? null;
    }
    if (!cId) return NextResponse.json({ error: "Selecione ou cadastre o cliente." }, { status: 400 });

    if (novoVeiculo) {
      const { data: v, error } = await supabaseAdmin.from("veiculos")
        .insert({ tenant_id: tenantId, cliente_id: cId, ...novoVeiculo }).select().single();
      if (error) return NextResponse.json({ error: "Não consegui cadastrar o veículo: " + error.message }, { status: 400 });
      vId = v?.id ?? null;
    }
    if (!vId) return NextResponse.json({ error: "Selecione ou cadastre o veículo." }, { status: 400 });

    const { count } = await supabaseAdmin.from("ordens_servico")
      .select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
    const numero = (count ?? 0) + 1;

    const { data: os, error: osErr } = await supabaseAdmin.from("ordens_servico").insert({
      tenant_id: tenantId, numero, cliente_id: cId, veiculo_id: vId,
      status: "aguardando", data_entrada: dataEntrada, hora_entrada: horaEntrada,
      checklist_entrada: checklist, observacoes,
      forma_pagamento_id: id(formaPagamentoId),
      desconto: desconto || 0, valor_total: valorTotal, valor_final: valorFinal,
      created_by: userId,
    }).select().single();

    if (osErr) return NextResponse.json({ error: osErr.message }, { status: 500 });

    if (itens?.length) {
      const { error: itErr } = await supabaseAdmin.from("os_servicos").insert(
        itens.map((i: any) => ({
          os_id: os.id, servico_id: id(i.servicoId), nome: i.nome, preco: i.preco,
          funcionario_id: id(i.funcionarioId),
        }))
      );
      // OS sem serviços não fica pela metade: desfaz e avisa.
      if (itErr) {
        await supabaseAdmin.from("ordens_servico").delete().eq("id", os.id);
        return NextResponse.json({ error: "Não consegui gravar os serviços: " + itErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ osId: os.id });
  } catch (err) {
    console.error("criar OS:", err);
    return NextResponse.json({ error: "Erro interno ao criar a OS." }, { status: 500 });
  }
}
