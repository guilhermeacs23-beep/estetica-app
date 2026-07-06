"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const STATUS_COLOR: Record<string, string> = {
  aguardando: "#eab308",
  aceito: "#3b82f6",
  em_atendimento: "#f97316",
  finalizado: "#22c55e",
  entregue: "#a855f7",
};
const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando",
  aceito: "Aceito",
  em_atendimento: "Em Atend.",
  finalizado: "Finalizado",
  entregue: "Entregue",
};

type View = "mes" | "semana" | "dia";
interface Event { id: string; numero: number; status: string; hora: string; data: string; nome: string; veiculo: string; }

function isoDate(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function EventChip({ ev, compact }: { ev: Event; compact?: boolean }) {
  const router = useRouter();
  const color = STATUS_COLOR[ev.status] ?? "#888";
  return (
    <button
      onClick={() => router.push(`/ordens-de-servico/${ev.id}`)}
      title={`${ev.nome} · ${ev.veiculo} · ${STATUS_LABEL[ev.status] ?? ev.status}`}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        width: "100%", textAlign: "left",
        background: color + "22", border: `1px solid ${color}55`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 4, padding: compact ? "1px 4px" : "3px 6px",
        cursor: "pointer", marginBottom: 2,
        overflow: "hidden",
      }}
    >
      {ev.hora && (
        <span style={{ fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>{ev.hora.slice(0,5)}</span>
      )}
      <span style={{ fontSize: 11, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {ev.nome.split(" ")[0]}
      </span>
    </button>
  );
}

export default function DashboardCalendar() {
  const router = useRouter();
  const [view, setView] = useState<View>("mes");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async (from: string, to: string) => {
    setLoading(true);
    const res = await fetch(`/api/agenda?from=${from}&to=${to}`);
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (view === "mes") {
      const s = startOfMonth(cursor);
      // include extra days at start/end for grid
      const gridStart = startOfWeek(s);
      const gridEnd = addDays(startOfWeek(endOfMonth(cursor)), 6);
      fetchEvents(isoDate(gridStart), isoDate(gridEnd));
    } else if (view === "semana") {
      const s = startOfWeek(cursor);
      fetchEvents(isoDate(s), isoDate(addDays(s, 6)));
    } else {
      const d = isoDate(cursor);
      fetchEvents(d, d);
    }
  }, [view, cursor, fetchEvents]);

  function eventsFor(date: Date) {
    return events.filter(e => e.data === isoDate(date));
  }

  // Navigation
  function prev() {
    setCursor(d => {
      if (view === "mes") return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      if (view === "semana") return addDays(d, -7);
      return addDays(d, -1);
    });
  }
  function next() {
    setCursor(d => {
      if (view === "mes") return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      if (view === "semana") return addDays(d, 7);
      return addDays(d, 1);
    });
  }
  function goToday() { setCursor(new Date()); }

  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const hoje = isoDate(new Date());

  // ── Cabeçalho ──
  function headerTitle() {
    if (view === "mes") {
      return cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
    if (view === "semana") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  // ── MÊS ──
  function renderMes() {
    const s = startOfMonth(cursor);
    const gridStart = startOfWeek(s);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 0, borderBottom: "1px solid var(--border)" }}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={{ textAlign: "center", padding: "6px 0", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 0 }}>
          {days.map((day, i) => {
            const isThisMonth = day.getMonth() === cursor.getMonth();
            const isToday = isoDate(day) === hoje;
            const evs = eventsFor(day);
            return (
              <div
                key={i}
                onClick={() => { setCursor(day); setView("dia"); }}
                style={{
                  minHeight: 80, padding: 4, cursor: "pointer",
                  borderRight: i % 7 !== 6 ? "1px solid var(--border)" : "none",
                  borderBottom: "1px solid var(--border)",
                  background: isToday ? "rgba(196,30,58,0.06)" : "transparent",
                  opacity: isThisMonth ? 1 : 0.4,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", marginBottom: 2,
                  background: isToday ? "var(--primary)" : "transparent",
                  color: isToday ? "#fff" : "var(--text)",
                  fontSize: 12, fontWeight: isToday ? 700 : 400,
                }}>
                  {day.getDate()}
                </div>
                {evs.slice(0, 3).map(ev => <EventChip key={ev.id} ev={ev} compact />)}
                {evs.length > 3 && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+{evs.length - 3} mais</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── SEMANA ──
  function renderSemana() {
    const s = startOfWeek(cursor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(s, i));
    return (
      <div style={{ overflowX: "auto" }}>
        {/* Header dias */}
        <div style={{ display: "grid", gridTemplateColumns: "50px repeat(7,1fr)", gap: 0, borderBottom: "1px solid var(--border)" }}>
          <div />
          {days.map((d, i) => {
            const isToday = isoDate(d) === hoje;
            return (
              <div key={i} onClick={() => { setCursor(d); setView("dia"); }}
                style={{ textAlign: "center", padding: "8px 4px", cursor: "pointer",
                  background: isToday ? "rgba(196,30,58,0.06)" : "transparent" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>{DIAS_SEMANA[d.getDay()]}</div>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", margin: "2px auto 0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isToday ? "var(--primary)" : "transparent",
                  color: isToday ? "#fff" : "var(--text)",
                  fontSize: 14, fontWeight: 600,
                }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        {/* All-day events */}
        <div style={{ display: "grid", gridTemplateColumns: "50px repeat(7,1fr)", gap: 0, borderBottom: "1px solid var(--border)", minHeight: 36 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", padding: "4px 2px", textAlign: "right" }}>dia</div>
          {days.map((d, i) => (
            <div key={i} style={{ padding: 2, borderLeft: "1px solid var(--border)" }}>
              {eventsFor(d).filter(e => !e.hora).map(ev => <EventChip key={ev.id} ev={ev} compact />)}
            </div>
          ))}
        </div>
        {/* Hourly rows 7h–21h */}
        {Array.from({ length: 15 }, (_, h) => h + 7).map(h => (
          <div key={h} style={{ display: "grid", gridTemplateColumns: "50px repeat(7,1fr)", gap: 0, minHeight: 48, borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", padding: "2px 4px 0 0", textAlign: "right", lineHeight: 1.2 }}>{String(h).padStart(2,"0")}:00</div>
            {days.map((d, i) => {
              const slotEvs = eventsFor(d).filter(e => e.hora && parseInt(e.hora.split(":")[0]) === h);
              return (
                <div key={i} style={{ borderLeft: "1px solid var(--border)", padding: 2 }}>
                  {slotEvs.map(ev => <EventChip key={ev.id} ev={ev} />)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // ── DIA ──
  function renderDia() {
    const evs = eventsFor(cursor);
    if (evs.length === 0) {
      return (
        <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          Nenhuma OS agendada para este dia.
          <br />
          <button onClick={() => router.push("/ordens-de-servico/nova")}
            className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>+ Nova OS</button>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 4px" }}>
        {evs.map(ev => {
          const color = STATUS_COLOR[ev.status] ?? "#888";
          return (
            <button key={ev.id} onClick={() => router.push(`/ordens-de-servico/${ev.id}`)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                background: color + "15", border: `1px solid ${color}44`,
                borderLeft: `4px solid ${color}`, borderRadius: 8, cursor: "pointer", textAlign: "left",
              }}>
              <div style={{ flexShrink: 0, textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color }}>{ev.hora.slice(0,5) || "—"}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{ev.nome}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{ev.veiculo}</div>
              </div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: color + "30", color, fontWeight: 600, whiteSpace: "nowrap" }}>
                {STATUS_LABEL[ev.status] ?? ev.status}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header do calendário */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid var(--border)",
        flexWrap: "wrap", gap: 8,
      }}>
        {/* Título + nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={goToday} className="btn btn-secondary btn-sm">Hoje</button>
          <button onClick={prev} className="btn btn-ghost btn-sm" style={{ fontWeight: 700, fontSize: 16 }}>‹</button>
          <button onClick={next} className="btn btn-ghost btn-sm" style={{ fontWeight: 700, fontSize: 16 }}>›</button>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", textTransform: "capitalize" }}>
            {headerTitle()}
          </span>
          {loading && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>…</span>}
        </div>
        {/* View switcher */}
        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {(["dia","semana","mes"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: "5px 12px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                textTransform: "capitalize",
                background: view === v ? "var(--primary)" : "var(--bg-card)",
                color: view === v ? "#fff" : "var(--text-muted)",
                borderRight: v !== "mes" ? "1px solid var(--border)" : "none",
              }}>
              {v === "mes" ? "Mês" : v === "semana" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>
      </div>

      {/* Corpo do calendário */}
      <div style={{ minHeight: view === "mes" ? 360 : 200 }}>
        {view === "mes" && renderMes()}
        {view === "semana" && renderSemana()}
        {view === "dia" && renderDia()}
      </div>

      {/* Rodapé — link para agenda completa */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => router.push("/agenda")}
          style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
          Ver agenda completa →
        </button>
      </div>
    </div>
  );
}
