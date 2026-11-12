import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import WhatsAppClient from "@/components/WhatsAppClient";

// Área do WhatsApp: abre direto nas conversas. As configurações de mensagens
// (conexão, teste e textos automáticos) ficam numa aba ao lado, só para o dono.
export default async function WhatsAppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user!.id).single();
  return (
    <Suspense>
      <WhatsAppClient podeConfigurar={profile?.role === "owner"} />
    </Suspense>
  );
}
