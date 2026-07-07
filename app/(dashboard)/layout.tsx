import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import SidebarClient from "@/components/SidebarClient";
import MobileHeader from "@/components/MobileHeader";
import ThemeToggle from "@/components/ThemeToggle";
import OnboardingWizard from "@/components/OnboardingWizard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("*, tenants(*)").eq("id", user.id).single();
  const { data: config } = await supabaseAdmin
    .from("configuracoes").select("cor_primaria, onboarding_completo, logo_url, nome_fantasia").eq("tenant_id", profile!.tenant_id).single();
  const corPrimaria = config?.cor_primaria ?? "#c0392b";
  const onboardingOk = config?.onboarding_completo ?? false;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)", ["--primary" as any]: corPrimaria }}>
      {!onboardingOk && profile?.role === "owner" && <OnboardingWizard tenantId={profile.tenant_id} />}
      <SidebarClient profile={profile} logoUrl={config?.logo_url ?? null} nomeLoja={config?.nome_fantasia ?? null} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}>
          <MobileHeader />
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
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
