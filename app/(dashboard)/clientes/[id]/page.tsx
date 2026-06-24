import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { notFound } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  aguardando:"Aguardando",aceito:"Aceito",em_atendimento:"Em Atendimento",
  finalizado:"Finalizado",entregue:"Entregue",recusado:"Recusado",
};

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();

  const [{ data: cliente }, { data: veiculos }, { data: ordens }] = await Promise.all([
    supabaseAdmin.from("clientes").select("*").eq("id", id).eq("tenant_id", profile!.tenant_id).single(),
    supabaseAdmin.from("veiculos").select("*").eq("cliente_id", id).order("created_at"),
    supabaseAdmin.from("ordens_servico").select("id, numero, status, data_entrada, valor_final, veiculos(placa, modelo)")
      .eq("cliente_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <Link href="/clientes" className="text-sm" style={{ color: "var(--text-muted)" }}>← Clientes</Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: "var(--text)" }}>{cliente.nome}</h1>
        <div className="flex gap-4 mt-2 flex-wrap">
          {cliente.telefone && <span className="text-sm" style={{ color: "var(--text-muted)" }}>📞 {cliente.telefone}</span>}
          {cliente.email && <span className="text-sm" style={{ color: "var(--text-muted)" }}>✉️ {cliente.email}</span>}
          {cliente.cpf && <span className="text-sm" style={{ color: "var(--text-muted)" }}>🪪 {cliente.cpf}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Veículos */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: "var(--text)" }}>Veículos ({veiculos?.length ?? 0})</h2>
          </div>
          {!veiculos?.length ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum veículo.</p> : (
            <div className="flex flex-col gap-2">
              {veiculos.map(v => (
                <div key={v.id} className="p-3 rounded-lg" style={{ background: "var(--bg)" }}>
                  <p className="font-bold text-sm" style={{ color: "var(--primary)" }}>{v.placa}</p>
                  <p className="text-sm" style={{ color: "var(--text)" }}>{v.marca} {v.modelo}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{v.cor} · {v.ano ?? "-"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="card">
          <h2 className="font-semibold mb-3" style={{ color: "var(--text)" }}>Resumo</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Total de OS</span><span style={{ color: "var(--text)" }}>{ordens?.length ?? 0}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Total gasto</span>
              <span style={{ color: "var(--primary)" }}>R$ {(ordens?.reduce((a, o) => a + (o.valor_final ?? 0), 0) ?? 0).toFixed(2).replace(".", ",")}</span>
            </div>
            {cliente.whatsapp && (
              <a href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`} target="_blank" className="btn btn-sm btn-secondary mt-2 w-fit">💬 WhatsApp</a>
            )}
          </div>
        </div>
      </div>

      {/* Histórico OS */}
      <div className="card p-0">
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Histórico de Ordens de Serviço</h2>
        </div>
        <div className="table-wrapper border-0 rounded-none">
          <table>
            <thead><tr><th>Nº</th><th>Veículo</th><th>Data</th><th>Valor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {!ordens?.length ? (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: "var(--text-muted)" }}>Sem histórico.</td></tr>
              ) : ordens.map((o: any) => (
                <tr key={o.id}>
                  <td style={{ color: "var(--primary)" }}>#{o.numero}</td>
                  <td style={{ color: "var(--text-muted)" }}>{(o.veiculos as any)?.placa} · {(o.veiculos as any)?.modelo}</td>
                  <td style={{ color: "var(--text-muted)" }}>{new Date(o.data_entrada + "T00:00").toLocaleDateString("pt-BR")}</td>
                  <td style={{ color: "var(--text)" }}>{o.valor_final ? `R$ ${o.valor_final.toFixed(2).replace(".", ",")}` : "-"}</td>
                  <td><span className={`badge badge-${o.status.replace("_","-")}`}>{STATUS_LABEL[o.status]}</span></td>
                  <td><Link href={`/ordens-de-servico/${o.id}`} className="btn btn-sm btn-ghost">Ver →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
