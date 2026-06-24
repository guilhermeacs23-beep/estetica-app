import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import TecnicoOSClient from "@/components/TecnicoOSClient";
import { notFound } from "next/navigation";

export default async function TecnicoOSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.schema("rpm").from("profiles").select("tenant_id, role").eq("id", user!.id).single();

  const { data: os } = await supabaseAdmin.schema("rpm").from("ordens_servico")
    .select("*, clientes(nome, whatsapp), veiculos(placa, modelo, cor), os_servicos(nome), os_fotos(*)")
    .eq("id", id).eq("tenant_id", profile!.tenant_id).single();

  if (!os) notFound();
  return <TecnicoOSClient os={os} />;
}
