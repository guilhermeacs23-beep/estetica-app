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

  const { data: usuarios } = await supabaseAdmin
    .from("profiles")
    .select("id, nome, email, role, ativo, created_at, ultimo_acesso")
    .eq("tenant_id", profile!.tenant_id)
    .order("nome");

  return <UsuariosClient usuarios={usuarios ?? []} />;
}
