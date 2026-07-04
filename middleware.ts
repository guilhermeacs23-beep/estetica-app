import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const authPaths = ["/login", "/cadastro"];
  const openPaths = ["/orcamento/"]; // acessivel sem login E com login
  const isOpen = openPaths.some((p) => path.startsWith(p));
  const isAuth = authPaths.some((p) => path.startsWith(p));

  if (!user && !isAuth && !isOpen) return NextResponse.redirect(new URL("/login", request.url));
  if (user && isAuth) return NextResponse.redirect(new URL("/dashboard", request.url));

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|api/|.*[.]png|.*[.]jpg|.*[.]jpeg|.*[.]svg|.*[.]webp|.*[.]ico|.*[.]gif|.*[.]xlsx).*)"],
};
