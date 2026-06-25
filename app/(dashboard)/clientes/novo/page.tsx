"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const estadosBR = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", telefone: "", whatsapp: "", email: "", cpf: "", obs: "",
    endereco: "", cidade: "", estado: "", cep: ""
  });
  const [veiculo, setVeiculo] = useState({ placa: "", modelo: "", marca: "", ano: "", cor: "" });
  const [addVeiculo, setAddVeiculo] = useState(true);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setV = (k: string, v: string) => setVeiculo(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Save cliente
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!json.id) { alert(json.error ?? "Erro ao salvar cliente"); setLoading(false); return; }

    // Save veiculo if filled
    if (addVeiculo && veiculo.placa) {
      const vres = await fetch("/api/veiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...veiculo, cliente_id: json.id, ano: veiculo.ano ? parseInt(veiculo.ano) : null }),
      });
      const vj = await vres.json();
      if (vj.error) console.warn("Veiculo nao salvo:", vj.error);
    }

    router.push(`/clientes/${json.id}`);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="mb-6">
        <Link href="/clientes" className="text-sm mb-2 block" style={{ color: "var(--text-muted)" }}>
          Clientes
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Novo Cliente</h1>
      </div>

      <form onSubmit={save} className="flex flex-col gap-5">
        {/* Dados pessoais */}
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Dados do Cliente</h2>
          <div className="field">
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} required 