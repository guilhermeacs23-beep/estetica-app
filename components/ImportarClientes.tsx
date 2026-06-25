"use client";
import { useRef, useState, useCallback } from "react";

interface ParsedRow {
  nome: string; telefone: string; whatsapp: string; email: string; cpf: string;
  placa: string; modelo: string; cor: string; ano: string;
  ultimo_servico: string; data_ultimo_servico: string;
  _linha: number; _valido: boolean; _erro?: string;
}
const COLS = [
  { key: "nome", label: "Nome *" }, { key: "telefone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp" }, { key: "email", label: "Email" },
  { key: "cpf", label: "CPF" }, { key: "placa", label: "Placa" },
  { key: "modelo", label: "Modelo" }, { key: "cor", label: "Cor" },
  { key: "ano", label: "Ano" }, { key: "ultimo_servico", label: "Ultimo Servico" },
  { key: "data_ultimo_servico", label: "Data Servico" },
];
function norm(s: string) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, ""); }
function detectar(headers: string[]): Record<string, string> {
  const al: Record<string, string[]> = {
    nome: ["nome","cliente","name"], telefone: ["telefone","tel","fone","phone","celular"],
    whatsapp: ["whatsapp","wpp","zap"], email: ["email","mail"], cpf: ["cpf","documento"],
    placa: ["placa","plate"], modelo: ["modelo","carro","veiculo","car"],
    cor: ["cor","color"], ano: ["ano","year"],
    ultimo_servico: ["ultimoservico","servico","service"],
    data_ultimo_servico: ["dataultimo","dataservico","data"],
  };
  const m: Record<string, string> = {};
  headers.forEach(h => { const hn = norm(h); for (const [c, a] of Object.entries(al)) { if (!m[c] && a.some(x => hn.includes(x))) m[c] = h; } });
  return m;
}

