"use client";
import { useState, useRef, useEffect } from "react";

const MARCAS = [
  "ACURA","AGRALE","ALFA ROMEO","ASTON MARTIN","AUDI","BENTLEY","BMW","BYD",
  "CAOA CHERY","CHERY","CHEVROLET","CHRYSLER","CITROËN","DODGE","FERRARI",
  "FIAT","FORD","FOTON","GWM","GREAT WALL","HONDA","HYUNDAI","INFINITI",
  "JAC","JAGUAR","JEEP","KIA","LAMBORGHINI","LAND ROVER","LEXUS","LINCOLN",
  "MASERATI","MAZDA","MERCEDES-BENZ","MINI","MITSUBISHI","NISSAN","PEUGEOT",
  "PORSCHE","RAM","RENAULT","ROLLS-ROYCE","SUBARU","SUZUKI","TOYOTA",
  "VOLKSWAGEN","VOLVO","YAMAHA","KAWASAKI","HONDA MOTOS","TRIUMPH","DUCATI",
];

const TIPOS = [
  { value: "carro",    label: "Carro",      icon: "🚗" },
  { value: "suv",      label: "SUV",        icon: "🚙" },
  { value: "pickup",   label: "Pickup",     icon: "🛻" },
  { value: "van",      label: "Van",        icon: "🚐" },
  { value: "caminhao", label: "Caminhão",   icon: "🚚" },
  { value: "moto",     label: "Moto",       icon: "🏍️" },
];

const CORES = [
  { label: "Branco",   hex: "#FFFFFF", border: true },
  { label: "Prata",    hex: "#C0C0C0" },
  { label: "Cinza",    hex: "#808080" },
  { label: "Preto",    hex: "#1a1a1a" },
  { label: "Vermelho", hex: "#CC2200" },
  { label: "Azul",     hex: "#1A4FA0" },
  { label: "Azul Claro", hex: "#5B9BD5" },
  { label: "Verde",    hex: "#2D7A2D" },
  { label: "Amarelo",  hex: "#F5C518" },
  { label: "Laranja",  hex: "#E07820" },
  { label: "Roxo",     hex: "#6B3FA0" },
  { label: "Marrom",   hex: "#7B4F2E" },
  { label: "Bege",     hex: "#C8B89A" },
  { label: "Rosa",     hex: "#E87090" },
];

export interface VeiculoFormData {
  placa: string;
  marca: string;
  modelo: string;
  ano: string;
  cor: string;
  km: string;
  categoria: string;
  tipo_veiculo: string;
  obs: string;
}

interface Props {
  value: VeiculoFormData;
  onChange: (v: VeiculoFormData) => void;
  categorias?: string[];
}

export default function VeiculoForm({ value, onChange, categorias = ["Pequeno", "Médio", "Grande"] }: Props) {
  const [marcaQuery, setMarcaQuery] = useState(value.marca ?? "");
  const [showMarcas, setShowMarcas] = useState(false);
  const [corSelecionada, setCorSelecionada] = useState(value.cor ?? "");
  const marcaRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof VeiculoFormData, v: string) => onChange({ ...value, [k]: v });

  const marcasFiltradas = marcaQuery.length >= 1
    ? MARCAS.filter(m => m.toLowerCase().startsWith(marcaQuery.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (marcaRef.current && !marcaRef.current.contains(e.target as Node)) {
        setShowMarcas(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selecionarMarca(m: string) {
    setMarcaQuery(m);
    set("marca", m);
    setShowMarcas(false);
  }

  function selecionarCor(label: string) {
    setCorSelecionada(label);
    set("cor", label);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tipo de veículo */}
      <div className="field">
        <label className="label">Tipo</label>
        <div className="flex gap-2 flex-wrap">
          {TIPOS.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("tipo_veiculo", t.value)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all"
              style={{
                borderColor: value.tipo_veiculo === t.value ? "var(--primary)" : "var(--border)",
                background: value.tipo_veiculo === t.value ? "rgba(var(--primary-rgb,196,30,58),0.10)" : "var(--bg-card)",
                color: value.tipo_veiculo === t.value ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              <span style={{ fontSize: 22 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Placa + Marca */}
      <div className="grid grid-cols-2 gap-4">
        <div className="field">
          <label className="label">Placa *</label>
          <input
            className="input"
            value={value.placa}
            onChange={e => set("placa", e.target.value.toUpperCase())}
            placeholder="ABC1D23"
            maxLength={8}
            required
          />
        </div>
        <div className="field" ref={marcaRef} style={{ position: "relative" }}>
          <label className="label">Marca</label>
          <input
            className="input"
            value={marcaQuery}
            onChange={e => { setMarcaQuery(e.target.value.toUpperCase()); set("marca", e.target.value.toUpperCase()); setShowMarcas(true); }}
            onFocus={() => setShowMarcas(true)}
            placeholder="VOLKSWAGEN..."
          />
          {showMarcas && marcasFiltradas.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 8, marginTop: 4, overflow: "hidden",
            }}>
              {marcasFiltradas.map(m => (
                <button key={m} type="button" onClick={() => selecionarMarca(m)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-opacity-10"
                  style={{ color: "var(--text)", display: "block" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modelo + Ano */}
      <div className="grid grid-cols-2 gap-4">
        <div className="field">
          <label className="label">Modelo</label>
          <input className="input" value={value.modelo} onChange={e => set("modelo", e.target.value)} placeholder="Gol, Civic, Hilux..." />
        </div>
        <div className="field">
          <label className="label">Ano</label>
          <input className="input" type="number" value={value.ano} onChange={e => set("ano", e.target.value)} placeholder={String(new Date().getFullYear())} min="1950" max={new Date().getFullYear() + 1} />
        </div>
      </div>

      {/* KM + Categoria */}
      <div className="grid grid-cols-2 gap-4">
        <div className="field">
          <label className="label">Quilometragem</label>
          <input className="input" type="number" value={value.km} onChange={e => set("km", e.target.value)} placeholder="0" min="0" />
        </div>
        <div className="field">
          <label className="label">Categoria</label>
          <select className="input" value={value.categoria} onChange={e => set("categoria", e.target.value)}>
            <option value="">Selecionar...</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Cor */}
      <div className="field">
        <label className="label">Cor</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {CORES.map(c => (
            <button
              key={c.label}
              type="button"
              title={c.label}
              onClick={() => selecionarCor(c.label)}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: c.hex,
                border: corSelecionada === c.label
                  ? "3px solid var(--primary)"
                  : c.border ? "2px solid var(--border)" : "2px solid transparent",
                cursor: "pointer",
                outline: "none",
                transition: "transform 0.1s",
                transform: corSelecionada === c.label ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>
        {corSelecionada && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{corSelecionada}</p>
        )}
      </div>

      {/* Obs */}
      <div className="field">
        <label className="label">Observações</label>
        <input className="input" value={value.obs} onChange={e => set("obs", e.target.value)} placeholder="Ex: vidros escuros, arranhão no para-choque..." />
      </div>
    </div>
  );
}
