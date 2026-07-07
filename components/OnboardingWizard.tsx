"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CORES = [
  "#c0392b","#e74c3c","#e67e22","#f39c12","#27ae60","#16a085",
  "#2980b9","#8e44ad","#2c3e50","#1abc9c","#d35400","#c0392b",
  "#e91e63","#9c27b0","#673ab7","#3f51b5","#2196f3","#03a9f4",
  "#00bcd4","#009688","#4caf50","#8bc34a","#cddc39","#ffeb3b",
  "#ffc107","#ff9800","#ff5722","#795548","#607d8b","#000000",
];

const PASSOS = [
  {
    titulo: "Bem-vindo ao Studio RPM!",
    sub: "Vamos configurar rapidinho para o sistema ficar com a cara da sua estética.",
    tipo: "intro",
  },
  {
    titulo: "Escolha a cor da sua marca",
    sub: "Ela vai aparecer em toda a interface e nos seus orçamentos.",
    tipo: "cor",
  },
  {
    titulo: "Tudo pronto!",
    sub: "Sua estética está configurada. Comece cadastrando seus serviços e clientes.",
    tipo: "fim",
  },
];

const CHECKLIST = [
  { label: "Cadastrar um serviço", href: "/servicos" },
  { label: "Cadastrar primeiro cliente", href: "/clientes/novo" },
  { label: "Abrir primeira OS", href: "/ordens-de-servico/nova" },
];

export default function OnboardingWizard({ tenantId }: { tenantId: string }) {
  const [passo, setPasso] = useState(0);
  const [cor, setCor] = useState("#c0392b");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function salvarCor() {
    await fetch("/api/configuracoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cor_primaria: cor }),
    });
    // apply immediately
    document.documentElement.style.setProperty("--primary", cor);
  }

  async function concluir() {
    setLoading(true);
    await salvarCor();
    await fetch("/api/configuracoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_completo: true }),
    });
    setLoading(false);
    router.refresh();
  }

  const p = PASSOS[passo];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: 36,
        width: "100%", maxWidth: 480,
        boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
      }}>

        {/* Logo + progresso */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: cor,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontWeight: 900, fontSize: 24, color: "#fff",
            transition: "background 0.2s",
          }}>R</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 8 }}>{p.titulo}</h2>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.5 }}>{p.sub}</p>
        </div>

        {/* Progresso */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
          {PASSOS.map((_, i) => (
            <div key={i} style={{
              height: 4, borderRadius: 2, flex: 1,
              background: i <= passo ? cor : "#e5e5e5",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Conteúdo por passo */}
        {p.tipo === "intro" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {CHECKLIST.map(c => (
              <div key={c.label} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 10,
                border: "1px solid #e8e8e8", background: "#fafafa",
              }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${cor}`, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#333" }}>{c.label}</span>
              </div>
            ))}
          </div>
        )}

        {p.tipo === "cor" && (
          <div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 16,
            }}>
              {CORES.map(c => (
                <button key={c} onClick={() => setCor(c)} style={{
                  width: "100%", aspectRatio: "1", borderRadius: 10,
                  background: c, border: cor === c ? "3px solid #111" : "2px solid transparent",
                  cursor: "pointer", transition: "transform 0.1s",
                  transform: cor === c ? "scale(1.15)" : "scale(1)",
                }} />
              ))}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 10, border: "1px solid #e8e8e8", background: "#fafafa",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: cor, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#555" }}>Cor selecionada</span>
              <input type="color" value={cor} onChange={e => setCor(e.target.value)}
                style={{ marginLeft: "auto", width: 32, height: 32, border: "none", cursor: "pointer", background: "none" }} />
              <span style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{cor}</span>
            </div>
          </div>
        )}

        {p.tipo === "fim" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
            <p style={{ fontSize: 13, color: "#888" }}>
              Comece pelos itens abaixo para aproveitar 100% do sistema:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              {CHECKLIST.map(c => (
                <a key={c.label} href={c.href} onClick={concluir} style={{
                  display: "block", padding: "11px 16px",
                  borderRadius: 10, border: `1px solid ${cor}22`,
                  background: cor + "10", textDecoration: "none",
                  fontSize: 14, fontWeight: 600, color: cor,
                }}>→ {c.label}</a>
              ))}
            </div>
          </div>
        )}

        {/* Botões */}
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          {passo > 0 && (
            <button onClick={() => setPasso(p => p - 1)} style={{
              padding: "12px 20px", borderRadius: 10,
              border: "1px solid #e5e5e5", background: "#fff",
              cursor: "pointer", fontSize: 14, color: "#555",
            }}>← Voltar</button>
          )}
          {passo < PASSOS.length - 1 ? (
            <button onClick={async () => { if (p.tipo === "cor") await salvarCor(); setPasso(p => p + 1); }}
              style={{
                flex: 1, padding: "13px", borderRadius: 10,
                background: cor, color: "#fff", border: "none",
                cursor: "pointer", fontSize: 15, fontWeight: 700,
                transition: "background 0.2s",
              }}>
              Continuar →
            </button>
          ) : (
            <button onClick={concluir} disabled={loading} style={{
              flex: 1, padding: "13px", borderRadius: 10,
              background: cor, color: "#fff", border: "none",
              cursor: "pointer", fontSize: 15, fontWeight: 700,
            }}>
              {loading ? "Salvando..." : "Começar agora!"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
