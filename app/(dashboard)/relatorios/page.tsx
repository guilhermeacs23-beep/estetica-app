import Link from "next/link";

const RELATORIOS = [
  { href: "/relatorios/comissoes",          label: "Comissões",              desc: "Comissões por funcionário no mês",       icon: "%" },
  { href: "/relatorios/servicos-realizados", label: "Serviços Realizados",   desc: "Serviços mais executados no período",    icon: "🔧" },
  { href: "/relatorios/clientes-frequentes", label: "Clientes Frequentes",   desc: "Ranking de clientes por visitas",        icon: "👤" },
  { href: "/relatorios/caixa",              label: "Controle de Caixa",      desc: "Entradas e saídas financeiras",          icon: "💰" },
];

export default function RelatoriosPage() {
  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 760 }}>
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Relatórios</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Análises e dados do seu negócio</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RELATORIOS.map(r => (
          <Link key={r.href} href={r.href}
            className="card flex items-center gap-4 hover:opacity-80 transition-opacity"
            style={{ textDecoration: "none" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              {r.icon}
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--text)" }}>{r.label}</p>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{r.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
