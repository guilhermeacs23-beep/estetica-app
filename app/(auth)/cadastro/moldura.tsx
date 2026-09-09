/* A moldura que era do layout de (auth). Ficou so para o cadastro: o login
   agora usa a do nucleo. Preservada como estava, inclusive a logo. */
export default function MolduraCadastro({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-bg">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />

      <div className="auth-wrapper">
        {/* LOGO — mix-blend-mode:screen elimina o fundo preto do PNG */}
        <div className="auth-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Studio RPM"
            className="auth-logo"
          />
        </div>

        <div className="auth-glass">
          {children}
        </div>

        {/* Rodapé Valora */}
        <div className="auth-footer">
          <span>Desenvolvido por</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/valora-logo.png"
            alt="Valora Business Technology"
            className="auth-valora"
          />
        </div>
      </div>
    </div>
  );
}
