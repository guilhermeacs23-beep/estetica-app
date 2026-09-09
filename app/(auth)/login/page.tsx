"use client";
import { useRouter } from "next/navigation";
import { LoginValora } from "valora-nucleo";
import { createClient } from "@/lib/supabase/client";

/**
 * A tela vem do núcleo — a mesma porta do Studio J.C, do Lead+ e do Rustic.
 * Aqui fica só o que é do RPM: quem autentica e para onde vai depois.
 */
export default function LoginPage() {
  const router = useRouter();

  async function entrar(email: string, senha: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return "E-mail ou senha incorretos.";
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <LoginValora
      produto="Studio RPM"
      tagline="Ordens de serviço, veículos e equipe"
      onEntrar={entrar}
      hrefCriarConta="/cadastro"
    />
  );
}
