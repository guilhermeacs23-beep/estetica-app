"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function MobileHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/dashboard";

  return (
    <div className="flex items-center gap-2 md:hidden">
      {!isHome && (
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
          aria-label="Voltar"
        >
          ←
        </button>
      )}
      <Link href="/dashboard" className="flex items-center gap-2 no-underline">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs"
          style={{ background: "var(--primary)" }}
        >
          R
        </div>
        <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
          Studio RPM
        </span>
      </Link>
    </div>
  );
}
