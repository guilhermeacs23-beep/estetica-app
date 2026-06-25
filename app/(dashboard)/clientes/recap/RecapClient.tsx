"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

type Cliente = { id: string; nome: string; telefone?: string; whatsapp?: string; cidade?: string; };
type Ordem = { id: string; cliente_id: string; data_entrada: string; status: string; valor_final?: number; os_servicos?: { nome: string }[]; };

type ClienteRecap = {
  cliente: Cliente;
  totalVisitas: number;
  ultimaVisita: string | null;
  diasSemVisita: number;
  ticketMedio: number;
  servicos: string[];
  status: "critico" | "atencao" | "ok" | "novo";
};

function calcDias(dateStr: string): number {
  const hoje = new Date();
  const d = new Date(dateStr + "T12:00");
  return Math.floor((hoje.getTime() - d.getTime()) / 86400000);
}

export default function RecapClient({ clientes, ordens, webhookN8n, nomeLoja }: {
  clientes: Cliente[]; ordens: Ordem[]; webhookN8n: string; nomeLoja: string;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "critico" | "atencao" | "novo">("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [msgTemplate, setMsgTemplate] = useState(
    `Ola {nome}! Faz um tempo que nao te vemos aqui no ${nomeLoja}. Que tal agendar uma revisao para seu carro? Te esperamos! 🚗✨`
  );
  const [showConfig, setShowConfig] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(webhookN8n);

  const recap: ClienteRecap[] = useMemo(() => {
    return clientes.map(c => {
      const cosOrdens = ordens.filter(o => o.cliente_id === c.id);
      const ultimaVisita = cosOrdens[0]?.data_entrada ?? null;
      const diasSemVisita = ultimaVisita ? calcDias(ultimaVisita) : 9999;
      const totalVisitas = cosOrdens.length;
      const totalGasto = cosOrdens.reduce((s, o) => s + (o.valor_final ?? 0), 0);
      const ticketMedio = totalVisitas > 0 ? totalGasto / totalVisitas : 0;
      const servicos = [...new Set(cosOrdens.flatMap(o => (o.os_servicos ?? []).map(s => s.nome)))].slice(0, 3);
      let status: ClienteRecap["status"] = "novo";
      if (totalVisitas > 0) {
        if (diasSemVisita >= 60) status = "critico";
        else if (diasSemVisita >= 30) status = "atencao";
        else status = "ok";
      }
      return { cliente: c, totalVisitas, ultimaVisita, diasSemVisita, ticketMedio, servicos, status };
    });
  }, [clientes, ordens]);

  const filtrado = useMemo(() => {
    let r = recap;
    if (filtro !== "todos") r = r.filter(x => x.status === filtro);
    if (busca) r = r.filter(x => x.cliente.nome.toLowerCase().includes(busca.toLowerCase()) || (x.cliente.whatsapp ?? "").includes(busca));
    return r.sort((a, b) => b.diasSemVisita - a.diasSemVisita);
  }, [recap, filtro, busca]);

  const criticos = recap.filter(x => x.status === "critico").length;
  const atencao = recap.filter(x => x.status === "atencao").length;
  const novos = recap.filter(x => x.status === "novo").length;

  function toggleSel(id: string) {
    setSelecionados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selecionarFiltro() {
    setSelecionados(new Set(filtrado.map(x => x.cliente.id)));
  }

  function montarMensagem(nome: string) {
    return msgTemplate.replace("{nome}", nome.split(" ")[0]);
  }

  function abrirWhatsApp(c: Cliente) {
    const tel = (c.whatsapp || c.telefone || "").replace(/\D/g, "");
    if (!tel) return alert("Cliente sem WhatsApp cadastrado");
    const msg = encodeURIComponent(montarMensagem(c.nome));
    window.open(`https://wa.me/55${tel}?text=${msg}`, "_blank");
  }

  async function dispararN8n(clienteIds: string[]) {
    if (!webhookUrl) { setShowConfig(true); return; }
    setEnviando(true);
    const selecionadosRecap = recap.filter(x => clienteIds.includes(x.cliente.id));
    for (const r of selecionadosRecap) {
      const tel = (r.cliente.whatsapp || r.cliente.telefone || "").replace(/\D/g, "");
      if (!tel) continue;
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: r.cliente.nome,
            telefone: tel,
            mensagem: montarMensagem(r.cliente.nome),
            dias_sem_visita: r.diasSemVisita,
            ultima_visita: r.ultimaVisita,
          }),
        });
        setEnviados(prev => new Set([...prev, r.cliente.id]));
      } catch (e) { console.error(e); }
    }
    setEnviando(false);
    setSelecionados(new Set());
    alert(`${selecionadosRecap.length} mensagem(ns) disparada(s) para o n8n!`);
  }

  const corStatus: Record<string, string> = {
    critico: "var(--danger)", atencao: "#f97316", ok: "var(--success)", novo: "var(--text-muted)"
  };
  const labelStatus: Record<string, string> = {
    critico: "Critico (+60d)", atencao: "Atencao (+30d)", ok: "Ativo", novo: "Novo"
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Recap de Clientes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Clientes que precisam de contato para voltar
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowConfig(!showConfig)}>
            {webhookUrl ? "n8n Conectado ✓" : "Configurar n8n"}
          </button>
          {selecionados.size > 0 && (
            <button className="btn btn-primary" disabled={enviando}
              onClick={() => dispararN8n([...selecionados])}>
              {enviando ? "Enviando..." : `Disparar n8n (${selecionados.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Config n8n */}
      {showConfig && (
        <div className="card flex flex-col gap-3" style={{ borderLeft: "3px solid var(--primary)" }}>
          <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Configurar Webhook n8n</h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Cole a URL do webhook do seu fluxo n8n. Cada contato selecionado enviara um POST com: nome, telefone, mensagem, dias_sem_visita, ultima_visita.
          </p>
          <div className="flex gap-3">
            <input className="input flex-1" value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://n8n.seudominio.com/webhook/xxxxx" />
            <button className="btn btn-primary btn-sm" onClick={async () => {
              await fetch("/api/configuracoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhook_n8n: webhookUrl }) });
              setShowConfig(false);
            }}>Salvar</button>
          </div>
          <div className="field">
            <label className="label text-xs">Mensagem Template</label>
            <textarea className="input" rows={3} value={msgTemplate} onChange={e => setMsgTemplate(e.target.value)} />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Use {"{nome}"} para o primeiro nome do cliente</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Clientes", value: clientes.length, color: "var(--text)" },
          { label: "Criticos +60d", value: criticos, color: "var(--danger)" },
          { label: "Atencao +30d", value: atencao, color: "#f97316" },
          { label: "Sem historico", value: novos, color: "var(--text-muted)" },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <p className="kpi-label">{k.label}</p>
            <p className="kpi-value" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <input className="input" style={{ maxWidth: 260 }} placeholder="Buscar cliente ou numero..."
          value={busca} onChange={e => setBusca(e.target.value)} />
        {(["todos","critico","atencao","novo"] as const).map(f => (
          <button key={f} className={`btn btn-sm ${filtro === f ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltro(f)}>
            {f === "todos" ? "Todos" : f === "critico" ? `Criticos (${criticos})` : f === "atencao" ? `Atencao (${atencao})` : `Sem historico (${novos})`}
          </button>
        ))}
        {filtrado.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={selecionarFiltro}>
            Selecionar todos ({filtrado.length})
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-2">
        {filtrado.length === 0 ? (
          <div className="card p-10 text-center" style={{ color: "var(--text-muted)" }}>
            Nenhum cliente encontrado com esse filtro
          </div>
        ) : filtrado.map(x => {
          const sel = selecionados.has(x.cliente.id);
          const sent = enviados.has(x.cliente.id);
          const cor = corStatus[x.status];
          return (
            <div key={x.cliente.id}
              className="card flex items-center gap-4 flex-wrap"
              style={{ borderLeft: `4px solid ${cor}`, padding: "14px 18px", opacity: sent ? 0.6 : 1 }}>
              <input type="checkbox" checked={sel} onChange={() => toggleSel(x.cliente.id)}
                style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/clientes/${x.cliente.id}`}
                    className="font-semibold text-sm hover:underline" style={{ color: "var(--text)" }}>
                    {x.cliente.nome}
                  </Link>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: cor + "22", color: cor }}>
                    {labelStatus[x.status]}
                  </span>
                  {sent && <span style={{ fontSize: 10, color: "var(--success)" }}>Enviado ✓</span>}
                </div>
                <div className="flex gap-4 mt-1 flex-wrap">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {x.ultimaVisita
                      ? `Ultima visita: ${new Date(x.ultimaVisita + "T12:00").toLocaleDateString("pt-BR")} (${x.diasSemVisita}d atras)`
                      : "Nunca veio"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {x.totalVisitas} {x.totalVisitas === 1 ? "visita" : "visitas"}
                  </span>
                  {x.ticketMedio > 0 && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Ticket medio: R$ {x.ticketMedio.toFixed(2).replace(".",",")}
                    </span>
                  )}
                  {x.servicos.length > 0 && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Servicos: {x.servicos.join(", ")}
                    </span>
                  )}
                </div>
              </div>
              {/* Acoes */}
              <div className="flex gap-2 flex-shrink-0">
                <button className="btn btn-sm btn-secondary" onClick={() => abrirWhatsApp(x.cliente)}
                  title="Abrir WhatsApp">
                  💬 WhatsApp
                </button>
                {webhookUrl && (
                  <button className="btn btn-sm btn-primary" disabled={enviando || sent}
                    onClick={() => dispararN8n([x.cliente.id])}
                    title="Disparar via n8n">
                    {sent ? "Enviado" : "n8n"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