export default function ImportarClientes() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<"idle"|"preview"|"importando"|"concluido">("idle");
  const [drag, setDrag] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [arquivo, setArquivo] = useState("");
  const [prog, setProg] = useState(0);
  const [res, setRes] = useState<{clientes_criados:number;veiculos_criados:number;os_criadas:number;erros:number;total:number;detalhes_erros:string[]}|null>(null);

  const processar = useCallback(async (file: File) => {
    if (!file.name.match(/[.]xlsx?$/i)) { alert("Apenas .xlsx ou .xls"); return; }
    setArquivo(file.name);
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
    let hi = 0;
    for (let i = 0; i < Math.min(5, raw.length); i++) {
      if ((raw[i] as string[]).map(c => norm(String(c))).some(c => c.includes("nome") || c.includes("cliente"))) { hi = i; break; }
    }
    const headers = (raw[hi] as string[]).map(h => String(h||"").trim());
    const mapa = detectar(headers);
    const parsed: ParsedRow[] = (raw.slice(hi + 2) as unknown[][])
      .filter(r => (r as string[]).some(c => String(c).trim()))
      .map((r, i) => {
        const row = r as unknown[];
        const get = (campo: string) => { const col = mapa[campo]; if (!col) return ""; const idx = headers.indexOf(col); if (idx === -1) return ""; const v = row[idx]; if (v instanceof Date) return `${v.getDate().toString().padStart(2,"0")}/${(v.getMonth()+1).toString().padStart(2,"0")}/${v.getFullYear()}`; return String(v ?? "").trim(); };
        const nome = get("nome");
        return { nome, telefone: get("telefone"), whatsapp: get("whatsapp"), email: get("email"), cpf: get("cpf"), placa: get("placa"), modelo: get("modelo"), cor: get("cor"), ano: get("ano"), ultimo_servico: get("ultimo_servico"), data_ultimo_servico: get("data_ultimo_servico"), _linha: hi+2+i+1, _valido: !!nome, _erro: nome ? undefined : "Nome obrigatorio" };
      });
    setRows(parsed); setEtapa("preview");
  }, []);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) processar(f); };

  const importar = async () => {
    const validos = rows.filter(r => r._valido);
    if (!validos.length) return;
    setEtapa("importando"); setProg(0);
    const tot = { clientes_criados:0, veiculos_criados:0, os_criadas:0, erros:0, total:0, detalhes_erros:[] as string[] };
    for (let i = 0; i < validos.length; i += 50) {
      const lote = validos.slice(i, i+50);
      try {
        const r = await fetch("/api/importar/clientes", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ rows: lote }) });
        const d = await r.json();
        tot.clientes_criados += d.clientes_criados||0; tot.veiculos_criados += d.veiculos_criados||0;
        tot.os_criadas += d.os_criadas||0; tot.erros += d.erros||0; tot.total += lote.length;
        tot.detalhes_erros.push(...(d.detalhes_erros||[]));
      } catch { tot.erros += lote.length; tot.total += lote.length; }
      setProg(Math.round(((i+lote.length)/validos.length)*100));
    }
    setRes(tot); setEtapa("concluido");
  };

  const reiniciar = () => { setEtapa("idle"); setRows([]); setArquivo(""); setProg(0); setRes(null); if (inputRef.current) inputRef.current.value = ""; };
  const validos = rows.filter(r => r._valido);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, color:"var(--text)", margin:0 }}>Importar Clientes</h2>
          <p style={{ color:"var(--text-muted)", fontSize:14, margin:"4px 0 0" }}>Importe clientes, veiculos e historico de uma planilha Excel</p>
        </div>
        <a href="/template-importacao.xlsx" download style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:8, fontSize:14, fontWeight:600, background:"var(--surface)", color:"var(--text)", border:"1px solid var(--border)", textDecoration:"none" }}>
          Baixar modelo .xlsx
        </a>
      </div>

      <div style={{ background:"rgba(196,30,58,0.08)", border:"1px solid rgba(196,30,58,0.25)", borderRadius:10, padding:"14px 18px", fontSize:14, color:"var(--text-muted)" }}>
        <strong style={{ color:"var(--primary)" }}>Como usar:</strong> Baixe o modelo, preencha a partir da linha 4 e importe. Duplicatas por telefone ou e-mail serao ignoradas automaticamente.
      </div>

      {etapa === "idle" && (
        <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={onDrop} onClick={()=>inputRef.current?.click()}
          style={{ border:`2px dashed ${drag?"var(--primary)":"var(--border)"}`, borderRadius:14, padding:"52px 24px", textAlign:"center", cursor:"pointer", background:drag?"rgba(196,30,58,0.05)":"var(--surface)" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>+</div>
          <p style={{ fontSize:16, fontWeight:600, color:"var(--text)", margin:"0 0 6px" }}>Arraste o arquivo aqui ou clique para selecionar</p>
          <p style={{ fontSize:13, color:"var(--text-muted)", margin:0 }}>Aceita .xlsx e .xls</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e=>{const f=e.target.files?.[0];if(f)processar(f);}} />
        </div>
      )}

      {etapa === "preview" && (
        <>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {[{l:"Total",v:rows.length,c:"var(--text)"},{l:"Prontos",v:validos.length,c:"#22c55e"},{l:"Com erro",v:rows.length-validos.length,c:"#ef4444"}].map(({l,v,c})=>(
              <div key={l} style={{ flex:"1 1 120px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"12px 16px" }}>
                <div style={{ fontSize:24, fontWeight:700, color:c }}>{v}</div>
                <div style={{ fontSize:12, color:"var(--text-muted)" }}>{l}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:13, color:"var(--text-muted)", margin:0 }}>Arquivo: <strong style={{color:"var(--text)"}}>{arquivo}</strong></p>
          <div style={{ overflowX:"auto", borderRadius:10, border:"1px solid var(--border)" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:"var(--surface)" }}>
                <th style={{ padding:"8px 10px", textAlign:"left", color:"var(--text-muted)", borderBottom:"1px solid var(--border)" }}>#</th>
                {COLS.map(c=><th key={c.key} style={{ padding:"8px 10px", textAlign:"left", color:"var(--text-muted)", borderBottom:"1px solid var(--border)", whiteSpace:"nowrap" }}>{c.label}</th>)}
                <th style={{ padding:"8px 10px", textAlign:"left", color:"var(--text-muted)", borderBottom:"1px solid var(--border)" }}>Status</th>
              </tr></thead>
              <tbody>
                {rows.slice(0,20).map((row,i)=>(
                  <tr key={i} style={{ borderBottom:"1px solid var(--border)", background:row._valido?"transparent":"rgba(239,68,68,0.04)" }}>
                    <td style={{ padding:"6px 10px", color:"var(--text-muted)" }}>{row._linha}</td>
                    {COLS.map(c=><td key={c.key} style={{ padding:"6px 10px", color:"var(--text)", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{row[c.key as keyof ParsedRow] as string || "-"}</td>)}
                    <td style={{ padding:"6px 10px" }}>{row._valido ? <span style={{color:"#22c55e",fontWeight:600}}>OK</span> : <span style={{color:"#ef4444",fontWeight:600}}>{row._erro}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length>20&&<div style={{ padding:"8px 12px", fontSize:12, color:"var(--text-muted)", borderTop:"1px solid var(--border)" }}>Exibindo 20 de {rows.length} linhas</div>}
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={reiniciar} style={{ padding:"10px 20px", borderRadius:8, fontWeight:600, fontSize:14, background:"var(--surface)", color:"var(--text)", border:"1px solid var(--border)", cursor:"pointer" }}>Escolher outro arquivo</button>
            <button onClick={importar} disabled={validos.length===0} style={{ padding:"10px 24px", borderRadius:8, fontWeight:700, fontSize:14, background:validos.length>0?"var(--primary)":"var(--border)", color:"white", border:"none", cursor:validos.length>0?"pointer":"not-allowed" }}>
              Importar {validos.length} cliente{validos.length!==1?"s":""}
            </button>
          </div>
        </>
      )}

      {etapa === "importando" && (
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:40, textAlign:"center" }}>
          <p style={{ fontSize:20, fontWeight:600, color:"var(--text)", marginBottom:16 }}>Importando clientes...</p>
          <div style={{ background:"var(--border)", borderRadius:99, height:10, overflow:"hidden", maxWidth:400, margin:"0 auto 12px" }}>
            <div style={{ height:"100%", borderRadius:99, background:"var(--primary)", width:`${prog}%`, transition:"width 0.3s" }} />
          </div>
          <p style={{ color:"var(--text-muted)", fontSize:14 }}>{prog}% concluido</p>
        </div>
      )}

      {etapa === "concluido" && res && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:14, padding:28, textAlign:"center" }}>
            <h3 style={{ color:"#22c55e", margin:"0 0 6px", fontSize:22 }}>Importacao concluida!</h3>
            <p style={{ color:"var(--text-muted)", margin:0 }}>{res.total} linhas processadas</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12 }}>
            {[{l:"Clientes criados",v:res.clientes_criados,c:"#22c55e"},{l:"Veiculos criados",v:res.veiculos_criados,c:"#3b82f6"},{l:"OSs historicas",v:res.os_criadas,c:"#f59e0b"},{l:"Erros",v:res.erros,c:res.erros>0?"#ef4444":"var(--text-muted)"}].map(({l,v,c})=>(
              <div key={l} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"14px", textAlign:"center" }}>
                <div style={{ fontSize:28, fontWeight:700, color:c }}>{v}</div>
                <div style={{ fontSize:12, color:"var(--text-muted)" }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={reiniciar} style={{ padding:"10px 20px", borderRadius:8, fontWeight:600, fontSize:14, background:"var(--surface)", color:"var(--text)", border:"1px solid var(--border)", cursor:"pointer" }}>Importar outro arquivo</button>
            <a href="/clientes" style={{ padding:"10px 20px", borderRadius:8, fontWeight:600, fontSize:14, background:"var(--primary)", color:"white", textDecoration:"none" }}>Ver clientes</a>
          </div>
        </div>
      )}
    </div>
  );
}
