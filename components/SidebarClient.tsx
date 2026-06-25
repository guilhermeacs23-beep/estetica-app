"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard",           label: "Dashboard",          icon: "📊" },
  { href: "/dashboard-financeiro",label: "Financeiro",         icon: "💰" },
  { href: "/ordens-de-servico",   label: "Ordens de Serviço",  icon: "🔧" },
  { href: "/agenda",              label: "Agenda",             icon: "📅" },
  { href: "/painel-tv",           label: "Painel TV",          icon: "📺", newTab: true },
  { divider: true },
  { href: "/clientes",            label: "Clientes",           icon: "👤" },
  { href: "/veiculos",            label: "Veículos",           icon: "🚗" },
  { href: "/servicos",            label: "Serviços",           icon: "⚙️" },
  { href: "/funcionarios",        label: "Funcionários",       icon: "👷" },
  { divider: true },
  { href: "/relatorios",          label: "Relatórios",         icon: "📈" },
  { href: "/configuracoes",       label: "Configurações",      icon: "⚙️" },
];

export default function SidebarClient({ profile }: { profile: any }) {
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
      style={{
        width: collapsed ? 60 : 240,
        background: "var(--bg-sidebar)",
        borderColor: "var(--border)",
        minWidth: collapsed ? 60 : 240,
      }}
    >
      {/* Logo */}
      <div className="flex items-center border-b" style={{ borderColor: "var(--border)", minHeight: 72, padding: collapsed ? "0 12px" : "0 16px" }}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: "var(--primary)" }}>R</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.png" alt="Studio RPM" style={{ width: 150, objectFit: "contain" }} />
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto btn btn-icon btn-ghost flex-shrink-0" style={{ fontSize: 12 }}>
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        {NAV.map((item, i) => {
          if ("divider" in item) return <div key={i} className="my-2" style={{ height: 1, background: "var(--border)" }} />;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              target={item.newTab ? "_blank" : undefined}
              className={`sidebar-link ${active ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0 text-base">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Tenant + Logout */}
      <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
        {!collapsed && (
          <p className="text-xs mb-2 truncate" style={{ color: "var(--text-subtle)" }}>
            {profile?.tenants?.nome}
          </p>
        )}
        <button onClick={handleLogout} className="sidebar-link w-full" style={{ color: "var(--danger)" }}>
          <span>🚪</span>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
