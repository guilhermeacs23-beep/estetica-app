import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: "var(--bg)" }}>
      <header className="sticky top-0 z-10 h-14 flex items-center px-4 border-b" style={{ background: "var(--bg-sidebar)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--primary)" }}>R</div>
          <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>Studio RPM · Técnico</span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 h-16 flex items-center border-t z-10" style={{ background: "var(--bg-sidebar)", borderColor: "var(--border)" }}>
        {[
          { href: "/tecnico", label: "OS do Dia", icon: "🔧" },
          { href: "/tecnico/finalizar", label: "Finalizar", icon: "✅" },
          { href: "/dashboard", label: "Desktop", icon: "🖥️" },
        ].map(item => (
          <a key={item.href} href={item.href} className="flex-1 flex flex-col items-center gap-1 py-2">
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
