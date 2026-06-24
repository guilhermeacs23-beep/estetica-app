"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function EyeIcon({ open }: { open: boolean }) {
  if (open) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
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
    if (error) {
      setErro("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="card w-full">
      <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>Entrar</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Acesse sua conta do Studio RPM</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="field">
          <label className="label">E-mail</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
          />
        </div>

        <div className="field">
          <label className="label">Senha</label>
          <div className="relative">
            <input
              className="input"
              style={{ paddingRight: "2.75rem" }}
              type={showSenha ? "text" : "password"}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowSenha(!showSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{ color: "var(--text-muted)" }}
              aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              <EyeIcon open={showSenha} />
            </button>
          </div>
        </div>

        {erro && <p className="text-sm" style={{ color: "var(--danger)" }}>{erro}</p>}

        <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="divider" />
      <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Não tem conta?{" "}
        <Link href="/cadastro" style={{ color: "var(--primary)" }} className="font-medium hover:underline">
          Cadastrar estética
        </Link>
      </p>
    </div>
  );
}
