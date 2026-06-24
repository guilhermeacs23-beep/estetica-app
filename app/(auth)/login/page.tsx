"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function EyeOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) { setErro("E-mail ou senha incorretos."); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} className="auth-form">
      <h1 className="auth-title">Bem-vindo</h1>
      <p className="auth-subtitle">Acesse sua conta do Studio RPM</p>

      <div className="auth-field">
        <label className="auth-label">E-MAIL</label>
        <input
          className="auth-input"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
        />
      </div>

      <div className="auth-field">
        <label className="auth-label">SENHA</label>
        <div className="auth-input-wrap">
          <input
            className="auth-input"
            type={showSenha ? "text" : "password"}
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            className="auth-eye"
            onClick={() => setShowSenha(!showSenha)}
            aria-label="Mostrar/ocultar senha"
          >
            {showSenha ? <EyeOpen /> : <EyeOff />}
          </button>
        </div>
      </div>

      {erro && <p className="auth-erro">{erro}</p>}

      <button type="submit" className="auth-btn" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p className="auth-link-text">
        Não tem conta?{" "}
        <Link href="/cadastro" className="auth-link">Cadastrar usuário</Link>
      </p>
    </form>
  );
}
