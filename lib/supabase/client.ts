import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // Sem maxAge/expires = session cookie: apaga ao fechar o browser
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    }
  );
}
