"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", whatsapp: "", email: "", cpf: "", obs: "" });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/clientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json();
    if (json.id) router.push(`/clientes/${json.id}`);
    else { alert(json.error ?? "Erro"); setLoading(false); }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/clientes" className="text-sm mb-2 block" style={{ color: "var(--text-muted)" }}>← Clientes</Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Novo Cliente</h1>
      </div>
      <form onSubmit={save} className="card flex flex-col gap-4">
        <div className="field"><label className="label">Nome *</label><input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} required /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="field"><label className="label">Telefone</label><input className="input" value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(11) 9..." /></div>
          <div className="field"><label className="label">WhatsApp</label><input className="input" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="(11) 9..." /></div>
        </div>
        <div className="field"><label className="label">E-mail</label><input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
        <div className="field"><label className="label">CPF</label><input className="input" value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
        <div className="field"><label className="label">Observações</label><textarea className="input min-h-20 resize-none" value={form.obs} onChange={e => set("obs", e.target.value)} /></div>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar Cliente"}</button>
      </form>
    </div>
  );
}
