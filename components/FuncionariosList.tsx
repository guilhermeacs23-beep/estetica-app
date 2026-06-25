"use client";
import { useState } from "react";

export default function FuncionariosList({ funcionarios: ini }: { funcionarios: any[]; tenantId: string }) {
  const [lista, setLista] = useState(ini);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", profissao: "", comissao_pct: "",
    codigo_matricula: "", comissao_percentual: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const res = await fetch("/api/funcionarios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.nome, profissao: form.profissao,
        comissao_pct: parseFloat(form.comissao_pct) || null,
        codigo_matricula: form.codigo_matricula || null,
        comissao_percentual: parseFloat(form.comissao_percentual) || 0,
      }),
    });
    const json = await res.json();
    if (json.id) {
      setLista(p => [...p, json]);
      setShowForm(false);
      setForm({ nome:"",profissao:"",comissao_pct:"",codigo_matricula:"",comissao_percentual:"" });
    }
    setLoading(false);
  }

  async function patch(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/funcionarios/${id}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data),
    });
    const json = await res.json();
    setLista(p => p.map(x => x.id === id ? { ...x, ...json } : x));
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Funcionários</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>
            Código de matrícula + comissão por venda de serviço
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">+ Novo Funcionário</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card flex flex-col gap-4">
          <h2 className="font-semibold" style={{ color:"var(--text)" }}>Novo Funcionário</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="field col-span-2">
              <label className="label">Nome completo *</label>
              <input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Profissão / Função</label>
              <input className="input" value={form.profissao} onChange={e => set("profissao", e.target.value)} placeholder="Polidor, Lavador, Atendente..." />
            </div>
            <div className="field">
              <label className="label">🏷️ Código / Matrícula</label>
              <input className="input" value={form.codigo_matricula} onChange={e => set("codigo_matricula", e.target.value)}
                placeholder="Ex: 001, A12, JOAO01" />
            </div>
          </div>

          {/* Comissão */}
          <div className="card" style={{ background:"var(--bg)", border:"1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--text)" }}>💰 Configuração de Comissão</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label className="label">Comissão padrão (%)</label>
                <input className="input" type="number" step="0.5" min="0" max="100"
                  value={form.comissao_percentual} onChange={e => set("comissao_percentual", e.target.value)}
                  placeholder="Ex: 10" />
              </div>
              <div className="field">
                <label className="label">Comissão por OS (%)</label>
                <input className="input" type="number" step="0.5" min="0" max="100"
                  value={form.comissao_pct} onChange={e => set("comissao_pct", e.target.value)}
                  placeholder="Ex: 5 (override por OS)" />
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color:"var(--text-subtle)" }}>
              O funcionário informa o código ao atender — o sistema calcula a comissão automaticamente sobre o valor da OS.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading?"Salvando...":"Salvar"}</button>
          </div>
        </form>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Nome</th><th>Função</th><th>Matrícula</th><th>Comissão</th><th>OSs Vendidas</th><th>Status</th></tr>
          </thead>
          <tbody>
            {!lista.length
              ? <tr><td colSpan={6} className="text-center py-10" style={{ color:"var(--text-muted)" }}>Nenhum funcionário cadastrado.</td></tr>
              : lista.map(f => (
                <tr key={f.id}>
                  <td className="font-medium" style={{ color:"var(--text)" }}>{f.nome}</td>
                  <td style={{ color:"var(--text-muted)" }}>{f.profissao || "-"}</td>
                  <td>
                    {f.codigo_matricula
                      ? <span className="badge badge-aceito font-mono">{f.codigo_matricula}</span>
                      : <span style={{ color:"var(--text-subtle)" }}>-</span>}
                  </td>
                  <td>
                    <span style={{ color: f.comissao_percentual > 0 ? "var(--success)" : "var(--text-muted)" }}>
                      {f.comissao_percentual > 0 ? `${f.comissao_percentual}%` : "-"}
                    </span>
                  </td>
                  <td style={{ color:"var(--text-muted)" }}>{f.os_count ?? "-"}</td>
                  <td>
                    <button onClick={() => patch(f.id, { ativo: !f.ativo })}
                      className={`badge ${f.ativo ? "badge-finalizado" : "badge-recusado"}`}
                      style={{ cursor:"pointer", border:"none" }}>
                      {f.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
