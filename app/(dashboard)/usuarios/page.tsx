import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import UsuariosClient from "./UsuariosClient";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles")
    .select("tenant_id, role").eq("id", user!.id).single();
  if (profile?.role !== "owner") redirect("/dashboard");
  const [{ data: usuarios }, { data: { users: authUsers } }] = await Promise.all([
    supabaseAdmin.from("profiles")
      .select("id, nome, email, role, ativo, created_at")
      .eq("tenant_id", profile!.tenant_id)
      .order("nome"),
    supabaseAdmin.auth.admin.listUsers({ perPage: 200 }),
  ]);

  const lastSignIn: Record<string, string|null> = {};
  for (const u of authUsers ?? []) {
    lastSignIn[u.id] = u.last_sign_in_at ?? null;
  }

  const usuariosComAcesso = (usuarios ?? []).map(u => ({
    ...u,
    last_sign_in_at: lastSignIn[u.id] ?? null,
  }));

  return <UsuariosClient usuarios={usuariosComAcesso} />;
}
