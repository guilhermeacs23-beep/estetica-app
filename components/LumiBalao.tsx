"use client";
/**
 * Balão da Lumi — assistente de negócios do dono.
 * Só é montado para role "owner" (layout). A Edge Function rpm-lumi confere de
 * novo pelo login: esconder o balão não é a trava, é só a vitrine.
 */
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: "user" | "assistant"; conteudo: string };

const SUGESTOES = [
  "Como está o faturamento do mês?",
  "Quem me chamou no WhatsApp e está sem resposta?",
  "Quais OS estão em andamento?",
  "Qual serviço mais vendi este mês?",
];

/** Negrito (**x**) e listas ("- "), sem HTML vindo do modelo. */
function Texto({ t }: { t: string }) {
  const linhas = t.split("\n");
  return (
    <>
      {linhas.map((l, i) => {
        const item = /^\s*[-•]\s+/.test(l);
        const corpo = l.replace(/^\s*[-•]\s+/, "").replace(/^#{1,6}\s*/, "");
        const partes = corpo.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>);
        if (!corpo.trim()) return <div key={i} style={{ height: 6 }} />;
        if (/^-{3,}$/.test(corpo.trim())) return <hr key={i} style={{ border: 0, borderTop: "1px solid var(--border)", margin: "6px 0" }} />;
        return (
          <div key={i} style={{ display: "flex", gap: 6, paddingLeft: item ? 4 : 0 }}>
            {item && <span style={{ color: "var(--primary)" }}>•</span>}
            <span>{partes}</span>
          </div>
        );
      })}
    </>
  );
}

export default function LumiBalao({ nome }: { nome?: string | null }) {
  const supabase = useRef(createClient()).current;
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [carregou, setCarregou] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function chamar(corpo: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke("rpm-lumi", { body: corpo });
    if (error) throw error;
    return data as any;
  }

  useEffect(() => {
    if (!aberto || carregou) return;
    setCarregou(true);
    chamar({ acao: "historico" }).then(d => setMsgs(d?.mensagens ?? [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (aberto) setTimeout(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); inputRef.current?.focus(); }, 60);
  }, [msgs, aberto, pensando]);

  async function perguntar(p?: string) {
    const pergunta = (p ?? texto).trim();
    if (!pergunta || pensando) return;
    setTexto("");
    setMsgs(m => [...m, { role: "user", conteudo: pergunta }]);
    setPensando(true);
    try {
      const d = await chamar({ pergunta });
      setMsgs(m => [...m, { role: "assistant", conteudo: d?.resposta ?? "Não consegui responder agora." }]);
    } catch {
      setMsgs(m => [...m, { role: "assistant", conteudo: "Não consegui falar com o servidor agora. Tenta de novo em instantes?" }]);
    } finally {
      setPensando(false);
    }
  }

  async function limpar() {
    await chamar({ acao: "limpar" }).catch(() => {});
    setMsgs([]);
  }

  const primeiroNome = (nome ?? "").trim().split(" ")[0];

  return (
    <>
      {aberto && (
        <div role="dialog" aria-label="Lumi, assistente de negócios"
          style={{ position: "fixed", right: 20, bottom: 88, zIndex: 60, width: "min(400px, calc(100vw - 32px))",
            height: "min(580px, calc(100vh - 120px))", display: "flex", flexDirection: "column",
            background: "var(--bg-card, var(--bg))", border: "1px solid var(--border)", borderRadius: 16,
            boxShadow: "0 18px 50px rgba(0,0,0,.35)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
            borderBottom: "1px solid var(--border)", background: "var(--bg-sidebar)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--primary)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>L</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Lumi</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Assistente de negócios · números do seu sistema</div>
            </div>
            {msgs.length > 0 && (
              <button onClick={limpar} title="Começar conversa nova"
                style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>Nova conversa</button>
            )}
            <button onClick={() => setAberto(false)} aria-label="Fechar"
              style={{ fontSize: 18, color: "var(--text-muted)", background: "none", border: 0, cursor: "pointer", padding: 4 }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.length === 0 && !pensando && (
              <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
                <p style={{ margin: "0 0 10px", color: "var(--text)" }}>
                  Oi{primeiroNome ? `, ${primeiroNome}` : ""}! Sou a Lumi. Pergunta o que quiser sobre a loja —
                  faturamento, OS, serviços, clientes, WhatsApp. Eu busco no sistema antes de responder.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SUGESTOES.map(s => (
                    <button key={s} onClick={() => perguntar(s)}
                      style={{ textAlign: "left", fontSize: 12.5, padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                        border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%",
                background: m.role === "user" ? "var(--primary)" : "var(--bg)", color: m.role === "user" ? "#fff" : "var(--text)",
                border: m.role === "user" ? "none" : "1px solid var(--border)",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                padding: "8px 11px", fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {m.role === "assistant" ? <Texto t={m.conteudo} /> : m.conteudo}
              </div>
            ))}
            {pensando && (
              <div style={{ alignSelf: "flex-start", fontSize: 12.5, color: "var(--text-muted)", padding: "6px 2px" }}>
                Lumi está consultando o sistema…
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <div style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid var(--border)" }}>
            <textarea ref={inputRef} value={texto} rows={1} placeholder="Pergunte à Lumi…"
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); perguntar(); } }}
              style={{ flex: 1, resize: "none", fontSize: 13, padding: "9px 11px", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "inherit", maxHeight: 96 }} />
            <button onClick={() => perguntar()} disabled={pensando || !texto.trim()}
              style={{ padding: "0 14px", borderRadius: 10, border: 0, fontWeight: 600, fontSize: 13, cursor: "pointer",
                background: "var(--primary)", color: "#fff", opacity: pensando || !texto.trim() ? 0.5 : 1 }}>Enviar</button>
          </div>
        </div>
      )}

      <button onClick={() => setAberto(a => !a)} aria-label={aberto ? "Fechar a Lumi" : "Falar com a Lumi"}
        style={{ position: "fixed", right: 20, bottom: 20, zIndex: 60, width: 56, height: 56, borderRadius: "50%",
          border: 0, cursor: "pointer", background: "var(--primary)", color: "#fff",
          boxShadow: "0 8px 24px rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {aberto ? (
          <span style={{ fontSize: 26, lineHeight: 1 }}>×</span>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />
            <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth="3" />
          </svg>
        )}
      </button>
    </>
  );
}
