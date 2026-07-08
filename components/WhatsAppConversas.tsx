"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = {
  id: string; numero: string; nome_contato: string | null;
  mensagem: string; tipo: "enviada" | "recebida"; lida: boolean; timestamp: string;
};
type Conv = { numero: string; nome: string; ultimaMensagem: string; timestamp: string; naoLidas: number; };

function fmtHora(ts: string) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtData(ts: string) {
  const d = new Date(ts);
  const hoje = new Date();
  const diff = Math.floor((hoje.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return fmtHora(ts);
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function avatar(nome: string) {
  return nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

// Fundo estilo WhatsApp: tiles/pattern sutil
const CHAT_BG: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  backgroundColor: "#0f1923",
  backgroundImage: [
    "radial-gradient(ellipse 70% 50% at 5% 5%, rgba(196,30,58,0.10) 0%, transparent 55%)",
    "radial-gradient(ellipse 60% 60% at 95% 95%, rgba(59,130,246,0.09) 0%, transparent 55%)",
    "radial-gradient(ellipse 45% 45% at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 60%)",
    "radial-gradient(circle at 80% 20%, rgba(196,30,58,0.06) 0%, transparent 30%)",
    "radial-gradient(circle at 20% 80%, rgba(59,130,246,0.06) 0%, transparent 30%)",
  ].join(", "),
};

const EMPTY_BG: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  backgroundColor: "#0f1923",
  backgroundImage: [
    "radial-gradient(ellipse 70% 50% at 5% 5%, rgba(196,30,58,0.10) 0%, transparent 55%)",
    "radial-gradient(ellipse 60% 60% at 95% 95%, rgba(59,130,246,0.09) 0%, transparent 55%)",
    "radial-gradient(ellipse 45% 45% at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 60%)",
    "radial-gradient(circle at 80% 20%, rgba(196,30,58,0.06) 0%, transparent 30%)",
    "radial-gradient(circle at 20% 80%, rgba(59,130,246,0.06) 0%, transparent 30%)",
  ].join(", "),
};

export default function WhatsAppConversas() {
  const [conversas, setConversas] = useState<Conv[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function carregarConversas() {
    const r = await fetch("/api/whatsapp/inbox");
    const d = await r.json();
    if (d.conversas) setConversas(d.conversas);
    setLoading(false);
  }

  async function abrirConversa(numero: string) {
    setSel(numero);
    inputRef.current?.focus();
    const r = await fetch("/api/whatsapp/inbox?numero=" + encodeURIComponent(numero));
    const d = await r.json();
    if (d.mensagens) setMsgs(d.mensagens);
    await fetch("/api/whatsapp/inbox", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero }),
    });
    setConversas(c => c.map(cv => cv.numero === numero ? { ...cv, naoLidas: 0 } : cv));
  }

  async function enviar() {
    if (!sel || !texto.trim()) return;
    setEnviando(true);
    const txt = texto;
    setTexto("");
    await fetch("/api/whatsapp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone: sel, mensagem: txt }),
    });
    const nova: Msg = { id: Date.now().toString(), numero: sel, nome_contato: null,
      mensagem: txt, tipo: "enviada", lida: true, timestamp: new Date().toISOString() };
    setMsgs(m => [...m, nova]);
    setConversas(c => c.map(cv => cv.numero === sel
      ? { ...cv, ultimaMensagem: txt, timestamp: nova.timestamp } : cv));
    setEnviando(false);
  }

  useEffect(() => {
    carregarConversas();
    const supabase = createClient();
    const channel = supabase.channel("wpp_inbox_rt2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_inbox" }, (payload) => {
        const nova = payload.new as Msg;
        setConversas(prev => {
          const exist = prev.find(c => c.numero === nova.numero);
          const filtered = prev.filter(c => c.numero !== nova.numero);
          return [{
            numero: nova.numero, nome: nova.nome_contato || nova.numero,
            ultimaMensagem: nova.mensagem, timestamp: nova.timestamp,
            naoLidas: nova.tipo === "recebida" ? (exist ? exist.naoLidas + 1 : 1) : (exist?.naoLidas ?? 0),
          }, ...filtered];
        });
        setSel(cur => {
          if (cur === nova.numero) setMsgs(m => [...m, nova]);
          return cur;
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const convSel = conversas.find(c => c.numero === sel);
  const filtradas = conversas.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.numero.includes(busca)
  );

  function groupByDate(ms: Msg[]) {
    const groups: { date: string; msgs: Msg[] }[] = [];
    let lastDate = "";
    for (const m of ms) {
      const d = new Date(m.timestamp).toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" });
      if (d !== lastDate) { groups.push({ date: d, msgs: [] }); lastDate = d; }
      groups[groups.length - 1].msgs.push(m);
    }
    return groups;
  }

  return (
    <div style={{
      display: "flex", height: 620, borderRadius: 16, overflow: "hidden",
      border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
    }}>

      {/* ── LISTA DE CONVERSAS ── */}
      <div style={{ width: 280, display: "flex", flexDirection: "column", background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Mensagens</p>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-muted)" }}>🔍</span>
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar conversa..."
              style={{ width: "100%", padding: "7px 10px 7px 30px", fontSize: 12, borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)",
                outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Carregando...
            </div>
          )}
          {!loading && filtradas.length === 0 && (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Nenhuma conversa</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Mensagens recebidas aparecem aqui
              </p>
            </div>
          )}
          {filtradas.map(c => {
            const ativo = sel === c.numero;
            return (
              <div key={c.numero} onClick={() => abrirConversa(c.numero)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                cursor: "pointer", transition: "background 0.15s",
                background: ativo ? "var(--primary)" : "transparent",
                borderBottom: "1px solid var(--border)",
              }}>
                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  background: ativo ? "rgba(255,255,255,0.2)" : "var(--surface)",
                  border: ativo ? "1.5px solid rgba(255,255,255,0.35)" : "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700,
                  color: ativo ? "#fff" : "var(--primary)",
                  transition: "all 0.2s",
                }}>
                  {avatar(c.nome)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{
                      fontSize: 13, fontWeight: c.naoLidas > 0 ? 700 : 600,
                      color: ativo ? "#fff" : "var(--text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                    }}>
                      {c.nome}
                    </span>
                    <span style={{ fontSize: 10, color: ativo ? "rgba(255,255,255,0.75)" : (c.naoLidas > 0 ? "var(--primary)" : "var(--text-muted)"), flexShrink: 0, marginLeft: 6 }}>
                      {fmtData(c.timestamp)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <p style={{ fontSize: 11, color: ativo ? "rgba(255,255,255,0.75)" : "var(--text-muted)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, margin: 0 }}>
                      {c.ultimaMensagem}
                    </p>
                    {c.naoLidas > 0 && !ativo && (
                      <span style={{
                        background: "var(--primary)", color: "#fff", borderRadius: "50%",
                        minWidth: 18, height: 18, padding: "0 4px", fontSize: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, flexShrink: 0,
                      }}>{c.naoLidas}</span>
                    )}
                    {c.naoLidas > 0 && ativo && (
                      <span style={{
                        background: "rgba(255,255,255,0.25)", color: "#fff", borderRadius: "50%",
                        minWidth: 18, height: 18, padding: "0 4px", fontSize: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, flexShrink: 0,
                      }}>{c.naoLidas}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ÁREA DE CHAT ── */}
      {sel ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Header da conversa */}
          <div style={{
            padding: "10px 20px", borderBottom: "1px solid var(--border)",
            background: "var(--bg-sidebar)", display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%", background: "var(--primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {avatar(convSel?.nome || sel)}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                {convSel?.nome || sel}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{sel}</p>
            </div>
          </div>

          {/* Fundo + mensagens */}
          <div style={CHAT_BG}>
            {groupByDate(msgs).map(group => (
              <div key={group.date}>
                {/* Separador de data */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 12px" }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  <span style={{
                    fontSize: 11, color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.07)",
                    padding: "3px 12px", borderRadius: 20, whiteSpace: "nowrap",
                    textTransform: "capitalize", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    {group.date}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.msgs.map((m, i) => {
                    const enviada = m.tipo === "enviada";
                    const proxIgual = group.msgs[i + 1]?.tipo === m.tipo;
                    return (
                      <div key={m.id} style={{
                        display: "flex", justifyContent: enviada ? "flex-end" : "flex-start",
                        marginBottom: proxIgual ? 2 : 8,
                      }}>
                        <div style={{
                          maxWidth: "68%", padding: "9px 14px",
                          borderRadius: enviada ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          background: enviada
                            ? "var(--primary)"
                            : "rgba(255,255,255,0.10)",
                          backdropFilter: enviada ? "none" : "blur(12px)",
                          border: enviada ? "none" : "1px solid rgba(255,255,255,0.12)",
                          color: "#fff",
                          boxShadow: enviada ? "0 2px 12px rgba(196,30,58,0.25)" : "0 2px 8px rgba(0,0,0,0.25)",
                        }}>
                          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
                            {m.mensagem}
                          </p>
                          <p style={{ margin: "4px 0 0", fontSize: 10, opacity: 0.6, textAlign: "right" }}>
                            {fmtHora(m.timestamp)}
                            {enviada && " ✓"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {msgs.length === 0 && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Nenhuma mensagem ainda</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 16px", borderTop: "1px solid var(--border)",
            background: "var(--bg-sidebar)", display: "flex", gap: 8, alignItems: "center",
          }}>
            <input
              ref={inputRef}
              className="input" style={{ flex: 1, fontSize: 13, borderRadius: 24, padding: "10px 16px" }}
              placeholder="Digite uma mensagem... (Enter para enviar)"
              value={texto} onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), enviar())}
            />
            <button onClick={enviar} disabled={enviando || !texto.trim()}
              style={{
                width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
                background: texto.trim() ? "var(--primary)" : "var(--border)",
                color: "#fff", fontSize: 16, display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0, transition: "background 0.2s",
              }}>
              {enviando ? "…" : "➤"}
            </button>
          </div>
        </div>
      ) : (
        /* Estado vazio */
        <div style={EMPTY_BG}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
          }}>
            💬
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.75)", margin: "0 0 6px" }}>
              Suas mensagens
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              Selecione uma conversa para começar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
