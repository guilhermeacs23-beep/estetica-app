export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full flex flex-col items-center" style={{ maxWidth: "360px" }}>

        {/* LOGO */}
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Studio RPM"
            style={{ width: "220px", objectFit: "contain" }}
          />
        </div>

        {/* Card */}
        {children}

        {/* Rodapé Valora */}
        <div className="mt-8 flex flex-col items-center gap-1" style={{ color: "var(--text-subtle)" }}>
          <span className="text-xs">Desenvolvido por</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/valora-logo.svg"
            alt="Valora Business Technology"
            style={{ width: "130px", opacity: 0.75, objectFit: "contain" }}
          />
        </div>
      </div>
    </div>
  );
}
