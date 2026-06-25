import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function RelComissoesPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Comissões</h1>
        <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>Para ativar, defina o percentual de comissão ao abrir uma OS e vincule o funcionário responsável.</p>
      </div>
      <div className="card text-center py-10" style={{ color:"var(--text-muted)" }}>
        <p className="text-4xl mb-3">💼</p>
        <p className="font-medium" style={{ color:"var(--text)" }}>Em breve</p>
        <p className="text-sm mt-1">Cadastre funcionários e vincule às OSs para ver as comissões aqui.</p>
      </div>
    </div>
  );
}
