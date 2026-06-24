import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando", aceito: "Aceito", em_atendimento: "Em Atendimento",
  finalizado: "Finalizado", entregue: "Entregue", recusado: "Recusado",
};

export default async function OSListPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.schema("rpm").from("profiles").select("tenant_id").eq("id", user!.id).single();

  let query = supabaseAdmin.schema("rpm").from("ordens_servico")
    .select("id, numero, status, data_entrada, hora_entrada, valor_final, clientes(nome), veiculos(placa, modelo, cor)")
    .eq("tenant_id", profile!.tenant_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (params.status) query = query.eq("status", params.status);

  const { data: ordens } = await query;

  const STATUSES = ["aguardando", "aceito", "em_atendimento", "finalizado", "entregue", "recusado"];

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Ordens de Serviço</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{ordens?.length ?? 0} registros encontrados</p>
        </div>
        <Link href="/ordens-de-servico/nova" className="btn btn-primary">+ Nova OS</Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/ordens-de-servico" className={`btn btn-sm ${!params.status ? "btn-primary" : "btn-secondary"}`}>Todas</Link>
        {STATUSES.map(s => (
          <Link key={s} href={`/ordens-de-servico?status=${s}`}
            className={`btn btn-sm ${params.status === s ? "btn-primary" : "btn-secondary"}`}>
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {/* Tabela */}
      <div className="table-wrapper">
        <table>
          <thead><tr>
            <th>Nº</th><th>Cliente</th><th>Veículo</th><th>Data</th><th>Horário</th><th>Valor</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {!ordens?.length ? (
              <tr><td colSpan={8} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                Nenhuma ordem de serviço encontrada.
              </td></tr>
            ) : ordens.map((os: any) => (
              <tr key={os.id}>
                <td><Link href={`/ordens-de-servico/${os.id}`} style={{ color: "var(--primary)" }} className="font-semibold">#{os.numero}</Link></td>
                <td style={{ color: "var(--text)" }}>{os.clientes?.nome ?? "-"}</td>
                <td>
                  <span className="font-medium" style={{ color: "var(--text)" }}>{os.veiculos?.placa}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>{os.veiculos?.modelo}</span>
                </td>
                <td style={{ color: "var(--text-muted)" }}>{new Date(os.data_entrada + "T00:00").toLocaleDateString("pt-BR")}</td>
                <td style={{ color: "var(--text-muted)" }}>{os.hora_entrada ?? "-"}</td>
                <td style={{ color: "var(--text)" }}>{os.valor_final ? `R$ ${os.valor_final.toFixed(2).replace(".", ",")}` : "-"}</td>
                <td><span className={`badge badge-${os.status.replace("_", "-")}`}>{STATUS_LABEL[os.status]}</span></td>
                <td><Link href={`/ordens-de-servico/${os.id}`} className="btn btn-sm btn-ghost">Ver →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
