"use client";
import { useState } from "react";

const CATEGORIAS = ["Lavagem","Polimento","Vitrificação","Higienização","Cristalização","Plotagem","Outros"];

const EMPTY = {
  nome: "", descricao: "", categoria: "", preco_base: "",
  markup: "", custo_produtos: "", custo_outros: "",
  duracao_min: "", tempo_retorno_dias: "", link_instagram: "", ativo: true,
};

function fmtBRL(v: any) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildWaMsg(s: any) {
  const preco = fmtBRL(s.preco_base);
  const duracao = s.duracao_min ? `⏱ Duração: ${s.duracao_min} min\n` : "";
  const retorno = s.tempo_retorno_dias ? `🔄 Recomendado a cada: ${s.tempo_retorno_dias} dias\n` : "";
  const desc = s.descricao ? `\n${s.descricao}\n` : "";
  const insta = s.link_instagram ? `\n📸 Veja no Instagram:\n${s.link_instagram}\n` : "";
  return (
    `🚗 *${s.nome}*${desc}\n💰 Valor: ${preco}\n${duracao}${retorno}${insta}\nAgende seu horário conosco! ✨`
  ).trim();
}

export default function ServicosList({ servicos: inicial }: { servicos: any[]; tenantId: string }) {
  const [servicos, setServicos] = useState(inicial);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null); // null = closed, {} = novo, {...} = editar
  const [form, setForm] = useState<any>(EMPTY);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function openNovo() { setForm(EMPTY); setSelected({}); }
  function openEditar(s: any) {
    setForm({
      nome: s.nome ?? "",
      descricao: s.descricao ?? "",
      categoria: s.categoria ?? "",
      preco_base: s.preco_base ?? "",
      markup: s.markup ?? "",
      custo_produtos: s.custo_produtos ?? "",
      custo_outros: s.custo_outros ?? "",
      duracao_min: s.duracao_min ?? "",
      tempo_retorno_dias: s.tempo_retorno_dias ?? "",
      link_instagram: s.link_instagram ?? "",
      ativo: s.ativo ?? true,
    });
    setSelected(s);
  }
  function closeModal() { setSelected(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      preco_base: parseFloat(form.preco_base) || 0,
      markup: parseFloat(form.markup) || null,
      custo_produtos: parseFloat(form.custo_produtos) || null,
      custo_outros: parseFloat(form.custo_outros) || null,
      duracao_min: parseInt(form.duracao_min) || null,
      tempo_retorno_dias: parseInt(form.tempo_retorno_dias) || null,
    };
    const isNew = !selected?.id;
    if (isNew) {
      const res = await fetch("/api/servicos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.id) setServicos(p => [...p, json]);
    } else {
      await fetch(`/api/servicos/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setServicos(p => p.map(s => s.id === selected.id ? { ...s, ...payload } : s));
    }
    setLoading(false);
    closeModal();
  }

  async function toggleAtivo(id: string, ativo: boolean, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/servicos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !ativo }) });
    setServicos(p => p.map(s => s.id === id ? { ...s, ativo: !ativo } : s));
  }

  function openWa(s: any, e: React.MouseEvent) {
    e.stopPropagation();
    const msg = encodeURIComponent(buildWaMsg(s));
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const custo = (parseFloat(form.custo_produtos) || 0) + (parseFloat(form.custo_outros) || 0);
  const sugerido = custo > 0 && form.markup ? custo * (1 + parseFloat(form.markup) / 100) : null;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Serviços</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{servicos.length} serviços · com formação de preço</p>
        </div>
        <button onClick={openNovo} className="btn btn-primary">+ Novo Serviço</button>
      </div>

      {/* TABELA */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Custo Total</th>
              <th>Markup</th>
              <th>Preço Sugerido</th>
              <th>Preço Final</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!servicos.length ? (
              <tr><td colSpan={8} className="text-center py-10" style={{ color: "var(--text-muted)" }}>Nenhum serviço cadastrado.</td></tr>
            ) : servicos.map(s => {
              const custoTotal = (s.custo_produtos || 0) + (s.custo_outros || 0);
              const precoSugerido = custoTotal && s.markup ? custoTotal * (1 + s.markup / 100) : null;
              const retorno = s.tempo_retorno_dias ? `${s.tempo_retorno_dias}d` : "-";
              return (
                <tr key={s.id} onClick={() => openEditar(s)} style={{ cursor: "pointer" }}
                  className="hover:bg-opacity-50 transition-colors">
                  <td className="font-medium" style={{ color: "var(--text)" }}>{s.nome}</td>
                  <td style={{ color: "var(--text-muted)" }}>{s.categoria || "Geral"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{custoTotal > 0 ? fmtBRL(custoTotal) : "-"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{s.markup ? `${s.markup}%` : "-"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{precoSugerido ? fmtBRL(precoSugerido) : "-"}</td>
                  <td style={{ color: "var(--primary)", fontWeight: 600 }}>{fmtBRL(s.preco_base)}</td>
                  <td style={{ color: "var(--text-muted)" }}>{retorno}</td>
                  <td>
                    <span className={`badge ${s.ativo ? "badge-finalizado" : "badge-recusado"}`}>{s.ativo ? "Ativo" : "Inativo"}</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button onClick={e => openWa(s, e)} className="btn btn-sm btn-ghost" title="Enviar no WhatsApp">💬</button>
                      <button onClick={e => { e.stopPropagation(); openEditar(s); }} className="btn btn-sm btn-ghost">Editar</button>
                      <button onClick={e => toggleAtivo(s.id, s.ativo, e)} className="btn btn-sm btn-ghost">{s.ativo ? "Desativar" : "Ativar"}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {selected !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={closeModal}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>{selected?.id ? "Editar Serviço" : "Novo Serviço"}</h2>
              <button onClick={closeModal} className="btn btn-icon btn-ghost text-xl">×</button>
            </div>
            <form onSubmit={save} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Nome */}
                <div className="field col-span-2">
                  <label className="label">Nome *</label>
                  <input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} required />
                </div>
                {/* Descrição */}
                <div className="field col-span-2">
                  <label className="label">💬 Descrição do Serviço</label>
                  <textarea className="input" rows={3} value={form.descricao} onChange={e => set("descricao", e.target.value)}
                    placeholder="Descreva o serviço para uso em catálogos, WhatsApp e orçamentos..." />
                </div>
                {/* Categoria */}
                <div className="field col-span-2">
                  <label className="label">Categoria</label>
                  <select className="input" value={form.categoria} onChange={e => set("categoria", e.target.value)}>
                    <option value="">Geral</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Linha separadora */}
                <div className="col-span-2 pt-1 pb-1" style={{ borderTop: "1px solid var(--border)" }} />
                <p className="col-span-2 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Formação de Preço</p>

                <div className="field">
                  <label className="label">Custo Produtos (R$)</label>
                  <input className="input" type="number" step="0.01" value={form.custo_produtos} onChange={e => set("custo_produtos", e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Custo Outros (R$)</label>
                  <input className="input" type="number" step="0.01" value={form.custo_outros} onChange={e => set("custo_outros", e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Markup (%)</label>
                  <input className="input" type="number" step="0.1" value={form.markup} onChange={e => set("markup", e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Preço Sugerido</label>
                  <input className="input" readOnly value={sugerido ? fmtBRL(sugerido) : "—"} style={{ color: "var(--text-muted)", background: "var(--bg)" }} />
                </div>
                <div className="field">
                  <label className="label">Preço Final (R$) *</label>
                  <input className="input" type="number" step="0.01" value={form.preco_base} onChange={e => set("preco_base", e.target.value)} required />
                </div>

                <div className="col-span-2 pt-1 pb-1" style={{ borderTop: "1px solid var(--border)" }} />
                <p className="col-span-2 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Tempo & Agendamento</p>

                <div className="field">
                  <label className="label">Duração (min)</label>
                  <input className="input" type="number" value={form.duracao_min} onChange={e => set("duracao_min", e.target.value)} placeholder="60" />
                </div>
                <div className="field">
                  <label className="label">Retorno em dias</label>
                  <input className="input" type="number" value={form.tempo_retorno_dias} onChange={e => set("tempo_retorno_dias", e.target.value)} placeholder="ex: 30" />
                </div>

                <div className="col-span-2 pt-1 pb-1" style={{ borderTop: "1px solid var(--border)" }} />
                <p className="col-span-2 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Link Instagram</p>

                <div className="field col-span-2">
                  <label className="label">📸 Link do post/reel no Instagram</label>
                  <input className="input" type="url" value={form.link_instagram} onChange={e => set("link_instagram", e.target.value)}
                    placeholder="https://www.instagram.com/p/..." />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Será enviado junto com a mensagem no WhatsApp para o cliente ver o serviço.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={e => set("ativo", e.target.checked)} />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>Serviço ativo</span>
                </label>
                <div className="flex-1" />
                <button type="button" onClick={closeModal} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
