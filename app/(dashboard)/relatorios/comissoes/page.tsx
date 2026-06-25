import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function ComissoesPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();

  const hoje = new Date();
  const mesParam = params.mes ?? `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}`;
  const [ano, mes] = mesParam.split("-").map(Number);
  const inicio = `${ano}-${String(mes).padStart(2,"0")}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split("T")[0];

  const { data: itens } = await supabaseAdmin
    .from("os_servicos")
    .select("id, nome, preco, funcionario_id, funcionarios(nome, profissao), ordens_servico!inner(data_entrada, status, numero)")
    .eq("ordens_servico.tenant_id", profile!.tenant_id)
    .in("ordens_servico.status", ["finalizado", "entregue"])
    .gte("ordens_servico.data_entrada", inicio)
    .lte("ordens_servico.data_entrada", fim);

  const { data: funcs } = await supabaseAdmin
    .from("funcionarios")
    .select("id, nome, profissao, comissao_pct")
    .eq("tenant_id", profile!.tenant_id)
    .eq("ativo", true)
    .order("nome");

  // Agrupar por funcionário
  const porFunc: Record<string, { nome: string; profissao: string; comissao_pct: number; servicos: any[]; total: number }> = {};
  for (const f of funcs ?? []) {
    porFunc[f.id] = { nome: f.nome, profissao: f.profissao, comissao_pct: f.comissao_pct ?? 0, servicos: [], total: 0 };
  }
  for (const item of itens ?? []) {
    if (item.funcionario_id && porFunc[item.funcionario_id]) {
      porFunc[item.funcionario_id].servicos.push(item);
      porFunc[item.funcionario_id].total += item.preco ?? 0;
    }
  }

  const mesBR = new Date(ano, mes - 1, 15).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const prevMes = new Date(ano, mes - 2, 1);
  const nextMes = new Date(ano, mes, 1);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 900 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/relatorios" className="text-sm mb-1 block" style={{ color: "var(--text-muted)" }}>Relatorios</Link>
          <h1 className="text-2xl font-bold capitalize" style={{ color: "var(--text)" }}>Comissoes — {mesBR}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/relatorios/comissoes?mes=${fmt(prevMes)}`} className="btn btn-secondary btn-sm">←</Link>
          <Link href={`/relatorios/comissoes?mes=${fmt(hoje)}`} className="btn btn-secondary btn-sm">Mes Atual</Link>
          <Link href={`/relatorios/comissoes?mes=${fmt(nextMes)}`} className="btn btn-secondary btn-sm">→</Link>
        </div>
      </div>

      {Object.keys(porFunc).length === 0 ? (
        <div className="card p-10 text-center" style={{ color: "var(--text-muted)" }}>
          Nenhum funcionario ativo. Cadastre funcionarios em Funcionarios.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(porFunc).map(([id, f]) => {
            const comissao = f.total * (f.comissao_pct / 100);
            return (
              <div key={id} className="card">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <p className="font-bold text-lg" style={{ color: "var(--text)" }}>{f.nome}</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{f.profissao} · {f.comissao_pct}% comissao</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total em servicos</p>
                    <p className="font-bold text-xl" style={{ color: "var(--text)" }}>R$ {f.total.toFixed(2).replace(".",",")}</p>
                    <p className="text-sm font-semibold mt-1" style={{ color: "var(--primary)" }}>
                      Comissao: R$ {comissao.toFixed(2).replace(".",",")}
                    </p>
                  </div>
                </div>
                {f.servicos.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sem servicos neste mes</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>SERVICO</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>OS</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>VALOR</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>COMISSAO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.servicos.map((s: any, i: number) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "7px 8px", color: "var(--text)" }}>{s.nome}</td>
                          <td style={{ padding: "7px 8px", color: "var(--text-muted)" }}>OS #{s.ordens_servico?.numero}</td>
                          <td style={{ padding: "7px 8px", textAlign: "right" }}>R$ {(s.preco ?? 0).toFixed(2).replace(".",",")}</td>
                          <td style={{ padding: "7px 8px", textAlign: "right", color: "var(--primary)", fontWeight: 500 }}>
                            R$ {((s.preco ?? 0) * (f.comissao_pct / 100)).toFixed(2).replace(".",",")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          {/* Totalizador */}
          <div className="card" style={{ borderTop: "2px solid var(--primary)" }}>
            <h3 className="font-semibold mb-3" style={{ color: "var(--text)" }}>Resumo do Mes</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(porFunc).map(([id, f]) => {
                const comissao = f.total * (f.comissao_pct / 100);
                return (
                  <div key={id} className="text-center p-3 rounded-lg" style={{ background: "var(--bg)" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{f.nome}</p>
                    <p className="text-lg font-bold mt-1" style={{ color: "var(--primary)" }}>R$ {comissao.toFixed(2).replace(".",",")}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
