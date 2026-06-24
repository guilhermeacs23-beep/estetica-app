import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import OSDetalheClient from "@/components/OSDetalheClient";
import { notFound } from "next/navigation";

export default async function OSDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("tenant_id, role").eq("id", user!.id).single();

  const { data: os } = await supabaseAdmin.from("ordens_servico")
    .select(`*, clientes(id, nome, telefone, whatsapp, email), veiculos(id, placa, modelo, marca, cor, ano),
      os_servicos(*, funcionarios(nome)), os_fotos(*), formas_pagamento(nome)`)
    .eq("id", id).eq("tenant_id", profile!.tenant_id).single();

  if (!os) notFound();

  const { data: funcionarios } = await supabaseAdmin.from("funcionarios")
    .select("id, nome").eq("tenant_id", profile!.tenant_id).eq("ativo", true);

  return <OSDetalheClient os={os} profile={profile} funcionarios={funcionarios ?? []} />;
}
