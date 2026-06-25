import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function RelCaixaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();
  const hoje = new Date().toISOString().slice(0,10);
  const { data: os } = await supabaseAdmin
    .from("ordens_servico").select("valor_final, forma_pagamento, data_entrada")
    .eq("tenant_id", profile!.tenant_id)
    .eq("data_entrada", hoje)
    .in("status", ["finalizado","entregue"]);

  const total = (os ?? []).reduce((s: number, o: any) => s + (o.valor_final ?? 0), 0);
  const porForma = (os ?? []).reduce((acc: Record<string, number>, o: any) => {
    const k = o.forma_pagamento || "Não informado";
    acc[k] = (acc[k] || 0) + (o.valor_final ?? 0);
    return acc;
  }, {});
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Caixa · Entrada/Saída</h1>
        <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>Hoje · {new Date().toLocaleDateString("pt-BR")}</p>
      </div>
      <div className="kpi-card"><span className="kpi-label">Entrada do Dia</span><span className="kpi-value">{fmt(total)}</span></div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Forma de Pagamento</th><th>Total</th></tr></thead>
          <tbody>
            {!Object.keys(porForma).length ? (
              <tr><td colSpan={2} className="text-center py-10" style={{ color:"var(--text-muted)" }}>Nenhuma OS finalizada hoje.</td></tr>
            ) : Object.entries(porForma).map(([forma, val]) => (
              <tr key={forma}>
                <td style={{ color:"var(--text)" }}>{forma}</td>
                <td style={{ color:"var(--primary)" }}>{fmt(val as number)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
