import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const EVO_URL = process.env.EVOLUTION_API_URL ?? "";
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? "studiorpm";

async function enviarWhatsApp(telefone: string, mensagem: string) {
  if (!EVO_URL || !EVO_KEY) return;
  const tel = telefone.replace(/\D/g, "");
  const numero = tel.startsWith("55") ? tel : `55${tel}`;
  try {
    await fetch(`${EVO_URL}/message/sendText/${INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
      body: JSON.stringify({ number: numero, text: mensagem }),
    });
  } catch {}
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const { data: os, error } = await supabaseAdmin
    .from("ordens_servico")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, clientes(nome, whatsapp, telefone), veiculos(modelo, placa)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Disparo automático WhatsApp quando OS finalizada
  if (body.status === "finalizado" && os) {
    const cliente = os.clientes as any;
    const veiculo = os.veiculos as any;
    const tel = cliente?.whatsapp || cliente?.telefone;
    if (tel) {
      const modelo = veiculo?.modelo ?? "seu veículo";
      const placa  = veiculo?.placa ? ` (${veiculo.placa.toUpperCase()})` : "";
      const nome   = cliente?.nome?.split(" ")[0] ?? "Cliente";
      const msg = `Olá ${nome}! 🚗✨\n\nSeu *${modelo}${placa}* está pronto e aguardando retirada no Studio RPM!\n\nQualquer dúvida, é só chamar. Obrigado pela preferência! 🙏`;
      await enviarWhatsApp(tel, msg);
    }
  }

  return NextResponse.json({ ok: true });
}
