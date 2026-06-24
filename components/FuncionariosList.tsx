"use client";
import { useState } from "react";

export default function FuncionariosList({ funcionarios: ini, tenantId }: { funcionarios: any[]; tenantId: string }) {
  const [lista, setLista] = useState(ini);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", profissao: "", comissao_pct: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const res = await fetch("/api/funcionarios", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, comissao_pct: parseFloat(form.comissao_pct) || null }) });
    const json = await res.json();
    if (json.id) { setLista(p => [...p, json]); setShowForm(false); setForm({ nome:"",profissao:"",comissao_pct:"" }); }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Funcionários</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">+ Novo Funcionário</button>
      </div>
      {showForm && (
        <form onSubmit={save} className="card flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="field col-span-2"><label className="label">Nome *</label><input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} required /></div>
            <div className="field"><label className="label">Profissão</label><input className="input" value={form.profissao} onChange={e => set("profissao", e.target.value)} placeholder="Polidor, Esteta..." /></div>
            <div className="field"><label className="label">Comissão (%)</label><input className="input" type="number" step="0.1" value={form.comissao_pct} onChange={e => set("comissao_pct", e.target.value)} placeholder="10" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "..." : "Salvar"}</button>
          </div>
        </form>
      )}
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Nome</th><th>Profissão</th><th>Comissão</th><th>Status</th></tr></thead>
          <tbody>
            {!lista.length ? <tr><td colSpan={4} className="text-center py-10" style={{ color:"var(--text-muted)" }}>Nenhum funcionário.</td></tr>
              : lista.map(f => (
              <tr key={f.id}>
                <td className="font-medium" style={{ color:"var(--text)" }}>{f.nome}</td>
                <td style={{ color:"var(--text-muted)" }}>{f.profissao || "-"}</td>
                <td style={{ color:"var(--text-muted)" }}>{f.comissao_pct ? `${f.comissao_pct}%` : "-"}</td>
                <td><span className={`badge ${f.ativo ? "badge-finalizado" : "badge-recusado"}`}>{f.ativo ? "Ativo" : "Inativo"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
