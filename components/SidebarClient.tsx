"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavItem =
  | { href: string; label: string; icon: React.ReactNode; newTab?: boolean }
  | { divider: true }
  | { group: string; icon: React.ReactNode; items: { href: string; label: string }[] };

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { href: "/dashboard-financeiro", label: "Financeiro", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { href: "/ordens-de-servico", label: "Ordens de Serviço", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
  { href: "/agenda", label: "Agenda", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { href: "/painel-tv", label: "Painel TV", newTab: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
  { divider: true },
  {
    group: "Cadastros", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    items: [
      { href: "/clientes",     label: "Clientes" },
      { href: "/veiculos",     label: "Veículos" },
      { href: "/servicos",     label: "Serviços" },
      { href: "/produtos",     label: "Produtos / Insumos" },
      { href: "/funcionarios", label: "Funcionários" },
    ],
  },
  { divider: true },
  {
    group: "Relatórios", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    items: [
      { href: "/relatorios/servicos-realizados", label: "Serviços Realizados" },
      { href: "/relatorios/comissoes",           label: "Comissões" },
      { href: "/relatorios/clientes-frequentes", label: "Clientes Frequentes" },
      { href: "/relatorios/caixa",               label: "Caixa (Entrada/Saída)" },
    ],
  },
  { divider: true },
  { href: "/configuracoes", label: "Configurações", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
];

export default function SidebarClient({ profile }: { profile: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Cadastros: pathname.startsWith("/clientes") || pathname.startsWith("/veiculos") || pathname.startsWith("/servicos") || pathname.startsWith("/produtos") || pathname.startsWith("/funcionarios"),
    Relatórios: pathname.startsWith("/relatorios"),
  });

  function toggleGroup(g: string) {
    setOpenGroups(s => ({ ...s, [g]: !s[g] }));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex flex-col border-r transition-all duration-200"
      style={{ width: collapsed ? 60 : 240, minWidth: collapsed ? 60 : 240, background: "var(--bg-sidebar)", borderColor: "var(--border)" }}>

      {/* Logo */}
      <div className="flex items-center border-b" style={{ borderColor: "var(--border)", minHeight: 72, padding: collapsed ? "0 12px" : "0 16px" }}>
        {collapsed
          ? <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: "var(--primary)" }}>R</div>
          /* eslint-disable-next-line @next/next/no-img-element */
          : <img src="/logo.png" alt="Studio RPM" style={{ width: 150, objectFit: "contain" }} />
        }
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto btn btn-icon btn-ghost flex-shrink-0" style={{ fontSize: 12 }}>
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        {NAV.map((item, i) => {
          if ("divider" in item) return <div key={i} className="my-1.5" style={{ height: 1, background: "var(--border)" }} />;

          if ("group" in item) {
            const isOpen = openGroups[item.group];
            const anyActive = item.items.some(s => pathname.startsWith(s.href));
            return (
              <div key={item.group}>
                <button onClick={() => toggleGroup(item.group)}
                  className={`sidebar-link w-full ${anyActive ? "active" : ""}`}
                  title={collapsed ? item.group : undefined}>
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <>
                    <span className="flex-1 text-left">{item.group}</span>
                    <ChevronIcon open={!!isOpen} />
                  </>}
                </button>
                {!collapsed && isOpen && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-3" style={{ borderColor: "var(--border)" }}>
                    {item.items.map(sub => {
                      const active = pathname.startsWith(sub.href);
                      return (
                        <Link key={sub.href} href={sub.href}
                          className={`sidebar-link text-xs py-1.5 ${active ? "active" : ""}`}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? "var(--primary)" : "var(--border-light)" }} />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} target={item.newTab ? "_blank" : undefined}
              className={`sidebar-link ${active ? "active" : ""}`} title={collapsed ? item.label : undefined}>
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
        {!collapsed && <p className="text-xs mb-2 truncate" style={{ color: "var(--text-subtle)" }}>{profile?.tenants?.nome}</p>}
        <button onClick={handleLogout} className="sidebar-link w-full" style={{ color: "var(--danger)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
