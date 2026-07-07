import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";

export default async function OrcamentoPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: o } = await supabaseAdmin
    .from("orcamentos")
    .select("*, clientes(nome, telefone, whatsapp, email), veiculos(placa, modelo, marca, ano, km), orcamento_servicos(id, servico_nome, descricao, preco, quantidade)")
    .eq("id", id)
    .single();

  if (!o) return notFound();

  const { data: config } = await supabaseAdmin
    .from("configuracoes")
    .select("nome_fantasia, telefone, whatsapp, email, cidade, instagram, logo_url")
    .eq("tenant_id", o.tenant_id)
    .single();

  const nomeLoja    = config?.nome_fantasia ?? "Studio RPM";
  const nomeCliente = o.clientes?.nome ?? o.nome_avulso ?? "";
  const placa       = o.placa_avulsa ?? o.veiculos?.placa ?? "";
  const modelo      = o.modelo_avulso ?? o.veiculos?.modelo ?? "";
  const marca       = o.veiculos?.marca ?? "";
  const veicAno     = o.veiculos?.ano ?? "";
  const veicKm      = o.veiculos?.km ? `${Number(o.veiculos.km).toLocaleString("pt-BR")} km` : "";
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box }
        body { font-family: "Segoe UI", Arial, sans-serif; background:#e5e7eb; color:#1a1a1a; font-size:14px; }

        /* ── Topbar (tela apenas) ── */
        .topbar {
          position:sticky; top:0; z-index:50;
          background:#111; border-bottom:1px solid #222;
          padding:10px 20px;
          display:flex; gap:8px; justify-content:center; align-items:center; flex-wrap:wrap;
        }
        .btn-red   { display:flex;align-items:center;gap:6px;background:#c0392b;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none }
        .btn-green { display:flex;align-items:center;gap:6px;background:#1a6e3b;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none }
        .btn-gray  { display:flex;align-items:center;gap:6px;background:transparent;color:#ccc;border:1px solid #444;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer }
        .sel-wrap  { position:relative }
        .sel-dropdown { display:none;position:absolute;top:calc(100% + 6px);right:0;background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:14px;min-width:210px;z-index:100;box-shadow:0 8px 32px rgba(0,0,0,0.5) }
        .sel-dropdown.open { display:block }
        .sel-item  { display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #2a2a2a }
        .sel-item:last-child { border-bottom:none }
        .sel-item label { font-size:13px;color:#ccc;cursor:pointer;flex:1 }
        .sel-item input  { width:15px;height:15px;cursor:pointer;accent-color:#c0392b }
        .sel-title { font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px }

        /* ── Página A4 ── */
        .page-a4 {
          max-width:800px; margin:24px auto 48px; background:#fff;
          border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,0.18);
          overflow:hidden;
        }

        /* Cabeçalho empresa */
        .doc-header {
          display:flex; justify-content:space-between; align-items:flex-start;
          padding:28px 32px; background:#fff; border-bottom:2px solid #111;
        }
        .logo-area { display:flex; align-items:center; gap:16px }
        .logo-img  { width:80px; height:80px; border-radius:8px; background:#111; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; padding:6px }
        .logo-img img { width:100%; height:100%; object-fit:contain }
        .logo-placeholder { font-size:11px; color:#9ca3af; text-align:center; line-height:1.3; padding:8px }
        .company-name { font-size:18px; font-weight:800; color:#111; letter-spacing:-0.3px }
        .company-sub  { font-size:11px; color:#6b7280; margin-top:2px; text-transform:uppercase; letter-spacing:0.5px }
        .doc-meta     { text-align:right }
        .doc-meta .orc-num  { font-size:14px; font-weight:700; color:#111 }
        .doc-meta .orc-date { font-size:13px; color:#374151; margin-top:3px }
        .doc-meta .orc-val  { font-size:13px; color:#374151; margin-top:1px }
        .status-badge { display:inline-block; font-size:11px; font-weight:700; padding:3px 12px; border-radius:20px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px }

        /* Seções */
        .sec-header {
          display:flex; align-items:center; gap:10px;
          background:#f3f4f6; padding:10px 32px; font-size:13px; font-weight:700; color:#374151;
          border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb;
        }
        .sec-body { padding:16px 32px }

        /* Info cliente */
        .info-row { display:flex; gap:32px; flex-wrap:wrap }
        .info-field { display:flex; flex-direction:column; gap:1px }
        .info-field .lbl { font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px }
        .info-field .val { font-size:14px; color:#111; font-weight:600 }

        /* Veículo row */
        .veiculo-row { display:flex; gap:28px; flex-wrap:wrap; margin-bottom:6px }
        .veiculo-km  { font-size:13px; font-weight:700; color:#374151; margin-top:4px }
        .veiculo-km span { color:#6b7280; font-weight:400 }

        /* Serviços */
        .servicos-wrap { padding:0 32px }
        .servico-linha {
          display:flex; justify-content:space-between; align-items:baseline;
          padding:14px 0; border-bottom:1px solid #f0f0f0;
        }
        .servico-linha:last-child { border-bottom:none }
        .serv-nome { font-size:14px; font-weight:600; color:#111 }
        .serv-desc { font-size:12px; color:#6b7280; margin-top:2px; line-height:1.4 }
        .serv-preco { font-size:14px; font-weight:700; color:#111; white-space:nowrap; margin-left:20px }
        .total-servicos {
          display:flex; justify-content:flex-end; padding:12px 32px;
          font-size:14px; color:#6b7280; border-top:1px solid #e5e7eb;
          background:#fafafa;
        }
        .total-servicos strong { color:#16a34a; margin-left:6px }

        /* Valores finais */
        .valores-grid {
          display:grid; grid-template-columns:1fr 1fr 1fr;
          padding:20px 32px; gap:16px; border-top:1px solid #e5e7eb;
        }
        .valor-item { display:flex; flex-direction:column; gap:3px }
        .valor-item .v-label { font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px }
        .valor-item .v-val   { font-size:14px; font-weight:700; color:#111 }
        .valor-item .v-total { font-size:18px; font-weight:900; color:#16a34a }
        .valor-item .v-desc  { color:#c0392b }

        /* Obs */
        .obs-box { margin:0 32px 20px; padding:14px 18px; background:#fffbf0; border:1px solid #fde68a; border-radius:8px; border-left:4px solid #f59e0b }
        .obs-box .obs-label { font-size:10px; font-weight:800; color:#92400e; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px }
        .obs-box p { font-size:13px; color:#78350f; line-height:1.6 }

        /* Rodapé */
        .doc-footer {
          padding:16px 32px; background:#111; display:flex; justify-content:space-between; align-items:center;
          flex-wrap:wrap; gap:10px;
        }
        .footer-l { font-size:12px; color:#9ca3af }
        .footer-l strong { color:#fff; display:block; font-size:13px; margin-bottom:2px }
        .footer-r { font-size:12px; color:#6b7280; text-align:right }

        /* ── NOTINHA ── */
        .page-notinha { display:none }
        .mode-notinha .page-a4    { display:none }
        .mode-notinha .page-notinha { display:block !important }
        .notinha-wrap {
          width:260px; margin:24px auto; background:#fff;
          border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,0.5);
          font-family:"Courier New", monospace; font-size:12px; color:#000; overflow:hidden;
        }
        .n-top { background:#111; padding:16px; text-align:center }
        .n-top .n-logo { font-size:15px; font-weight:900; color:#fff; letter-spacing:1px }
        .n-top .n-sub  { font-size:10px; color:#888; margin-top:2px; text-transform:uppercase }
        .n-body { padding:10px 12px }
        .n-row  { display:flex; justify-content:space-between; margin:3px 0; font-size:11px }
        .n-label { color:#555; flex-shrink:0; margin-right:6px }
        .n-val   { font-weight:700; color:#111; text-align:right }
        .n-divider { border:none; border-top:1px dashed #ccc; margin:8px 0 }
        .n-sec   { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#888; text-align:center; border-top:1px dashed #ddd; border-bottom:1px dashed #ddd; padding:4px 0; margin:8px 0 }
        .n-item  { margin:5px 0; border-bottom:1px dotted #eee; padding-bottom:5px }
        .n-item:last-child { border-bottom:none }
        .n-item-nome  { font-weight:700; font-size:12px }
        .n-item-desc  { font-size:10px; color:#777; margin-top:1px; line-height:1.4 }
        .n-item-total { display:flex; justify-content:space-between; font-size:11px; margin-top:3px }
        .n-total-box  { background:#111; color:#fff; padding:10px 14px; display:flex; justify-content:space-between; align-items:center }
        .n-total-box .n-t-label { font-size:11px; text-transform:uppercase; letter-spacing:1px }
        .n-total-box .n-t-val   { font-size:17px; font-weight:900; color:#c0392b }
        .n-footer { padding:10px 14px 14px; text-align:center; font-size:10px; color:#999; line-height:1.6; border-top:1px dashed #ddd }
        .n-badge  { display:inline-block; font-size:10px; font-weight:700; padding:2px 10px; border-radius:20px; margin:3px 0 6px }

        /* ── Print ── */
        @media print {
          .topbar { display:none }
          body { background:#fff }
          .page-a4 { margin:0; border-radius:0; box-shadow:none }
          .doc-header { -webkit-print-color-adjust:exact; print-color-adjust:exact }
          .doc-footer { -webkit-print-color-adjust:exact; print-color-adjust:exact }
          .sec-header { -webkit-print-color-adjust:exact; print-color-adjust:exact }
          .obs-box    { -webkit-print-color-adjust:exact; print-color-adjust:exact }

          body.mode-notinha .page-a4 { display:none }
          body.mode-notinha .page-notinha { display:block !important }
          body.mode-notinha .notinha-wrap { margin:0 auto; width:260px; border-radius:0; box-shadow:none }
          @page { margin:0 }
          body.mode-notinha .n-top       { -webkit-print-color-adjust:exact; print-color-adjust:exact }
          body.mode-notinha .n-total-box { -webkit-print-color-adjust:exact; print-color-adjust:exact }
          body.mode-notinha .n-t-val     { color:#c0392b !important; -webkit-print-color-adjust:exact; print-color-adjust:exact }
        }
        .field-desc.hidden, .field-obs.hidden, .field-contact.hidden { display:none !important }
      `}} />

      {/* TOPBAR */}
      <div className="topbar">
        <button className="btn-red"   id="btn-a4">🖨️ Imprimir A4</button>
        <button className="btn-green" id="btn-notinha">🧾 Imprimir Notinha</button>
        <button className="btn-gray"  id="btn-copy">📋 Copiar Link</button>
        <div className="sel-wrap">
          <button className="btn-gray" id="btn-sel">⚙️ Campos ▾</button>
          <div className="sel-dropdown" id="sel-dropdown">
            <div className="sel-title">Exibir no orçamento</div>
            <label className="sel-item"><input type="checkbox" id="chk-desc" defaultChecked /><label htmlFor="chk-desc">Descrição dos serviços</label></label>
            <label className="sel-item"><input type="checkbox" id="chk-obs"  defaultChecked /><label htmlFor="chk-obs">Observações</label></label>
            <label className="sel-item"><input type="checkbox" id="chk-contact" defaultChecked /><label htmlFor="chk-contact">Contato do cliente</label></label>
          </div>
        </div>
      </div>

      {/* ── PÁGINA A4 ── */}
      <div className="page-a4">

        {/* Cabeçalho empresa + número */}
        <div className="doc-header">
          <div className="logo-area">
            <div className="logo-img">
              <img src={config?.logo_url ?? "/logo.png"} alt={nomeLoja} />
            </div>
            <div>
              <div className="company-name">{nomeLoja}</div>
              <div className="company-sub">Estética Automotiva</div>
              {config?.cidade && <div style={{ fontSize:12, color:"#9ca3af", marginTop:2 }}>{config.cidade}</div>}
            </div>
          </div>
          <div className="doc-meta">
            <div className="status-badge" style={{ color: st.color, background: st.bg }}>{st.label}</div>
            <div className="orc-num">Orçamento Nº {o.numero} — {emitido}</div>
            {validade && <div className="orc-val">Validade do orçamento: {validade}</div>}
          </div>
        </div>

        {/* Informações do Cliente */}
        <div className="sec-header">
          <span>👤</span> Informações do Cliente
        </div>
        <div className="sec-body">
          <div className="info-row">
            <div className="info-field">
              <span className="lbl">Nome</span>
              <span className="val">{nomeCliente || "—"}</span>
            </div>
            <div className="info-field field-contact">
              <span className="lbl">WhatsApp</span>
              <span className="val">{o.clientes?.whatsapp || "—"}</span>
            </div>
            {o.clientes?.telefone && (
              <div className="info-field field-contact">
                <span className="lbl">Telefone</span>
                <span className="val">{o.clientes.telefone}</span>
              </div>
            )}
            {o.clientes?.email && (
              <div className="info-field field-contact">
                <span className="lbl">E-mail</span>
                <span className="val">{o.clientes.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Veículo */}
        {(placa || modelo || marca) && (
          <>
            <div className="sec-header">
              <span>🚗</span> Veículo e serviço
            </div>
            <div className="sec-body">
              <div className="veiculo-row">
                {marca && <div className="info-field"><span className="lbl">Marca</span><span className="val">{marca.toUpperCase()}</span></div>}
                {modelo && <div className="info-field"><span className="lbl">Modelo</span><span className="val">{modelo.toUpperCase()}</span></div>}
                {placa && <div className="info-field"><span className="lbl">Placa</span><span className="val">{placa.toUpperCase()}</span></div>}
                {veicAno && <div className="info-field"><span className="lbl">Ano</span><span className="val">{veicAno}</span></div>}
              </div>
              {veicKm && (
                <div className="veiculo-km"><span>Quilometragem </span>{veicKm}</div>
              )}
            </div>
          </>
        )}

        {/* Serviços */}
        <div className="sec-header">
          <span>⚙️</span> Serviços Realizados
        </div>
        <div className="servicos-wrap">
          {itens.length === 0
            ? <div style={{ padding:"28px 0", textAlign:"center", color:"#9ca3af" }}>Nenhum serviço adicionado</div>
            : itens.map((it: any) => (
              <div key={it.id} className="servico-linha">
                <div>
                  <div className="serv-nome">{it.servico_nome}{it.quantidade > 1 ? ` ×${it.quantidade}` : ""}</div>
                  {it.descricao && <div className="serv-desc field-desc">{it.descricao}</div>}
                </div>
                <div className="serv-preco">{fmt(Number(it.preco) * (it.quantidade ?? 1))}</div>
              </div>
            ))
          }
        </div>
        <div className="total-servicos">
          Total de serviços: <strong>{fmt(subtotal)}</strong>
        </div>

        {/* Valores finais */}
        <div className="sec-header" style={{ marginTop:0 }}>
          <span>💰</span> Valores finais
        </div>
        <div className="valores-grid">
          <div className="valor-item">
            <span className="v-label">Subtotal</span>
            <span className="v-val">{fmt(subtotal)}</span>
          </div>
          <div className="valor-item">
            <span className="v-label">Desconto</span>
            <span className={`v-val${desconto > 0 ? " v-desc" : ""}`}>{desconto > 0 ? `R$ ${desconto.toLocaleString("pt-BR", { minimumFractionDigits:2 })}` : "—"}</span>
          </div>
          <div className="valor-item">
            <span className="v-label">Total da venda</span>
            <span className="v-total">{fmt(total)}</span>
          </div>
        </div>

        {/* Observações */}
        {o.observacoes && (
          <div className="obs-box field-obs">
            <div className="obs-label">Observações</div>
            <p>{o.observacoes}</p>
          </div>
        )}

        {/* Rodapé */}
        <div className="doc-footer">
          <div className="footer-l">
            <strong>{nomeLoja}</strong>
            {config?.whatsapp && <span>📱 {config.whatsapp}</span>}
            {config?.instagram && <span style={{ marginLeft:12 }}>📸 {config.instagram}</span>}
          </div>
          <div className="footer-r">
            {validade && <div>Válido até {validade}</div>}
            <div>Obrigado pela preferência 🙏</div>
          </div>
        </div>
      </div>

      {/* ── NOTINHA ── */}
      <div className="page-notinha" id="page-notinha">
        <div className="notinha-wrap">
          <div className="n-top">
            <img src={config?.logo_url ?? "/logo.png"} alt={nomeLoja}
              style={{ height:44, width:"auto", objectFit:"contain", maxWidth:200, marginBottom:4 }} />
            <div className="n-sub">Estética Automotiva</div>
          </div>
          <div className="n-body">
            <div style={{ textAlign:"center" }}>
              <span className="n-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
            </div>
            <div className="n-row"><span className="n-label">Orçamento</span><span className="n-val">#{o.numero}</span></div>
            <div className="n-row"><span className="n-label">Emitido</span><span className="n-val">{emitido}</span></div>
            {validade && <div className="n-row"><span className="n-label">Validade</span><span className="n-val">{validade}</span></div>}
            <hr className="n-divider" />
            <div className="n-row field-contact"><span className="n-label">Cliente</span><span className="n-val">{nomeCliente || "—"}</span></div>
            {o.clientes?.whatsapp && <div className="n-row field-contact"><span className="n-label">WhatsApp</span><span className="n-val">{o.clientes.whatsapp}</span></div>}
            {placa && <>
              <div className="n-row"><span className="n-label">Placa</span><span className="n-val" style={{ color:"#c0392b", fontWeight:900 }}>{placa}</span></div>
              {modelo && <div className="n-row"><span className="n-label">Veículo</span><span className="n-val">{modelo}</span></div>}
              {veicAno && <div className="n-row"><span className="n-label">Ano</span><span className="n-val">{veicAno}</span></div>}
              {veicKm && <div className="n-row"><span className="n-label">KM</span><span className="n-val">{veicKm}</span></div>}
            </>}
            <div className="n-sec">Serviços</div>
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
            <hr className="n-divider" />
            <div className="n-row"><span className="n-label">Subtotal</span><span className="n-val">{fmt(subtotal)}</span></div>
            {desconto > 0 && <div className="n-row"><span className="n-label">Desconto</span><span className="n-val" style={{ color:"#c0392b" }}>− {fmt(desconto)}</span></div>}
            {o.observacoes && (
              <div className="field-obs" style={{ margin:"8px 0", padding:"7px 10px", background:"#fffbf0", borderRadius:4, fontSize:10, color:"#78350f", borderLeft:"3px solid #f59e0b" }}>
                <strong>Obs:</strong> {o.observacoes}
              </div>
            )}
          </div>
          <div className="n-total-box">
            <span className="n-t-label">Total da venda</span>
            <span className="n-t-val">{fmt(total)}</span>
          </div>
          <div className="n-footer">
            {config?.whatsapp && <div>📱 {config.whatsapp}</div>}
            {config?.instagram && <div>📸 {config.instagram}</div>}
            <div style={{ marginTop:4 }}>Obrigado pela preferência!</div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('btn-notinha').addEventListener('click', function(){
          document.body.classList.add('mode-notinha');
          window.print();
        });
        document.getElementById('btn-a4').addEventListener('click', function(){
          document.body.classList.remove('mode-notinha');
        });
        document.getElementById('btn-copy').addEventListener('click', function(){
          navigator.clipboard.writeText(window.location.href.split('?')[0]).then(function(){
            var b = document.getElementById('btn-copy');
            b.textContent = '✓ Copiado!'; setTimeout(function(){ b.textContent = '📋 Copiar Link'; }, 2000);
          });
        });
        var btnSel = document.getElementById('btn-sel');
        var selDrop = document.getElementById('sel-dropdown');
        btnSel.addEventListener('click', function(e){ e.stopPropagation(); selDrop.classList.toggle('open'); });
        document.addEventListener('click', function(){ selDrop.classList.remove('open'); });
        function bindCheck(id, cls) {
          var el = document.getElementById(id);
          el.addEventListener('change', function(){
            document.querySelectorAll('.'+cls).forEach(function(n){ n.classList.toggle('hidden', !el.checked); });
          });
        }
        bindCheck('chk-desc','field-desc'); bindCheck('chk-obs','field-obs'); bindCheck('chk-contact','field-contact');
        // Auto-print via ?print=a4|notinha
        var p = new URLSearchParams(window.location.search).get('print');
        if (p === 'notinha') {
          // manter modo notinha na tela (não remover após print)
          document.body.classList.add('mode-notinha');
          window.addEventListener('load', function(){
            setTimeout(function(){ window.print(); }, 400);
          });
        } else if (p === 'a4') {
          window.addEventListener('load', function(){
            setTimeout(function(){ window.print(); }, 400);
          });
        }
      `}} />
    </>
  );
}
