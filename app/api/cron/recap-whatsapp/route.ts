import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const EVO_URL = process.env.EVOLUTION_API_URL ?? "";
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "studiorpm";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

async function enviarWpp(telefone: string, mensagem: string) {
  if (!EVO_URL || !EVO_KEY) return false;
  const tel = telefone.replace(/\D/g, "");
  const numero = tel.startsWith("55") ? tel : `55${tel}`;
  try {
    const r = await fetch(`${EVO_URL}/message/sendText/${INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
      body: JSON.stringify({ number: numero, text: mensagem }),
    });
    return r.ok;
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hoje = new Date();
  const resultados: Record<string, unknown>[] = [];

  const { data: configs } = await supabaseAdmin
    .from("configuracoes")
    .select("tenant_id, nome_fantasia, wpp_recap, wpp_recap_antecedencia_dias, wpp_agendamento");

  for (const config of configs ?? []) {
    const { tenant_id, nome_fantasia, wpp_recap_antecedencia_dias, wpp_recap, wpp_agendamento } = config as any;
    const antecedencia = wpp_recap_antecedencia_dias ?? 2;
    const nomeLoja = nome_fantasia ?? "Studio RPM";

    if (wpp_recap) {
      const { data: clientes } = await supabaseAdmin
        .from("clientes")
        .select("id, nome, whatsapp, telefone")
        .eq("tenant_id", tenant_id);

      for (const cliente of clientes ?? []) {
        const tel = (cliente as any).whatsapp || (cliente as any).telefone;
        if (!tel) continue;

        // OS mais recente finalizada
        const { data: osArr } = await supabaseAdmin
          .from("ordens_servico")
          .select("id, data_entrada, finalizado_em, os_servicos(servicos(tempo_retorno_dias))")
          .eq("cliente_id", cliente.id)
          .eq("status", "finalizado")
          .order("finalizado_em", { ascending: false })
          .limit(1);

        if (!osArr?.length) continue;
        const os = osArr[0] as any;
        const dataFim = os.finalizado_em ?? os.data_entrada;
        if (!dataFim) continue;

        const tempos = (os.os_servicos ?? [])
          .map((s: any) => s.servicos?.tempo_retorno_dias ?? 30)
          .filter((t: number) => t > 0);
        const tempoRetorno = tempos.length ? Math.max(...tempos) : 30;

        const dataAlvo = new Date(dataFim);
        dataAlvo.setDate(dataAlvo.getDate() + tempoRetorno);
        const diffDias = Math.round((dataAlvo.getTime() - hoje.getTime()) / 86400000);

        if (diffDias !== antecedencia) continue;

        const inicioHoje = new Date(hoje); inicioHoje.setHours(0,0,0,0);
        const { data: dup } = await supabaseAdmin
          .from("whatsapp_logs").select("id")
          .eq("tenant_id", tenant_id).eq("cliente_id", cliente.id).eq("tipo", "recap")
          .gte("enviado_em", inicioHoje.toISOString()).limit(1);
        if (dup?.length) continue;

        const nome = (cliente as any).nome?.split(" ")[0] ?? "Cliente";
        const msg = `Ola ${nome}! 🚗✨\n\nEsta chegando a hora de cuidar do seu veiculo!\nAgende agora e garanta sua vaga conosco.\n\n— ${nomeLoja}`;
        const ok = await enviarWpp(tel, msg);
        if (ok) {
          await supabaseAdmin.from("whatsapp_logs").insert({
            tenant_id, cliente_id: cliente.id, os_id: os.id,
            tipo: "recap", telefone: tel, mensagem: msg, status: "enviado",
          });
          resultados.push({ tipo: "recap", cliente: (cliente as any).nome, diffDias });
        }
      }
    }

    if (wpp_agendamento) {
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const amanhaStr = amanha.toISOString().split("T")[0];

      const { data: agendamentos } = await supabaseAdmin
        .from("ordens_servico")
        .select("id, clientes(id, nome, whatsapp, telefone), veiculos(modelo, placa)")
        .eq("tenant_id", tenant_id)
        .eq("data_entrada", amanhaStr)
        .in("status", ["aguardando", "agendado"]);

      for (const ag of agendamentos ?? []) {
        const c = (ag as any).clientes;
        const v = (ag as any).veiculos;
        const tel = c?.whatsapp || c?.telefone;
        if (!tel) continue;

        const inicioHoje = new Date(hoje); inicioHoje.setHours(0,0,0,0);
        const { data: dup } = await supabaseAdmin
          .from("whatsapp_logs").select("id")
          .eq("os_id", ag.id).eq("tipo", "agendamento")
          .gte("enviado_em", inicioHoje.toISOString()).limit(1);
        if (dup?.length) continue;

        const nome = c?.nome?.split(" ")[0] ?? "Cliente";
        const modelo = v?.modelo ?? "veiculo";
        const placa = v?.placa ? ` (${v.placa})` : "";
        const msg = `Ola ${nome}! 📅\n\nLembrando que seu *${modelo}${placa}* tem agendamento *amanha* conosco!\n\n— ${nomeLoja}`;
        const ok = await enviarWpp(tel, msg);
        if (ok) {
          await supabaseAdmin.from("whatsapp_logs").insert({
            tenant_id, cliente_id: c?.id, os_id: ag.id,
            tipo: "agendamento", telefone: tel, mensagem: msg, status: "enviado",
          });
          resultados.push({ tipo: "agendamento", cliente: c?.nome });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, enviados: resultados.length, detalhes: resultados });
}
