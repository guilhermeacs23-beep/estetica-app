import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  aguardando:"#eab308",aceito:"#3b82f6",em_atendimento:"#C41E3A",finalizado:"#22c55e",entregue:"#a855f7",recusado:"#ef4444",
};

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();

  const hoje = params.data ?? new Date().toISOString().split("T")[0];

  const { data: ordens } = await supabaseAdmin.from("ordens_servico")
    .select("id, numero, status, hora_entrada, vaga, clientes(nome), veiculos(placa, modelo)")
    .eq("tenant_id", profile!.tenant_id).eq("data_entrada", hoje)
    .order("hora_entrada");

  const { data: config } = await supabaseAdmin.from("configuracoes")
    .select("vagas_dia").eq("tenant_id", profile!.tenant_id).single();
  const vagasDia = config?.vagas_dia ?? 5;

  const prevDay = new Date(hoje + "T12:00");
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(hoje + "T12:00");
  nextDay.setDate(nextDay.getDate() + 1);

  const vagas = Array.from({ length: vagasDia }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Agenda</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{new Date(hoje + "T12:00").toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/agenda?data=${prevDay.toISOString().split("T")[0]}`} className="btn btn-secondary btn-sm">←</Link>
          <Link href={`/agenda?data=${new Date().toISOString().split("T")[0]}`} className="btn btn-secondary btn-sm">Hoje</Link>
          <Link href={`/agenda?data=${nextDay.toISOString().split("T")[0]}`} className="btn btn-secondary btn-sm">→</Link>
          <Link href={`/ordens-de-servico/nova?data=${hoje}`} className="btn btn-primary btn-sm">+ Nova OS</Link>
        </div>
      </div>

      <div className="card p-0">
        <div className="grid border-b" style={{ gridTemplateColumns: `120px repeat(${vagasDia}, 1fr)`, borderColor: "var(--border)" }}>
          <div className="p-3 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Vaga</div>
          {vagas.map(v => (
            <div key={v} className="p-3 text-xs font-semibold text-center uppercase" style={{ color: "var(--text-muted)", borderLeft: "1px solid var(--border)" }}>Vaga {v}</div>
          ))}
        </div>
        {ordens && ordens.length === 0 ? (
          <div className="p-10 text-center" style={{ color: "var(--text-muted)" }}>
            <p className="text-4xl mb-3">📅</p>
            <p>Nenhum agendamento para este dia</p>
            <Link href={`/ordens-de-servico/nova?data=${hoje}`} className="btn btn-primary mt-4 inline-flex">+ Nova OS</Link>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: `120px repeat(${vagasDia}, 1fr)` }}>
            {ordens?.map((o: any, i) => {
              const col = (o.vaga ?? 1);
              return (
                <Link key={o.id} href={`/ordens-de-servico/${o.id}`}
                  className="p-3 m-1 rounded-lg block"
                  style={{ gridColumn: col + 1, background: `${STATUS_COLOR[o.status]}15`, border: `1px solid ${STATUS_COLOR[o.status]}44` }}>
                  <p className="text-xs font-bold" style={{ color: STATUS_COLOR[o.status] }}>{o.hora_entrada ?? "--:--"}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>{o.veiculos?.placa}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{o.clientes?.nome}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
