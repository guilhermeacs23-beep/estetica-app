"use client";
/**
 * Balão da Lumi — assistente de negócios do dono.
 * Só é montado para role "owner" (layout). A Edge Function rpm-lumi confere de
 * novo pelo login: esconder o balão não é a trava, é só a vitrine.
 */
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: "user" | "assistant"; conteudo: string };

// Cor da Valora: o balão se destaca do vermelho da loja de propósito.
const AZUL = "linear-gradient(135deg,#2ea8ff 0%,#0d6fc0 65%,#0a4f8f 100%)";

// Perguntas prontas: ensinam o Alex a usar a Lumi já no primeiro clique.
const SUGESTOES = [
  "Qual foi minha conversão do WhatsApp esta semana?",
  "Como está o faturamento do mês?",
  "Quem me chamou no WhatsApp e está sem resposta?",
  "Quais OS estão em andamento?",
  "Qual serviço mais vendi este mês?",
  "Quantas mensagens recebi por dia esta semana?",
];
const ATALHOS: Array<[string, string]> = [
  ["Conversão da semana", SUGESTOES[0]],
  ["Faturamento do mês", SUGESTOES[1]],
  ["Sem resposta no WhatsApp", SUGESTOES[2]],
  ["OS em andamento", SUGESTOES[3]],
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
            {item && <span style={{ color: "#2ea8ff" }}>•</span>}
            <span>{partes}</span>
          </div>
        );
      })}
    </>
  );
}

/** Balão de conversa com brilho: o "rosto" da Lumi. */
function IconeLumi({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.4-4.2A7.5 7.5 0 1 1 20 11.5z" />
      <path d="M12.5 7.8l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" fill="currentColor" stroke="none" />
    </svg>
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
          style={{ position: "fixed", right: 20, bottom: 96, zIndex: 60, width: "min(400px, calc(100vw - 32px))",
            height: "min(580px, calc(100vh - 120px))", display: "flex", flexDirection: "column",
            background: "var(--bg-card, var(--bg))", border: "1px solid var(--border)", borderRadius: 16,
            boxShadow: "0 18px 50px rgba(0,0,0,.35)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
            background: AZUL, color: "#fff" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.18)",
              border: "1px solid rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconeLumi size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Lumi</div>
              <div style={{ fontSize: 11, opacity: .85 }}>Sua assistente de negócios · busca no sistema antes de responder</div>
            </div>
            {msgs.length > 0 && (
              <button onClick={limpar} title="Começar conversa nova"
                style={{ fontSize: 11, color: "#fff", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.35)",
                  borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>Nova conversa</button>
            )}
            <button onClick={() => setAberto(false)} aria-label="Fechar"
              style={{ fontSize: 20, color: "#fff", background: "none", border: 0, cursor: "pointer", padding: 4 }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.length === 0 && !pensando && (
              <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
                <p style={{ margin: "0 0 10px", color: "var(--text)" }}>
                  Oi{primeiroNome ? `, ${primeiroNome}` : ""}! Sou a Lumi. Pergunta o que quiser sobre a loja —
                  faturamento, OS, serviços, clientes, WhatsApp. Eu busco no sistema antes de responder.
                </p>
                <p style={{ margin: "0 0 10px", fontSize: 12 }}>Toque numa pergunta para começar, ou escreva a sua:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SUGESTOES.map(s => (
                    <button key={s} onClick={() => perguntar(s)}
                      style={{ textAlign: "left", fontSize: 12.5, padding: "9px 11px", borderRadius: 10, cursor: "pointer",
                        border: "1px solid rgba(46,168,255,.45)", background: "rgba(46,168,255,.08)", color: "var(--text)" }}>
                      <span style={{ color: "#2ea8ff", marginRight: 6 }}>›</span>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%",
                background: m.role === "user" ? AZUL : "var(--bg)", color: m.role === "user" ? "#fff" : "var(--text)",
                border: m.role === "user" ? "none" : "1px solid var(--border)",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                padding: "8px 11px", fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {m.role === "assistant" ? <Texto t={m.conteudo} /> : m.conteudo}
              </div>
            ))}
            {pensando && (
              <div style={{ alignSelf: "flex-start", fontSize: 12.5, color: "var(--text-muted)", padding: "6px 2px" }}>
                <span className="lumi-pontos">Lumi está consultando o sistema</span>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {msgs.length > 0 && (
            <div style={{ display: "flex", gap: 6, padding: "8px 10px 0", overflowX: "auto", borderTop: "1px solid var(--border)" }}>
              {ATALHOS.map(([rotulo, pergunta]) => (
                <button key={rotulo} onClick={() => perguntar(pergunta)} disabled={pensando}
                  style={{ flex: "none", fontSize: 11.5, padding: "5px 10px", borderRadius: 999, cursor: "pointer",
                    border: "1px solid rgba(46,168,255,.45)", background: "rgba(46,168,255,.08)", color: "var(--text)" }}>{rotulo}</button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, padding: 10, borderTop: msgs.length > 0 ? "none" : "1px solid var(--border)" }}>
            <textarea ref={inputRef} value={texto} rows={1} placeholder="Pergunte à Lumi…"
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); perguntar(); } }}
              style={{ flex: 1, resize: "none", fontSize: 13, padding: "9px 11px", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "inherit", maxHeight: 96 }} />
            <button onClick={() => perguntar()} disabled={pensando || !texto.trim()}
              style={{ padding: "0 14px", borderRadius: 10, border: 0, fontWeight: 600, fontSize: 13, cursor: "pointer",
                background: AZUL, color: "#fff", opacity: pensando || !texto.trim() ? 0.5 : 1 }}>Enviar</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lumiPulso { 0% { box-shadow: 0 0 0 0 rgba(46,168,255,.55); } 70% { box-shadow: 0 0 0 16px rgba(46,168,255,0); } 100% { box-shadow: 0 0 0 0 rgba(46,168,255,0); } }
        @keyframes lumiPontos { 0%,20% { content: ""; } 40% { content: "."; } 60% { content: ".."; } 80%,100% { content: "..."; } }
        .lumi-pontos::after { content: ""; animation: lumiPontos 1.4s infinite; }
        .lumi-botao { animation: lumiPulso 2.4s infinite; transition: transform .15s ease; }
        .lumi-botao:hover { transform: translateY(-2px) scale(1.03); }
        @media (max-width: 640px) { .lumi-rotulo { display: none !important; } }
      `}</style>
      <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 60, display: "flex", alignItems: "center", gap: 10 }}>
        {!aberto && (
          <button className="lumi-rotulo" onClick={() => setAberto(true)}
            style={{ background: "var(--bg-card, #fff)", color: "var(--text)", border: "1px solid rgba(46,168,255,.45)",
              borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 6px 18px rgba(13,111,192,.18)" }}>
            Pergunte à <span style={{ color: "#2ea8ff" }}>Lumi</span>
          </button>
        )}
        <button className={aberto ? "" : "lumi-botao"} onClick={() => setAberto(a => !a)}
          aria-label={aberto ? "Fechar a Lumi" : "Falar com a Lumi"}
          style={{ width: 60, height: 60, borderRadius: "50%", border: "2px solid rgba(255,255,255,.35)", cursor: "pointer",
            background: AZUL, color: "#fff", boxShadow: "0 10px 26px rgba(13,111,192,.45)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          {aberto ? <span style={{ fontSize: 28, lineHeight: 1 }}>×</span> : <IconeLumi size={28} />}
        </button>
      </div>
    </>
  );
}
