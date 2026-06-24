"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    <div className="card">
      <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>Entrar</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Acesse sua conta do Studio RPM</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="field">
          <label className="label">E-mail</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
        </div>

        <div className="field">
          <label className="label">Senha</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showSenha ? "text" : "password"}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowSenha(!showSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            >
              {showSenha ? "🙈" : "👁"}
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
