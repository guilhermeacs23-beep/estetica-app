"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard",            label: "Dashboard",          icon: "D" },
  { href: "/dashboard-financeiro", label: "Financeiro",         icon: "F" },
  { href: "/ordens-de-servico",    label: "Ordens de Servico",  icon: "O" },
  { href: "/agenda",               label: "Agenda",             icon: "A" },
  { href: "https://estetica-app-theta.vercel.app/painel-tv", label: "Painel TV", icon: "T", newTab: true },
  { divider: true },
  { href: "/clientes",             label: "Clientes",           icon: "C" },
  { href: "/veiculos",             label: "Veiculos",           icon: "V" },
  { href: "/servicos",             label: "Servicos",           icon: "S" },
  { href: "/funcionarios",         label: "Funcionarios",       icon: "F" },
  { href: "/produtos",             label: "Produtos / Insumos", icon: "P" },
  { href: "/orcamentos",           label: "Orcamentos",         icon: "O" },
  { href: "/clientes/recap",       label: "Recap de Clientes",  icon: "R" },
  { href: "/importar",             label: "Importar Clientes",  icon: "I" },
  { divider: true },
  { href: "/usuarios",             label: "Usuarios",           icon: "U" },
  { href: "/relatorios",           label: "Relatorios",         icon: "R" },
  { href: "/configuracoes",        label: "Configuracoes",      icon: "C" },
  { href: "/configuracoes?aba=whatsapp", label: "WhatsApp",     icon: "W" },
];

export default function SidebarClient({ profile, logoUrl, nomeLoja }: { profile: Record<string, unknown>; logoUrl?: string|null; nomeLoja?: string|null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="hidden md:flex flex-col border-r transition-all duration-200"
      style={{ width: collapsed ? 60 : 240, minWidth: collapsed ? 60 : 240, background: "var(--bg-sidebar)", borderColor: "var(--border)" }}
    >
      <div className="h-14 flex items-center px-3 border-b gap-2" style={{ borderColor: "var(--border)" }}>
        <Link href="/dashboard" className="flex items-center gap-2 flex-1 min-w-0" style={{ textDecoration: "none" }} title="Voltar ao Dashboard">
          {collapsed ? (
            <div className="rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ width:36, height:36, fontSize:18, background:"var(--primary)" }}>
              {(nomeLoja ?? ((profile as any)?.tenants?.nome_fantasia as string) ?? "R")[0]?.toUpperCase()}
            </div>
          ) : (
            <img
              src={logoUrl ?? "/logo.png"}
              alt={nomeLoja ?? "Logo"}
              style={{ height:44, width:"auto", objectFit:"contain", maxWidth:156, borderRadius:4 }}
            />
          )}
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto flex-shrink-0" style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        {NAV.map((item, i) => {
          if ("divider" in item) return <div key={i} style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} target={item.newTab ? "_blank" : undefined}
              className={`sidebar-link ${active ? "active" : ""}`} title={collapsed ? item.label : undefined}>
              <span className="w-5 h-5 rounded text-xs flex items-center justify-center font-bold flex-shrink-0"
                style={{ background: active ? "var(--primary)" : "var(--surface)", color: active ? "white" : "var(--text-muted)" }}>
                {item.icon}
              </span>
              {!collapsed && <span style={{ fontSize: 13 }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
        {!collapsed && (
          <p className="text-xs mb-2 truncate" style={{ color: "var(--text-muted)" }}>
            {(profile?.tenants as Record<string, unknown>)?.nome as string}
          </p>
        )}
        <button onClick={handleLogout} className="sidebar-link w-full" style={{ color: "var(--danger)" }}>
          <span style={{ fontSize: 13 }}>X</span>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
