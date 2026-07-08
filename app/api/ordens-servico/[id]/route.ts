import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const EVO_URL = process.env.EVOLUTION_API_URL ?? "";
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "studiorpm";

async function enviarWhatsApp(telefone: string, mensagem: string, tipo: string, tenantId: string, clienteId?: string, osId?: string) {
  if (!EVO_URL || !EVO_KEY) return;
  const tel = telefone.replace(/\D/g, "");
  const numero = tel.startsWith("55") ? tel : `55${tel}`;
  try {
    await fetch(`${EVO_URL}/message/sendText/${INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
      body: JSON.stringify({ number: numero, text: mensagem }),
    });
    // Log
    await supabaseAdmin.from("whatsapp_logs").insert({
      tenant_id: tenantId, cliente_id: clienteId ?? null,
      os_id: osId ?? null, tipo, telefone: numero, mensagem, status: "enviado",
    });
  } catch {}
}

async function getConfig(tenantId: string) {
  const { data } = await supabaseAdmin
    .from("configuracoes")
    .select("nome_fantasia, wpp_os_criada, wpp_os_execucao, wpp_os_finalizada, wpp_agendamento")
    .eq("tenant_id", tenantId)
    .single();
  return data;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("ordens_servico")
    .select("*, clientes(id, nome, whatsapp, telefone), veiculos(modelo, placa, cor, ano), os_servicos(servicos(nome, preco)), os_fotos(*)")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const { data: os, error } = await supabaseAdmin
    .from("ordens_servico")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, clientes(id, nome, whatsapp, telefone), veiculos(modelo, placa)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Disparos automaticos de WhatsApp
  if (os) {
    const cliente = os.clientes as any;
    const veiculo = os.veiculos as any;
    const tel = cliente?.whatsapp || cliente?.telefone;
    const nome = cliente?.nome?.split(" ")[0] ?? "Cliente";
    const modelo = veiculo?.modelo ?? "veículo";
    const placa = veiculo?.placa ? ` (${veiculo.placa})` : "";
    const tenantId = os.tenant_id;
    const config = await getConfig(tenantId);
    const nomeLoja = config?.nome_fantasia ?? "Studio RPM";

    if (tel) {
      if (body.status === "em_execucao" && config?.wpp_os_execucao) {
        await enviarWhatsApp(tel,
          `Olá ${nome}! 🔧\n\nSeu *${modelo}${placa}* já está com nosso técnico e o serviço começou!\n\n— ${nomeLoja}`,
          "os_execucao", tenantId, cliente?.id, id
        );
      }
      if (body.status === "finalizado" && config?.wpp_os_finalizada) {
        await enviarWhatsApp(tel,
          `Olá ${nome}! ✨\n\nSeu *${modelo}${placa}* está *pronto* para retirada!\n\nObrigado pela preferência 🙏\n— ${nomeLoja}`,
          "os_finalizada", tenantId, cliente?.id, id
        );
      }
    }
  }

  return NextResponse.json(os);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data: os, error } = await supabaseAdmin
    .from("ordens_servico")
    .insert(body)
    .select("*, clientes(id, nome, whatsapp, telefone), veiculos(modelo, placa)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Disparo: OS criada
  if (os) {
    const cliente = os.clientes as any;
    const veiculo = os.veiculos as any;
    const tel = cliente?.whatsapp || cliente?.telefone;
    const nome = cliente?.nome?.split(" ")[0] ?? "Cliente";
    const modelo = veiculo?.modelo ?? "veículo";
    const placa = veiculo?.placa ? ` (${veiculo.placa})` : "";
    const tenantId = os.tenant_id;
    const config = await getConfig(tenantId);
    const nomeLoja = config?.nome_fantasia ?? "Studio RPM";

    if (tel && config?.wpp_os_criada) {
      await enviarWhatsApp(tel,
        `Olá ${nome}! 🚗\n\nRecebemos seu *${modelo}${placa}* e abrimos uma OS para você.\nAssim que ficar pronto, avisamos!\n\n— ${nomeLoja}`,
        "os_criada", tenantId, cliente?.id, os.id
      );
    }
  }

  return NextResponse.json(os, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("ordens_servico").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
