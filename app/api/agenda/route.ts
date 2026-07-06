import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user.id).single();

  const from = req.nextUrl.searchParams.get("from") ?? new Date().toISOString().split("T")[0];
  const to   = req.nextUrl.searchParams.get("to")   ?? from;

  const { data } = await supabaseAdmin
    .from("ordens_servico")
    .select("id, numero, status, hora_entrada, data_entrada, clientes(nome), veiculos(placa, modelo)")
    .eq("tenant_id", profile!.tenant_id)
    .gte("data_entrada", from)
    .lte("data_entrada", to)
    .neq("status", "recusado")
    .order("hora_entrada");

  const events = (data ?? []).map((o: any) => ({
    id: o.id,
    numero: o.numero,
    status: o.status,
    hora: o.hora_entrada ?? "",
    data: o.data_entrada,
    nome: o.clientes?.nome ?? "—",
    veiculo: [o.veiculos?.placa, o.veiculos?.modelo].filter(Boolean).join(" · "),
  }));

  return NextResponse.json(events);
}
