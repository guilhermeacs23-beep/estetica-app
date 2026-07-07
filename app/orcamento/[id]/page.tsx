import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";

export default async function OrcamentoPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: o } = await supabaseAdmin
    .from("orcamentos")
    .select("*, clientes(nome, telefone, whatsapp, email), orcamento_servicos(id, servico_nome, descricao, preco, quantidade)")
    .eq("id", id)
    .single();

  if (!o) return notFound();

  const { data: config } = await supabaseAdmin
    .from("configuracoes")
    .select("nome_fantasia, telefone, whatsapp, email, cidade, instagram")
    .eq("tenant_id", o.tenant_id)
    .single();

  const nomeLoja    = config?.nome_fantasia ?? "Studio RPM";
  const nomeCliente = o.clientes?.nome ?? o.nome_avulso ?? "";
  const placa       = o.placa_avulsa ?? "";
  const modelo      = o.modelo_avulso ?? "";
  const itens: any[] = o.orcamento_servicos ?? [];
  const subtotal    = itens.reduce((s: number, i: any) => s + (Number(i.preco) * (i.quantidade ?? 1)), 0);
  const desconto    = Number(o.desconto ?? 0);
  const total       = Number(o.valor_total ?? (subtotal - desconto));
  const validade    = o.validade ? new Date(o.validade + "T12:00").toLocaleDateString("pt-BR") : "";
  const emitido     = new Date(o.created_at).toLocaleDateString("pt-BR");
  const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    pendente:  { label: "Pendente",  color: "#b45309", bg: "#fef3c7" },
    aprovado:  { label: "Aprovado",  color: "#065f46", bg: "#d1fae5" },
    recusado:  { label: "Recusado",  color: "#991b1b", bg: "#fee2e2" },
    expirado:  { label: "Expirado",  color: "#6b7280", bg: "#f3f4f6" },
  };
  const st = STATUS[o.status] ?? STATUS.pendente;

  const itensJson = JSON.stringify(itens.map((i: any) => ({
    nome: i.servico_nome,
    desc: i.descricao ?? "",
    preco: Number(i.preco),
    qtd: i.quantidade ?? 1,
  })));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box }
        html { font-size:15px }
        body { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#0f0f0f; color:#1a1a1a; min-height:100vh; }

        /* ── Topbar ── */
        .topbar {
          position:sticky; top:0; z-index:50;
          background:rgba(15,15,15,0.95); backdrop-filter:blur(12px);
          border-bottom:1px solid #2a2a2a;
          padding:12px 20px;
          display:flex; gap:10px; justify-content:center; align-items:center; flex-wrap:wrap;
        }
        .btn-a4 {
          display:flex; align-items:center; gap:8px;
          background:#c0392b; color:#fff; border:none; border-radius:8px;
          padding:10px 20px; font-size:13px; font-weight:700; cursor:pointer;
        }
        .btn-a4:hover { background:#a93226 }
        .btn-notinha {
          display:flex; align-items:center; gap:8px;
          background:#1a6e3b; color:#fff; border:none; border-radius:8px;
          padding:10px 20px; font-size:13px; font-weight:700; cursor:pointer;
        }
        .btn-notinha:hover { background:#155c30 }
        .btn-link {
          display:flex; align-items:center; gap:8px;
          background:transparent; color:#ccc; border:1px solid #3a3a3a; border-radius:8px;
          padding:10px 18px; font-size:13px; font-weight:600; cursor:pointer;
        }
        .btn-link:hover { border-color:#666; color:#fff }
        /* Selecionar campos */
        .sel-wrap { position:relative }
        .btn-sel {
          display:flex; align-items:center; gap:8px;
          background:transparent; color:#ccc; border:1px solid #3a3a3a; border-radius:8px;
          padding:10px 14px; font-size:13px; font-weight:600; cursor:pointer;
        }
        .btn-sel:hover { border-color:#666; color:#fff }
        .sel-dropdown {
          display:none; position:absolute; top:calc(100% + 8px); right:0;
          background:#1a1a1a; border:1px solid #333; border-radius:12px;
          padding:16px; min-width:220px; z-index:100;
          box-shadow:0 8px 32px rgba(0,0,0,0.5);
        }
        .sel-dropdown.open { display:block }
        .sel-item { display:flex; align-items:center; gap:10px; padding:8px 0; cursor:pointer; border-bottom:1px solid #2a2a2a; }
        .sel-item:last-child { border-bottom:none }
        .sel-item label { font-size:13px; color:#ccc; cursor:pointer; flex:1 }
        .sel-item input[type=checkbox] { width:16px; height:16px; cursor:pointer; accent-color:#c0392b }
        .sel-title { font-size:10px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px }

        /* ── A4 page ── */
        .page-a4 {
          max-width:780px; margin:28px auto; background:#fff;
          border-radius:16px; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,0.6);
        }
        .hdr {
          background:linear-gradient(135deg,#111 60%,#1e1e1e 100%);
          padding:36px 40px 32px; display:flex; align-items:flex-start; justify-content:space-between; gap:16px;
          position:relative; overflow:hidden;
        }
        .hdr::before { content:""; position:absolute; right:-40px; top:-40px; width:220px; height:220px; background:radial-gradient(circle,rgba(192,57,43,0.18) 0%,transparent 70%); border-radius:50%; }
        .logo-mark { width:52px; height:52px; flex-shrink:0; background:#c0392b; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:22px; color:#fff; box-shadow:0 4px 16px rgba(192,57,43,0.4); }
        .hdr-brand { display:flex; align-items:center; gap:16px }
        .brand-name { font-size:22px; font-weight:800; color:#fff; letter-spacing:-0.3px }
        .brand-sub  { font-size:11px; color:#888; margin-top:3px; letter-spacing:0.5px; text-transform:uppercase }
        .hdr-num { text-align:right; position:relative; z-index:1 }
        .hdr-num .label { font-size:10px; color:#666; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:4px }
        .hdr-num .num   { font-size:36px; font-weight:900; color:#c0392b; line-height:1; letter-spacing:-1px }
        .statusbar { background:#f8f8f8; border-bottom:1px solid #ebebeb; padding:14px 40px; display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
        .badge { font-size:11px; font-weight:700; padding:4px 12px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; }
        .meta-item { font-size:12px; color:#777; display:flex; align-items:center; gap:5px }
        .meta-item strong { color:#333; font-weight:600 }
        .sep { color:#ddd; font-size:14px }
        .body-a4 { padding:36px 40px }
        .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:36px }
        .info-card { border:1px solid #e8e8e8; border-radius:12px; padding:20px 22px; background:#fafafa; }
        .ic-label { font-size:9px; font-weight:800; color:#999; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
        .ic-label::before { content:""; display:inline-block; width:3px; height:12px; background:#c0392b; border-radius:2px; }
        .ic-name { font-size:17px; font-weight:700; color:#111; margin-bottom:6px }
        .ic-detail { font-size:12px; color:#777; line-height:1.6 }
        .ic-placa { font-size:24px; font-weight:900; color:#c0392b; letter-spacing:2px; margin-bottom:4px; }
        .ic-modelo { font-size:14px; font-weight:500; color:#555 }
        .sec-title { font-size:9px; font-weight:800; color:#aaa; text-transform:uppercase; letter-spacing:2px; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
        .sec-title::after { content:""; flex:1; height:1px; background:#e8e8e8; }
        .servicos-table { width:100%; border-collapse:collapse; margin-bottom:4px }
        .servicos-table thead tr { border-bottom:2px solid #111; }
        .servicos-table th { font-size:10px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:0.5px; padding:10px 12px; text-align:left; }
        .servicos-table th:not(:first-child) { text-align:right }
        .servicos-table td { padding:16px 12px; border-bottom:1px solid #f0f0f0; vertical-align:top; }
        .servicos-table tr:last-child td { border-bottom:none }
        .servico-nome { font-size:14px; font-weight:700; color:#111; margin-bottom:4px }
        .servico-desc { font-size:12px; color:#888; line-height:1.5; max-width:340px }
        .td-right { text-align:right; font-size:13px; color:#444; white-space:nowrap }
        .td-total { text-align:right; font-size:14px; font-weight:700; color:#111; white-space:nowrap }
        .totais { margin-top:20px; border-top:1px solid #ebebeb; padding-top:16px }
        .trow { display:flex; justify-content:space-between; align-items:center; font-size:13px; color:#777; padding:5px 0; }
        .trow.desc-row { color:#c0392b }
        .trow.total-row { font-size:22px; font-weight:900; color:#111; padding-top:14px; margin-top:8px; border-top:2px solid #111; }
        .trow.total-row span:last-child { color:#c0392b }
        .obs-box { margin-top:28px; padding:18px 22px; background:#fffbf0; border:1px solid #f0e0a0; border-radius:12px; border-left:4px solid #f59e0b; }
        .obs-box .obs-label { font-size:10px; font-weight:800; color:#92400e; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px }
        .obs-box p { font-size:13px; color:#78350f; line-height:1.6 }
        .footer { margin-top:40px; background:#111; padding:28px 40px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; }
        .footer-brand { font-size:13px; font-weight:700; color:#fff }
        .footer-sub { font-size:11px; color:#666; margin-top:2px }
        .footer-validity { font-size:12px; color:#888; text-align:right }
        .footer-validity strong { color:#fff }

        /* ── Notinha ── */
        .page-notinha { display:none; }
        .notinha-wrap {
          width:320px; margin:28px auto; background:#fff;
          border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,0.5);
          font-family:"Courier New", monospace; font-size:12px; color:#000;
          overflow:hidden;
        }
        .notinha-top {
          background:#111; padding:18px 16px 14px; text-align:center;
        }
        .notinha-top .n-logo { font-size:16px; font-weight:900; color:#fff; letter-spacing:1px }
        .notinha-top .n-sub { font-size:10px; color:#888; margin-top:2px; text-transform:uppercase; letter-spacing:0.5px }
        .notinha-divider { border:none; border-top:1px dashed #ccc; margin:8px 0 }
        .notinha-body { padding:14px 16px }
        .n-row { display:flex; justify-content:space-between; margin:3px 0; font-size:11px }
        .n-label { color:#555; flex-shrink:0; margin-right:8px }
        .n-val { font-weight:700; color:#111; text-align:right }
        .n-section-title {
          font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px;
          color:#888; margin:10px 0 6px; text-align:center;
          border-top:1px dashed #ddd; border-bottom:1px dashed #ddd; padding:4px 0;
        }
        .n-item { margin:6px 0; border-bottom:1px dotted #eee; padding-bottom:6px }
        .n-item:last-child { border-bottom:none }
        .n-item-nome { font-weight:700; font-size:12px; color:#000 }
        .n-item-desc { font-size:10px; color:#777; margin-top:1px; line-height:1.4 }
        .n-item-total { display:flex; justify-content:space-between; font-size:11px; margin-top:3px }
        .n-total-box {
          background:#111; color:#fff; padding:10px 16px;
          display:flex; justify-content:space-between; align-items:center;
        }
        .n-total-label { font-size:11px; text-transform:uppercase; letter-spacing:1px }
        .n-total-val { font-size:18px; font-weight:900; color:#c0392b }
        .n-footer { padding:10px 16px 14px; text-align:center; font-size:10px; color:#999; line-height:1.6; border-top:1px dashed #ddd }
        .n-status { display:inline-block; font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px; margin:4px 0 8px }

        /* ── Print media ── */
        @media print {
          .topbar { display:none }
          body { background:#fff }
          .page-a4 { margin:0; border-radius:0; box-shadow:none }
          .hdr { -webkit-print-color-adjust:exact; print-color-adjust:exact }
          .footer { -webkit-print-color-adjust:exact; print-color-adjust:exact }
          .page-notinha { display:none }

          body.mode-notinha .page-a4 { display:none }
          body.mode-notinha .page-notinha { display:block }
          body.mode-notinha .notinha-wrap { margin:0; width:100%; border-radius:0; box-shadow:none }
          body.mode-notinha .notinha-top { -webkit-print-color-adjust:exact; print-color-adjust:exact }
          body.mode-notinha .n-total-box { -webkit-print-color-adjust:exact; print-color-adjust:exact }
          body.mode-notinha .n-total-val { color:#c0392b !important; -webkit-print-color-adjust:exact; print-color-adjust:exact }
        }

        @media (max-width:600px) {
          .hdr { padding:24px 20px 20px }
          .body-a4 { padding:24px 20px }
          .statusbar { padding:12px 20px }
          .info-grid { grid-template-columns:1fr }
          .hdr-num .num { font-size:28px }
          .footer { padding:20px }
        }

        /* hide/show controlled by JS */
        .field-desc.hidden, .field-obs.hidden, .field-contact.hidden { display:none !important }
      `}} />

      {/* TOPBAR */}
      <div className="topbar">
        <button className="btn-a4" id="btn-a4">🖨️ Imprimir A4</button>
        <button className="btn-notinha" id="btn-notinha">🧾 Imprimir Notinha</button>
        <button className="btn-link" id="btn-copy">📋 Copiar Link</button>
        <div className="sel-wrap">
          <button className="btn-sel" id="btn-sel">⚙️ Campos ▾</button>
          <div className="sel-dropdown" id="sel-dropdown">
            <div className="sel-title">Incluir no orçamento</div>
            <label className="sel-item"><input type="checkbox" id="chk-desc" checked /> <label htmlFor="chk-desc">Descrições dos serviços</label></label>
            <label className="sel-item"><input type="checkbox" id="chk-obs" checked /> <label htmlFor="chk-obs">Observações</label></label>
            <label className="sel-item"><input type="checkbox" id="chk-contact" checked /> <label htmlFor="chk-contact">Contato do cliente</label></label>
          </div>
        </div>
      </div>

      {/* A4 PAGE */}
      <div className="page-a4">
        <div className="hdr">
          <div className="hdr-brand">
            <div className="logo-mark">R</div>
            <div>
              <div className="brand-name">{nomeLoja}</div>
              <div className="brand-sub">Estética Automotiva</div>
            </div>
          </div>
          <div className="hdr-num">
            <div className="label">Orçamento</div>
            <div className="num">#{o.numero}</div>
          </div>
        </div>
        <div className="statusbar">
          <span className="badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
          <span className="sep">·</span>
          <span className="meta-item">Emitido em <strong>{emitido}</strong></span>
          {validade && <><span className="sep">·</span><span className="meta-item">Válido até <strong>{validade}</strong></span></>}
        </div>
        <div className="body-a4">
          <div className="info-grid">
            <div className="info-card">
              <div className="ic-label">Cliente</div>
              <div className="ic-name">{nomeCliente || "—"}</div>
              <div className="ic-detail field-contact">
                {o.clientes?.telefone && <div>📞 {o.clientes.telefone}</div>}
                {o.clientes?.whatsapp && <div>💬 {o.clientes.whatsapp}</div>}
                {o.clientes?.email && <div>✉️ {o.clientes.email}</div>}
              </div>
            </div>
            <div className="info-card">
              <div className="ic-label">Veículo</div>
              {placa
                ? <><div className="ic-placa">{placa}</div><div className="ic-modelo">{modelo || "—"}</div></>
                : <div className="ic-detail" style={{ color:"#bbb" }}>Não informado</div>
              }
            </div>
          </div>
          <div className="sec-title">Serviços</div>
          <table className="servicos-table">
            <thead>
              <tr>
                <th style={{ width:"50%" }}>Serviço / Descrição</th>
                <th>Qtd</th>
                <th>Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody id="a4-servicos">
              {itens.length === 0
                ? <tr><td colSpan={4} style={{ textAlign:"center", color:"#bbb", padding:"28px" }}>Nenhum serviço</td></tr>
                : itens.map((it: any) => (
                    <tr key={it.id}>
                      <td>
                        <div className="servico-nome">{it.servico_nome}</div>
                        {it.descricao && <div className="servico-desc field-desc">{it.descricao}</div>}
                      </td>
                      <td className="td-right">{it.quantidade ?? 1}</td>
                      <td className="td-right">{fmt(Number(it.preco))}</td>
                      <td className="td-total">{fmt(Number(it.preco) * (it.quantidade ?? 1))}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
          <div className="totais">
            <div className="trow"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {desconto > 0 && <div className="trow desc-row"><span>Desconto</span><span>− {fmt(desconto)}</span></div>}
            <div className="trow total-row"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
          {o.observacoes && (
            <div className="obs-box field-obs">
              <div className="obs-label">Observações</div>
              <p>{o.observacoes}</p>
            </div>
          )}
        </div>
        <div className="footer">
          <div>
            <div className="footer-brand">{nomeLoja}</div>
            <div className="footer-sub">
              {config?.whatsapp && <span>📱 {config.whatsapp}</span>}
              {config?.instagram && <span style={{ marginLeft: 12 }}>📸 {config.instagram}</span>}
            </div>
          </div>
          <div className="footer-validity">
            {validade && <div>Válido até <strong>{validade}</strong></div>}
            <div style={{ marginTop:4 }}>Obrigado pela preferência 🙏</div>
          </div>
        </div>
      </div>

      {/* NOTINHA PAGE */}
      <div className="page-notinha" id="page-notinha" style={{ display:"none" }}>
        <div className="notinha-wrap">
          <div className="notinha-top">
            <div className="n-logo">{nomeLoja}</div>
            <div className="n-sub">Estética Automotiva</div>
          </div>
          <div className="notinha-body">
            <div style={{ textAlign:"center", marginBottom:6 }}>
              <span className="n-status" style={{ color: st.color, background: st.bg }}>{st.label}</span>
            </div>
            <div className="n-row"><span className="n-label">Orçamento</span><span className="n-val">#{o.numero}</span></div>
            <div className="n-row"><span className="n-label">Emitido</span><span className="n-val">{emitido}</span></div>
            {validade && <div className="n-row"><span className="n-label">Validade</span><span className="n-val">{validade}</span></div>}
            <hr className="notinha-divider" />
            <div className="n-row field-contact"><span className="n-label">Cliente</span><span className="n-val">{nomeCliente || "—"}</span></div>
            {o.clientes?.whatsapp && <div className="n-row field-contact"><span className="n-label">WhatsApp</span><span className="n-val">{o.clientes.whatsapp}</span></div>}
            {placa && <><div className="n-row"><span className="n-label">Placa</span><span className="n-val" style={{ color:"#c0392b", fontWeight:900 }}>{placa}</span></div>
            {modelo && <div className="n-row"><span className="n-label">Modelo</span><span className="n-val">{modelo}</span></div>}</>}
            <div className="n-section-title">Serviços</div>
            <div id="n-servicos">
              {itens.map((it: any, idx: number) => (
                <div key={idx} className="n-item">
                  <div className="n-item-nome">{it.servico_nome}</div>
                  {it.descricao && <div className="n-item-desc field-desc">{it.descricao}</div>}
                  <div className="n-item-total">
                    <span style={{ color:"#777" }}>{it.quantidade ?? 1}x {fmt(Number(it.preco))}</span>
                    <span style={{ fontWeight:700 }}>{fmt(Number(it.preco) * (it.quantidade ?? 1))}</span>
                  </div>
                </div>
              ))}
            </div>
            {desconto > 0 && (
              <div className="n-row" style={{ marginTop:6 }}>
                <span className="n-label">Desconto</span>
                <span className="n-val" style={{ color:"#c0392b" }}>− {fmt(desconto)}</span>
              </div>
            )}
            {o.observacoes && (
              <div className="field-obs" style={{ margin:"8px 0", padding:"8px", background:"#fffbf0", borderRadius:4, fontSize:10, color:"#78350f", borderLeft:"3px solid #f59e0b" }}>
                <strong>Obs:</strong> {o.observacoes}
              </div>
            )}
          </div>
          <div className="n-total-box">
            <span className="n-total-label">Total</span>
            <span className="n-total-val">{fmt(total)}</span>
          </div>
          <div className="n-footer">
            {config?.whatsapp && <div>{config.whatsapp}</div>}
            {config?.instagram && <div>{config.instagram}</div>}
            <div style={{ marginTop:4 }}>Obrigado pela preferencia!</div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        // Print A4
        document.getElementById('btn-a4').addEventListener('click', function(){
          document.body.classList.remove('mode-notinha');
          window.print();
        });
        // Print Notinha
        document.getElementById('btn-notinha').addEventListener('click', function(){
          document.body.classList.add('mode-notinha');
          window.print();
          setTimeout(function(){ document.body.classList.remove('mode-notinha'); }, 1000);
        });
        // Copy link
        document.getElementById('btn-copy').addEventListener('click', function(){
          navigator.clipboard.writeText(window.location.href).then(function(){
            var b = document.getElementById('btn-copy');
            b.textContent = 'Copiado!';
            setTimeout(function(){ b.textContent = 'Copiar Link'; }, 2000);
          });
        });
        // Dropdown toggle
        var btnSel = document.getElementById('btn-sel');
        var selDrop = document.getElementById('sel-dropdown');
        btnSel.addEventListener('click', function(e){ e.stopPropagation(); selDrop.classList.toggle('open'); });
        document.addEventListener('click', function(){ selDrop.classList.remove('open'); });
        // Checkbox toggles
        function bindCheck(id, cls) {
          var el = document.getElementById(id);
          el.addEventListener('change', function(){
            document.querySelectorAll('.' + cls).forEach(function(n){
              n.classList.toggle('hidden', !el.checked);
            });
          });
        }
        bindCheck('chk-desc', 'field-desc');
        bindCheck('chk-obs', 'field-obs');
        bindCheck('chk-contact', 'field-contact');
      `}} />
    </>
  );
}
