"use client";
import { useState } from "react";

const ROLES: Record<string,string> = { owner:"Dono", atendente:"Atendente", tecnico:"Tecnico" };
const ROLE_COLOR: Record<string,string> = { owner:"var(--primary)", atendente:"#3b82f6", tecnico:"#f97316" };

type Usuario = { id:string; nome:string; email:string; role:string; ativo:boolean; created_at:string; ultimo_acesso:string|null };

export default function UsuariosClient({ usuarios: init }: { usuarios: Usuario[] }) {
  const [usuarios, setUsuarios] = useState(init);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome:"", email:"", senha:"", role:"atendente" });
  const set = (k:string, v:string) => setForm(f => ({ ...f, [k]: v }));

  async function criar() {
    if (!form.nome || !form.email || !form.senha) return alert("Preencha nome, e-mail e senha");
    if (form.senha.length < 6) return alert("Senha minimo 6 caracteres");
    setSaving(true);
    const res = await fetch("/api/usuarios", {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); setSaving(false); return; }
    setUsuarios(prev => [...prev, data].sort((a,b) => a.nome.localeCompare(b.nome)));
    setForm({ nome:"", email:"", senha:"", role:"atendente" });
    setShowForm(false);
    setSaving(false);
  }

  async function toggleAtivo(u: Usuario) {
    const res = await fetch("/api/usuarios", {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ id:u.id, role:u.role, ativo:!u.ativo }),
    });
    const data = await res.json();
    if (!data.error) setUsuarios(prev => prev.map(x => x.id===u.id ? {...x, ativo:!u.ativo} : x));
  }

  async function mudarRole(u: Usuario, role: string) {
    const res = await fetch("/api/usuarios", {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ id:u.id, role, ativo:u.ativo }),
    });
    const data = await res.json();
    if (!data.error) setUsuarios(prev => prev.map(x => x.id===u.id ? {...x, role} : x));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color:"var(--text)" }}>Usuarios</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>
            Gerencie quem tem acesso ao sistema. Todos compartilham os mesmos dados do estabelecimento.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "+ Novo Usuario"}
        </button>
      </div>

      <div className="card" style={{ borderLeft:"3px solid #3b82f6", padding:"14px 18px" }}>
        <p className="text-sm" style={{ color:"var(--text)" }}>
          <strong>Como funciona:</strong> crie os logins dos seus funcionarios aqui.
          Eles acessam o sistema em <strong>estetica-app-theta.vercel.app/login</strong> com
          o e-mail e senha definidos abaixo — e enxergam os mesmos dados do seu estabelecimento.
        </p>
      </div>

      {showForm && (
        <div className="card flex flex-col gap-4">
          <h2 className="font-semibold" style={{ color:"var(--text)" }}>Novo Usuario</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="field col-span-2">
              <label className="label">Nome *</label>
              <input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Nome do funcionario" />
            </div>
            <div className="field">
              <label className="label">E-mail *</label>
              <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="field">
              <label className="label">Senha *</label>
              <input className="input" type="password" value={form.senha} onChange={e => set("senha", e.target.value)} placeholder="Minimo 6 caracteres" />
            </div>
            <div className="field col-span-2">
              <label className="label">Perfil de Acesso</label>
              <select className="input" value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="atendente">Atendente - abre OS, cadastra clientes</option>
                <option value="tecnico">Tecnico - executa OS, atualiza status, fotos</option>
                <option value="owner">Dono - acesso total</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-primary" disabled={saving} onClick={criar}>
              {saving ? "Criando..." : "Criar Usuario"}
            </button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid var(--border)", background:"var(--bg-muted)" }}>
              {["Usuario","E-mail","Perfil","Ultimo Acesso","Status",""].map(h => (
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} style={{ borderBottom:"1px solid var(--border)", opacity: u.ativo ? 1 : 0.5 }}>
                <td style={{ padding:"12px 16px", fontWeight:500, color:"var(--text)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background: ROLE_COLOR[u.role]+"22", color: ROLE_COLOR[u.role], display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, flexShrink:0 }}>
                      {u.nome[0]?.toUpperCase()}
                    </div>
                    {u.nome}
                  </div>
                </td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"var(--text-muted)" }}>{u.email}</td>
                <td style={{ padding:"12px 16px" }}>
                  <select value={u.role} onChange={e => mudarRole(u, e.target.value)}
                    style={{ fontSize:12, fontWeight:600, padding:"3px 8px", borderRadius:6, border:"1px solid "+ROLE_COLOR[u.role], color:ROLE_COLOR[u.role], background:ROLE_COLOR[u.role]+"15", cursor:"pointer" }}>
                    <option value="owner">Dono</option>
                    <option value="atendente">Atendente</option>
                    <option value="tecnico">Tecnico</option>
                  </select>
                </td>
                <td style={{ padding:"12px 16px", fontSize:12, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                  {u.ultimo_acesso
                    ? <>
                        <div style={{ fontWeight:600, color:"var(--text)" }}>
                          {new Date(u.ultimo_acesso).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"2-digit" })}
                        </div>
                        <div style={{ fontSize:11 }}>
                          {new Date(u.ultimo_acesso).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}
                        </div>
                      </>
                    : <span style={{ fontStyle:"italic" }}>Nunca</span>
                  }
                </td>
                <td style={{ padding:"12px 16px" }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:12,
                    background: u.ativo ? "#22c55e22" : "#88888822",
                    color: u.ativo ? "var(--success)" : "var(--text-muted)" }}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td style={{ padding:"12px 16px" }}>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize:12 }} onClick={() => toggleAtivo(u)}>
                    {u.ativo ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
