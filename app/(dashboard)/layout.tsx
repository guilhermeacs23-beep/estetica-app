import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import SidebarClient from "@/components/SidebarClient";
import MobileHeader from "@/components/MobileHeader";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("*, tenants(*)").eq("id", user.id).single();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <SidebarClient profile={profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}>
          <MobileHeader />
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{profile?.nome}</p>
              <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{profile?.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm text-white" style={{ background: "var(--primary)" }}>
              {profile?.nome?.[0]?.toUpperCase() ?? "U"}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
