"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavItem =
  | { href: string; label: string; icon: string; newTab?: boolean }
  | { section: string }
  | { divider: true };

const NAV: NavItem[] = [
  { section: "Operacao" },
  { href: "/dashboard",            label: "Dashboard",         icon: "D" },
  { href: "/ordens-de-servico",    label: "OS",                icon: "O" },
  { href: "/agenda",               label: "Agenda",            icon: "A" },
  { href: "https://estetica-app-theta.vercel.app/painel-tv", label: "Painel TV", icon: "T", newTab: true },

  { section: "Clientes" },
  { href: "/clientes",             label: "Clientes",          icon: "C" },
  { href: "/veiculos",             label: "Veiculos",          icon: "V" },
  { href: "/clientes/recap",       label: "Recap",             icon: "R" },
  { href: "/configuracoes?aba=whatsapp", label: "WhatsApp",    icon: "W" },
  { href: "/importar",             label: "Importar",          icon: "I" },

  { section: "Financeiro" },
  { href: "/dashboard-financeiro", label: "Financeiro",        icon: "F" },
  { href: "/orcamentos",           label: "Orcamentos",        icon: "O" },
  { href: "/relatorios",           label: "Relatorios",        icon: "R" },

  { section: "Cadastros" },
  { href: "/servicos",             label: "Servicos",          icon: "S" },
  { href: "/funcionarios",         label: "Funcionarios",      icon: "F" },
  { href: "/produtos",             label: "Produtos",          icon: "P" },

  { section: "Sistema" },
  { href: "/usuarios",             label: "Usuarios",          icon: "U" },
  { href: "/configuracoes",        label: "Configuracoes",     icon: "C" },
];

export default function SidebarClient({ profile, logoUrl, nomeLoja }: { profile: Record<string, unknown>; logoUrl?: string|null; nomeLoja?: string|null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const lojaName = nomeLoja ?? ((profile?.tenants as any)?.nome_fantasia as string) ?? "Studio RPM";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="hidden md:flex flex-col border-r transition-all duration-200"
      style={{ width: collapsed ? 60 : 220, minWidth: collapsed ? 60 : 220, background: "var(--bg-sidebar)", borderColor: "var(--border)" }}
    >
      <div className="h-14 flex items-center px-3 border-b gap-2" style={{ borderColor: "var(--border)" }}>
        <Link href="/dashboard" className="flex items-center gap-2 flex-1 min-w-0" style={{ textDecoration: "none" }} title="Dashboard">
          {collapsed ? (
            <div className="rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ width:36, height:36, fontSize:18, background:"var(--primary)" }}>
              {lojaName[0]?.toUpperCase()}
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:"var(--primary)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:"#fff", fontWeight:800, fontSize:14 }}>{lojaName[0]?.toUpperCase()}</span>
              </div>
              <span className="truncate" style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>{lojaName}</span>
            </div>
          )}
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto flex-shrink-0"
          style={{ color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", fontSize:12 }}>
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-0.5">
        {NAV.map((item, i) => {
          if ("section" in item) {
            if (collapsed) {
              return <div key={i} style={{ height:1, background:"var(--border)", margin:"6px 4px" }} />;
            }
            return (
              <div key={i} style={{ fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
                color:"var(--text-muted)", padding:"10px 6px 3px", opacity:0.55 }}>
                {item.section}
              </div>
            );
          }
          if ("divider" in item) {
            return <div key={i} style={{ height:1, background:"var(--border)", margin:"4px 0" }} />;
          }
          const it = item as { href: string; label: string; icon: string; newTab?: boolean };
          const isExact = it.href === "/dashboard" || it.href.includes("?");
          const active = pathname === it.href || (!isExact && pathname.startsWith(it.href));
          return (
            <Link key={it.href + i} href={it.href} target={it.newTab ? "_blank" : undefined}
              className={"sidebar-link" + (active ? " active" : "")} title={collapsed ? it.label : undefined}>
              <span className="w-5 h-5 rounded text-xs flex items-center justify-center font-bold flex-shrink-0"
                style={{ background: active ? "var(--primary)" : "var(--surface)", color: active ? "white" : "var(--text-muted)" }}>
                {it.icon}
              </span>
              {!collapsed && <span style={{ fontSize:13 }}>{it.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3" style={{ borderColor:"var(--border)" }}>
        {!collapsed && (
          <p className="text-xs mb-2 truncate" style={{ color:"var(--text-muted)" }}>
            {(profile?.tenants as Record<string, unknown>)?.nome as string}
          </p>
        )}
        <button onClick={handleLogout} className="sidebar-link w-full" style={{ color:"var(--danger)" }}>
          <span style={{ fontSize:13 }}>X</span>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
