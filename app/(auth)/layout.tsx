export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-bg">
      {/* blobs de luz */}
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />

      <div className="auth-wrapper">
        {/* LOGO */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Studio RPM" className="auth-logo" />

        {/* Card glass */}
        <div className="auth-glass">
          {children}
        </div>

        {/* Rodapé Valora */}
        <div className="auth-footer">
          <span>Desenvolvido por</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/valora-logo.svg" alt="Valora" className="auth-valora" />
        </div>
      </div>
    </div>
  );
}
