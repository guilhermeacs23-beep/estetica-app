import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  aguardando:"#eab308",aceito:"#3b82f6",em_atendimento:"#f97316",finalizado:"#22c55e",entregue:"#a855f7",recusado:"#ef4444",
};
const STATUS_LABEL: Record<string, string> = {
  aguardando:"Aguardando",aceito:"Aceito",em_atendimento:"Em Atendimento",finalizado:"Finalizado",entregue:"Entregue",recusado:"Recusado",
};

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();

  const hoje = params.data ?? new Date().toISOString().split("T")[0];

  const { data: ordens } = await supabaseAdmin.from("ordens_servico")
    .select("id, numero, status, hora_entrada, clientes(nome), veiculos(placa, modelo, cor), os_servicos(nome)")
    .eq("tenant_id", profile!.tenant_id).eq("data_entrada", hoje)
    .neq("status", "recusado").order("hora_entrada");

  const prevDay = new Date(hoje + "T12:00");
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(hoje + "T12:00");
  nextDay.setDate(nextDay.getDate() + 1);

  const dataBR = new Date(hoje + "T12:00").toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" });
  const isHoje = hoje === new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 860 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Agenda</h1>
          <p className="text-sm mt-1 capitalize" style={{ color: "var(--text-muted)" }}>
            {isHoje ? "Hoje — " : ""}{dataBR}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/agenda?data=${prevDay.toISOString().split("T")[0]}`} className="btn btn-secondary btn-sm">←</Link>
          <Link href="/agenda" className="btn btn-secondary btn-sm">Hoje</Link>
          <Link href={`/agenda?data=${nextDay.toISOString().split("T")[0]}`} className="btn btn-secondary btn-sm">→</Link>
          <Link href={`/ordens-de-servico/nova`} className="btn btn-primary btn-sm">+ Nova OS</Link>
        </div>
      </div>

      {/* KPI do dia */}
      <div className="grid grid-cols-3 gap-4">
        {["aguardando","em_atendimento","finalizado"].map(s => {
          const count = ordens?.filter(o => o.status === s).length ?? 0;
          return (
            <div key={s} className="card text-center" style={{ borderLeft: `3px solid ${STATUS_COLOR[s]}` }}>
              <p className="text-2xl font-bold" style={{ color: STATUS_COLOR[s] }}>{count}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{STATUS_LABEL[s]}</p>
            </div>
          );
        })}
      </div>

      {/* Lista de OS do dia */}
      {!ordens?.length ? (
        <div className="card p-10 text-center" style={{ color: "var(--text-muted)" }}>
          <p className="text-3xl mb-3">📅</p>
          <p>Nenhum agendamento para este dia</p>
          <Link href="/ordens-de-servico/nova" className="btn btn-primary mt-4 inline-flex">+ Nova OS</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ordens.map((o: any) => {
            const servicos = Array.isArray(o.os_servicos) ? o.os_servicos.map((s: any) => s.nome).join(", ") : "";
            const veiculo = o.veiculos;
            const cor = STATUS_COLOR[o.status] ?? "#888";
            return (
              <Link key={o.id} href={`/ordens-de-servico/${o.id}`}
                className="card flex items-center gap-4 hover:opacity-90 transition-opacity"
                style={{ borderLeft: `4px solid ${cor}`, padding: "14px 18px" }}>
                {/* Hora */}
                <div className="text-center flex-shrink-0" style={{ minWidth: 52 }}>
                  <p className="text-base font-bold" style={{ color: cor }}>{o.hora_entrada ?? "--:--