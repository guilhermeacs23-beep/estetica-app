"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [form, setForm] = useState({
    nomeResponsavel: "", email: "", senha: "", telefone: "", codigoAcesso: "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    if (form.senha.length < 6) { setErro("A senha deve ter ao menos 6 caracteres."); return; }
    setErro(""); setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setErro(data.error || "Erro ao criar conta."); setLoading(false); return; }
    router.push("/dashboard");
  }

  return (
    <div className="card">
      <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>Criar conta</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Cadastre sua estética no Studio RPM</p>

      <form onSubmit={handleCadastro} className="flex flex-col gap-4">
<div className="field">
          <label className="label">Seu Nome *</label>
          <input className="input" value={form.nomeResponsavel} onChange={e => set("nomeResponsavel", e.target.value)} placeholder="Nome completo" required />
        </div>
        <div className="field">
          <label className="label">Telefone / WhatsApp</label>
          <input className="input" value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(11) 99999-9999" />
        </div>
        <div className="field">
          <label className="label">E-mail *</label>
          <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="seu@email.com" required />
        </div>
        <div className="field">
          <label className="label">Senha *</label>
          <div className="relative">
            <input className="input pr-10" type={showSenha ? "text" : "password"} value={form.senha} onChange={e => set("senha", e.target.value)} placeholder="Mínimo 6 caracteres" required />
            <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
              {showSenha ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <div className="field">
          <label className="label">Código de acesso *</label>
          <input className="input" value={form.codigoAcesso} onChange={e => set("codigoAcesso", e.target.value)}
            placeholder="Informe o código fornecido pela Valora" required />
          <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>
            Solicite seu código em valora.com.br
          </p>
        </div>

        {erro && <p className="text-sm" style={{ color: "var(--danger)" }}>{erro}</p>}
        <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={loading}>
          {loading ? "Criando conta..." : "Criar conta grátis"}
        </button>
      </form>

      <div className="divider" />
      <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Já tem conta?{" "}
        <Link href="/login" style={{ color: "var(--primary)" }} className="font-medium hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
