"use client";
import { useState, useEffect, useRef } from "react";

interface Cliente { id: string; nome: string; telefone?: string; whatsapp?: string; }

interface Props {
  onSelect: (c: Cliente | null) => void;
  selected: Cliente | null;
}

export default function ClienteAutocomplete({ onSelect, selected }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Cliente[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // fechar ao clicar fora
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // debounce search
  useEffect(() => {
    if (selected) return; // já selecionado, não busca
    if (timer.current) clearTimeout(timer.current);
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/clientes/buscar?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setOpen(data.length > 0);
      setLoading(false);
    }, 300);
  }, [query, selected]);

  function pick(c: Cliente) {
    onSelect(c);
    setQuery(c.nome);
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          className="input"
          value={selected ? selected.nome : query}
          onChange={e => { if (selected) clear(); setQuery(e.target.value); }}
          onFocus={() => { if (results.length > 0 && !selected) setOpen(true); }}
          placeholder="Digite nome ou celular..."
          autoComplete="off"
          readOnly={!!selected}
          style={selected ? { background: "var(--bg)", cursor: "default", paddingRight: 32 } : {}}
        />
        {selected && (
          <button
            type="button"
            onClick={clear}
            title="Remover cliente"
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 16, lineHeight: 1,
            }}
          >×</button>
        )}
      </div>

      {/* Indicador de carregamento */}
      {loading && (
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Buscando...</p>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: "var(--bg-sidebar)", border: "1px solid var(--border)",
          borderRadius: 8, marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          maxHeight: 240, overflowY: "auto",
        }}>
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                width: "100%", padding: "10px 14px", background: "none", border: "none",
                cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--border)",
              }}
              onMouseOver={e => (e.currentTarget.style.background = "var(--bg-card)")}
              onMouseOut={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{c.nome}</span>
              {(c.telefone || c.whatsapp) && (
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  📱 {c.whatsapp || c.telefone}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* sem resultado */}
      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: "var(--bg-sidebar)", border: "1px solid var(--border)",
          borderRadius: 8, marginTop: 4, padding: "12px 14px",
          fontSize: 13, color: "var(--text-muted)",
        }}>
          Nenhum cliente encontrado
        </div>
      )}

      {selected && (
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          ✅ Cliente vinculado · <button type="button" onClick={clear} style={{ background:"none",border:"none",color:"var(--primary)",cursor:"pointer",fontSize:11,textDecoration:"underline" }}>trocar</button>
        </p>
      )}
    </div>
  );
}
