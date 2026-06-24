"use client";
import { useState } from "react";

export default function ServicosList({ servicos: inicial, tenantId }: { servicos: any[]; tenantId: string }) {
  const [servicos, setServicos] = useState(inicial);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", preco_base: "", duracao_min: "", categoria: "", descricao: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/servicos", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, preco_base: parseFloat(form.preco_base), duracao_min: parseInt(form.duracao_min) || null }) });
    const json = await res.json();
    if (json.id) { setServicos(p => [...p, json]); setShowForm(false); setForm({ nome:"",preco_base:"",duracao_min:"",categoria:"",descricao:"" }); }
    setLoading(false);
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await fetch(`/api/servicos/${id}`, { method: "PATCH", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ ativo: !ativo }) });
    setServicos(p => p.map(s => s.id === id ? { ...s, ativo: !ativo } : s));
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Serviços</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>{servicos.length} serviços cadastrados</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">+ Novo Serviço</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card flex flex-col gap-4">
          <h2 className="font-semibold" style={{ color:"var(--text)" }}>Novo Serviço</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="field col-span-2"><label className="label">Nome *</label><input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} required /></div>
            <div className="field"><label className="label">Preço Base (R$) *</label><input className="input" type="number" step="0.01" value={form.preco_base} onChange={e => set("preco_base", e.target.value)} required /></div>
            <div className="field"><label className="label">Duração (min)</label><input className="input" type="number" value={form.duracao_min} onChange={e => set("duracao_min", e.target.value)} placeholder="60" /></div>
            <div className="field col-span-2"><label className="label">Categoria</label>
              <select className="input" value={form.categoria} onChange={e => set("categoria", e.target.value)}>
                <option value="">Geral</option>
                {["Lavagem","Polimento","Vitrificação","Higienização","Cristalização","Plotagem","Outros"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      )}

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Nome</th><th>Categoria</th><th>Preço</th><th>Duração</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {!servicos.length ? (
              <tr><td colSpan={6} className="text-center py-10" style={{ color:"var(--text-muted)" }}>Nenhum serviço cadastrado.</td></tr>
            ) : servicos.map(s => (
              <tr key={s.id}>
                <td className="font-medium" style={{ color:"var(--text)" }}>{s.nome}</td>
                <td style={{ color:"var(--text-muted)" }}>{s.categoria || "Geral"}</td>
                <td style={{ color:"var(--primary)" }}>R$ {s.preco_base.toFixed(2).replace(".", ",")}</td>
                <td style={{ color:"var(--text-muted)" }}>{s.duracao_min ? `${s.duracao_min}min` : "-"}</td>
                <td><span className={`badge ${s.ativo ? "badge-finalizado" : "badge-recusado"}`}>{s.ativo ? "Ativo" : "Inativo"}</span></td>
                <td><button onClick={() => toggleAtivo(s.id, s.ativo)} className="btn btn-sm btn-ghost">{s.ativo ? "Desativar" : "Ativar"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
