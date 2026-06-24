import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-md flex flex-col items-center">

        {/* LOGO */}
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Studio RPM"
            width={260}
            height={90}
            priority
            className="mx-auto"
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Card de login/cadastro */}
        {children}

        {/* Rodapé Valora */}
        <div
          className="mt-8 flex flex-col items-center gap-1"
          style={{ color: "var(--text-subtle)" }}
        >
          <span className="text-xs">Desenvolvido por</span>
          <Image
            src="/valora-logo.svg"
            alt="Valora Business Technology"
            width={120}
            height={36}
            style={{ objectFit: "contain", opacity: 0.7 }}
          />
        </div>
      </div>
    </div>
  );
}
