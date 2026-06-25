import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function ClientesFreqPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
  const { data: os } = await supabaseAdmin
    .from("ordens_servico")
    .select("valor_final, clientes(id, nome, telefone)")
    .eq("tenant_id", profile!.tenant_id)
    .in("status", ["finalizado","entregue"]);

  const mapa: Record<string, { nome: string; telefone: string; visitas: number; total: number }> = {};
  (os ?? []).forEach((o: any) => {
    if (!o.clientes) return;
    const id = o.clientes.id;
    if (!mapa[id]) mapa[id] = { nome: o.clientes.nome, telefone: o.clientes.telefone, visitas: 0, total: 0 };
    mapa[id].visitas++;
    mapa[id].total += o.valor_final ?? 0;
  });
  const lista = Object.values(mapa).sort((a, b) => b.visitas - a.visitas).slice(0, 20);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Clientes Frequentes</h1>
        <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>Top 20 clientes por número de visitas</p>
      </div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>#</th><th>Cliente</th><th>Telefone</th><th>Visitas</th><th>Total Gasto</th><th>Ticket Médio</th></tr></thead>
          <tbody>
            {!lista.length ? (
              <tr><td colSpan={6} className="text-center py-10" style={{ color:"var(--text-muted)" }}>Nenhum dado ainda.</td></tr>
            ) : lista.map((c, idx) => (
              <tr key={c.nome}>
                <td style={{ color:"var(--text-muted)" }}>#{idx+1}</td>
                <td className="font-medium" style={{ color:"var(--text)" }}>{c.nome}</td>
                <td style={{ color:"var(--text-muted)" }}>{c.telefone || "-"}</td>
                <td><span className="badge badge-aceito">{c.visitas}x</span></td>
                <td style={{ color:"var(--primary)" }}>{fmt(c.total)}</td>
                <td style={{ color:"var(--text-muted)" }}>{fmt(c.total / c.visitas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
