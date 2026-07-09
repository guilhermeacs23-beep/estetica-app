import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import VeiculosClient from "./VeiculosClient";

export default async function VeiculosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("tenant_id, role").eq("id", user.id).single();

  const { data: veiculos } = await supabaseAdmin
    .from("veiculos")
    .select("id, placa, modelo, marca, cor, ano, km, tipo_veiculo, categoria, obs, cliente_id, clientes(nome, telefone)")
    .eq("tenant_id", profile!.tenant_id)
    .order("created_at", { ascending: false });

  return <VeiculosClient veiculos={veiculos ?? []} tenantId={profile!.tenant_id} />;
}
