import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function RecapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", user!.id).single();

  // Clientes com retorno vencido
  const { data: recap } = await supabaseAdmin
    .from("vw_clientes_recap")
    .select("*")
    .eq("tenant_id", profile!.tenant_id)
    .order("dias_atrasado", { ascending: false });

  // Clientes sem visita nos últimos 60 dias (inativos gerais)
  const { data: inativos } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, telefone, created_at")
    .eq("tenant_id", profile!.tenant_id)
    .eq("ativo", true)
    .not("id", "in",
      `(SELECT DISTINCT cliente_id FROM ordens_servico WHERE tenant_id = '${profile!.tenant_id}' AND data_entrada >= '${new Date(Date.now() - 60*24*60*60*1000).toISOString().slice(0,10)}')`
    )
    .order("created_at", { ascending: true })
    .limit(50);

  function classeDias(d: number) {
    if (d >= 30) return "badge-recusado";
    if (d >= 15) return "badge-aguardando";
    return "badge-aceito";
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>📞 Recap de Clientes</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>
            Clientes com retorno vencido — acione antes que sumam de vez
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/recap/webhook-preview"
            className="btn btn-secondary btn-sm"
            title="Prévia da lista para integração N8N"
          >📤 Exportar para N8N</a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="kpi-card">
          <span className="kpi-label">Retorno Vencido</span>
          <span className="kpi-value" style={{ color:"var(--danger)" }}>{recap?.length ?? 0}</span>
          <span className="kpi-sub">com periodicidade definida</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Inativos (+60 dias)</span>
          <span className="kpi-value" style={{ color:"var(--warning)" }}>{inativos?.length ?? 0}</span>
          <span className="kpi-sub">sem visita recente</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total em Risco</span>
          <span className="kpi-value">{(recap?.length ?? 0) + (inativos?.length ?? 0)}</span>
          <span className="kpi-sub">clientes para acionar</span>
        </div>
      </div>

      {/* Retorno vencido por serviço */}
      {(recap?.length ?? 0) > 0 && (
        <div className="card p-0">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:"var(--border)" }}>
            <h2 className="font-semibold" style={{ color:"var(--text)" }}>🔴 Retorno Vencido por Serviço</h2>
            <span className="badge badge-recusado">{recap!.length} clientes</span>
          </div>
          <div className="table-wrapper border-0 rounded-none">
            <table>
              <thead><tr><th>Cliente</th><th>Telefone</th><th>Última Visita</th><th>Retorno Previsto</th><th>Atraso</th><th></th></tr></thead>
              <tbody>
                {recap!.map((c: any) => (
                  <tr key={c.cliente_id}>
                    <td className="font-medium" style={{ color:"var(--text)" }}>{c.cliente_nome}</td>
                    <td style={{ color:"var(--text-muted)" }}>
                      {c.telefone
                        ? <a href={`https://wa.me/55${c.telefone.replace(/\D/g,"")}?text=Olá ${c.cliente_nome}! 👋 Faz um tempo que não te vemos por aqui no Studio RPM. Que tal agendar um serviço?`}
                            target="_blank" className="flex items-center gap-1" style={{ color:"var(--success)" }}>
                            📱 {c.telefone}
                          </a>
                        : "-"}
                    </td>
                    <td style={{ color:"var(--text-muted)" }}>{new Date(c.ultima_visita).toLocaleDateString("pt-BR")}</td>
                    <td style={{ color:"var(--text-muted)" }}>{new Date(c.data_retorno_prevista).toLocaleDateString("pt-BR")}</td>
                    <td><span className={`badge ${classeDias(c.dias_atrasado)}`}>{c.dias_atrasado} dias</span></td>
                    <td>
                      <Link href={`/clientes/${c.cliente_id}`} className="btn btn-sm btn-ghost">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inativos gerais */}
      <div className="card p-0">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:"var(--border)" }}>
          <h2 className="font-semibold" style={{ color:"var(--text)" }}>⚠️ Inativos há mais de 60 dias</h2>
          <span className="badge badge-aguardando">{inativos?.length ?? 0} clientes</span>
        </div>
        {!inativos?.length ? (
          <p className="p-6 text-center" style={{ color:"var(--text-muted)" }}>Todos os clientes visitaram recentemente. 🎉</p>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table>
              <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Cadastrado em</th><th></th></tr></thead>
              <tbody>
                {inativos.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-medium" style={{ color:"var(--text)" }}>{c.nome}</td>
                    <td>
                      {c.telefone
                        ? <a href={`https://wa.me/55${c.telefone.replace(/\D/g,"")}?text=Olá ${c.nome}! Sentimos sua falta no Studio RPM 🚗✨ Que tal agendar e ganhar um desconto especial?`}
                            target="_blank" className="btn btn-sm btn-ghost" style={{ color:"var(--success)" }}>
                            💬 WhatsApp
                          </a>
                        : "-"}
                    </td>
                    <td style={{ color:"var(--text-muted)" }}>{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                    <td><Link href={`/clientes/${c.id}`} className="btn btn-sm btn-ghost">Ver</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info N8N */}
      <div className="card" style={{ borderColor:"rgba(196,30,58,0.3)", background:"rgba(196,30,58,0.05)" }}>
        <h3 className="font-semibold mb-2" style={{ color:"var(--text)" }}>🤖 Integração com N8N / Chatbot</h3>
        <p className="text-sm mb-3" style={{ color:"var(--text-muted)" }}>
          Seu chatbot N8N pode buscar a lista de clientes para recap automaticamente e disparar mensagens no WhatsApp.
        </p>
        <div className="flex flex-col gap-2">
          <div className="field">
            <label className="label">Endpoint para o N8N (GET)</label>
            <code className="input text-xs font-mono" style={{ background:"var(--bg)" }}>
              GET /api/recap/clientes?token=SEU_TOKEN_AQUI
            </code>
          </div>
          <p className="text-xs" style={{ color:"var(--text-subtle)" }}>
            Retorna JSON com todos os clientes vencidos. Configure no N8N para rodar todo dia às 9h e disparar o chatbot automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
