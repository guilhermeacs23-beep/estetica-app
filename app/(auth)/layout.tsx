export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: "var(--primary)" }}>
              R
            </div>
            <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>Studio RPM</span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Gestão de Estética Automotiva</p>
        </div>
        {children}
      </div>
    </div>
  );
}
