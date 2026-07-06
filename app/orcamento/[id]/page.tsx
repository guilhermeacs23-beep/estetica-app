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

  const nomeLoja   = config?.nome_fantasia ?? "Studio RPM";
  const nomeCliente = o.clientes?.nome ?? o.nome_avulso ?? "";
  const placa      = o.placa_avulsa ?? "";
  const modelo     = o.modelo_avulso ?? "";
  const itens: any[] = o.orcamento_servicos ?? [];
  const subtotal   = itens.reduce((s: number, i: any) => s + (Number(i.preco) * (i.quantidade ?? 1)), 0);
  const desconto   = Number(o.desconto ?? 0);
  const total      = Number(o.valor_total ?? (subtotal - desconto));
  const validade   = o.validade ? new Date(o.validade + "T12:00").toLocaleDateString("pt-BR") : "";
  const emitido    = new Date(o.created_at).toLocaleDateString("pt-BR");
  const fmt = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

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
        html { font-size:15px }
        body {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #0f0f0f;
          color: #1a1a1a;
          min-height: 100vh;
        }

        /* ── Barra de ações ── */
        .topbar {
          position: sticky; top: 0; z-index: 50;
          background: rgba(15,15,15,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #2a2a2a;
          padding: 12px 20px;
          display: flex; gap: 10px; justify-content: center; align-items: center;
        }
        .btn-print {
          display: flex; align-items: center; gap: 8px;
          background: #c0392b; color: #fff;
          border: none; border-radius: 8px;
          padding: 10px 20px; font-size: 13px; font-weight: 700;
          cursor: pointer; letter-spacing: 0.3px;
          transition: background 0.15s;
        }
        .btn-print:hover { background: #a93226 }
        .btn-copy {
          display: flex; align-items: center; gap: 8px;
          background: transparent; color: #ccc;
          border: 1px solid #3a3a3a; border-radius: 8px;
          padding: 10px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: border-color 0.15s;
        }
        .btn-copy:hover { border-color: #666; color: #fff }

        /* ── Wrapper principal ── */
        .page {
          max-width: 780px; margin: 0 auto;
          background: #fff;
        }
        @media (min-width: 820px) {
          .page { margin: 28px auto; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.6) }
        }

        /* ── Header escuro ── */
        .hdr {
          background: linear-gradient(135deg, #111 60%, #1e1e1e 100%);
          padding: 36px 40px 32px;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
          position: relative; overflow: hidden;
        }
        .hdr::before {
          content: "";
          position: absolute; right: -40px; top: -40px;
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(192,57,43,0.18) 0%, transparent 70%);
          border-radius: 50%;
        }
        .logo-mark {
          width: 52px; height: 52px; flex-shrink: 0;
          background: #c0392b; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 22px; color: #fff;
          box-shadow: 0 4px 16px rgba(192,57,43,0.4);
        }
        .hdr-brand { display: flex; align-items: center; gap: 16px }
        .brand-name { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.3px }
        .brand-sub  { font-size: 11px; color: #888; margin-top: 3px; letter-spacing: 0.5px; text-transform: uppercase }
        .hdr-num { text-align: right; position: relative; z-index: 1 }
        .hdr-num .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px }
        .hdr-num .num   { font-size: 36px; font-weight: 900; color: #c0392b; line-height: 1; letter-spacing: -1px }

        /* ── Faixa de status ── */
        .statusbar {
          background: #f8f8f8; border-bottom: 1px solid #ebebeb;
          padding: 14px 40px;
          display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
        }
        .badge {
          font-size: 11px; font-weight: 700; padding: 4px 12px;
          border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .meta-item { font-size: 12px; color: #777; display: flex; align-items: center; gap: 5px }
        .meta-item strong { color: #333; font-weight: 600 }
        .sep { color: #ddd; font-size: 14px }

        /* ── Corpo ── */
        .body { padding: 36px 40px }

        /* ── Cards cliente/veículo ── */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 36px }
        .info-card {
          border: 1px solid #e8e8e8; border-radius: 12px; padding: 20px 22px;
          background: #fafafa;
        }
        .info-card .ic-label {
          font-size: 9px; font-weight: 800; color: #999; text-transform: uppercase;
          letter-spacing: 1.5px; margin-bottom: 10px;
          display: flex; align-items: center; gap: 6px;
        }
        .info-card .ic-label::before {
          content: ""; display: inline-block;
          width: 3px; height: 12px; background: #c0392b; border-radius: 2px;
        }
        .ic-name { font-size: 17px; font-weight: 700; color: #111; margin-bottom: 6px }
        .ic-detail { font-size: 12px; color: #777; line-height: 1.6 }
        .ic-placa {
          font-size: 24px; font-weight: 900; color: #c0392b;
          letter-spacing: 2px; margin-bottom: 4px;
          font-variant-numeric: tabular-nums;
        }
        .ic-modelo { font-size: 14px; font-weight: 500; color: #555 }

        /* ── Tabela de serviços ── */
        .sec-title {
          font-size: 9px; font-weight: 800; color: #aaa; text-transform: uppercase;
          letter-spacing: 2px; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .sec-title::after {
          content: ""; flex: 1; height: 1px; background: #e8e8e8;
        }
        .servicos-table { width: 100%; border-collapse: collapse; margin-bottom: 4px }
        .servicos-table thead tr {
          border-bottom: 2px solid #111;
        }
        .servicos-table th {
          font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase;
          letter-spacing: 0.5px; padding: 10px 12px; text-align: left;
          background: transparent;
        }
        .servicos-table th:not(:first-child) { text-align: right }
        .servicos-table td {
          padding: 16px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top;
        }
        .servicos-table tr:last-child td { border-bottom: none }
        .servico-nome { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 4px }
        .servico-desc { font-size: 12px; color: #888; line-height: 1.5; max-width: 340px }
        .td-right { text-align: right; font-size: 13px; color: #444; white-space: nowrap }
        .td-total { text-align: right; font-size: 14px; font-weight: 700; color: #111; white-space: nowrap }

        /* ── Totais ── */
        .totais { margin-top: 20px; border-top: 1px solid #ebebeb; padding-top: 16px }
        .trow {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 13px; color: #777; padding: 5px 0;
        }
        .trow.desc-row { color: #c0392b }
        .trow.total-row {
          font-size: 22px; font-weight: 900; color: #111;
          padding-top: 14px; margin-top: 8px;
          border-top: 2px solid #111;
        }
        .trow.total-row span:last-child { color: #c0392b }

        /* ── Observações ── */
        .obs-box {
          margin-top: 28px; padding: 18px 22px;
          background: #fffbf0; border: 1px solid #f0e0a0;
          border-radius: 12px; border-left: 4px solid #f59e0b;
        }
        .obs-box .obs-label { font-size: 10px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px }
        .obs-box p { font-size: 13px; color: #78350f; line-height: 1.6 }

        /* ── Footer ── */
        .footer {
          margin-top: 40px;
          background: #111; padding: 28px 40px;
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 16px;
        }
        .footer-brand { font-size: 13px; font-weight: 700; color: #fff }
        .footer-sub { font-size: 11px; color: #666; margin-top: 2px }
        .footer-validity { font-size: 12px; color: #888; text-align: right }
        .footer-validity strong { color: #fff }

        @media (max-width: 600px) {
          .hdr { padding: 24px 20px 20px }
          .body { padding: 24px 20px }
          .statusbar { padding: 12px 20px }
          .info-grid { grid-template-columns: 1fr }
          .hdr-num .num { font-size: 28px }
          .footer { padding: 20px }
        }

        @media print {
          .topbar { display: none }
          body { background: #fff }
          .page { margin: 0; border-radius: 0; box-shadow: none }
          .footer { -webkit-print-color-adjust: exact; print-color-adjust: exact }
          .hdr { -webkit-print-color-adjust: exact; print-color-adjust: exact }
        }
      `}} />

      <div className="topbar">
        <button className="btn-print" id="btn-print">🖨️ Imprimir / Salvar PDF</button>
        <button className="btn-copy" id="btn-copy">📋 Copiar Link</button>
      </div>

      <div className="page">

        {/* Header */}
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

        {/* Status bar */}
        <div className="statusbar">
          <span className="badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
          <span className="sep">·</span>
          <span className="meta-item">Emitido em <strong>{emitido}</strong></span>
          {validade && <><span className="sep">·</span><span className="meta-item">Válido até <strong>{validade}</strong></span></>}
        </div>

        {/* Body */}
        <div className="body">

          {/* Info cards */}
          <div className="info-grid">
            <div className="info-card">
              <div className="ic-label">Cliente</div>
              <div className="ic-name">{nomeCliente || "—"}</div>
              <div className="ic-detail">
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

          {/* Serviços */}
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
            <tbody>
              {itens.length === 0
                ? <tr><td colSpan={4} style={{ textAlign:"center", color:"#bbb", padding:"28px" }}>Nenhum serviço</td></tr>
                : itens.map((it: any) => (
                    <tr key={it.id}>
                      <td>
                        <div className="servico-nome">{it.servico_nome}</div>
                        {it.descricao && <div className="servico-desc">{it.descricao}</div>}
                      </td>
                      <td className="td-right">{it.quantidade ?? 1}</td>
                      <td className="td-right">{fmt(Number(it.preco))}</td>
                      <td className="td-total">{fmt(Number(it.preco) * (it.quantidade ?? 1))}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>

          {/* Totais */}
          <div className="totais">
            <div className="trow"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {desconto > 0 && <div className="trow desc-row"><span>Desconto</span><span>− {fmt(desconto)}</span></div>}
            <div className="trow total-row"><span>Total</span><span>{fmt(total)}</span></div>
          </div>

          {/* Observações */}
          {o.observacoes && (
            <div className="obs-box">
              <div className="obs-label">Observações</div>
              <p>{o.observacoes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="footer">
          <div>
            <div className="footer-brand">{nomeLoja}</div>
            <div className="footer-sub">
              {config?.whatsapp && <span>📱 {config.whatsapp}</span>}
              {config?.instagram && <span style={{ marginLeft: 12 }}>📸 {config.instagram}</span>}
            </div>
          </div>
          <div className="footer-validity">
            {validade ? <><div>Válido até <strong>{validade}</strong></div></> : null}
            <div style={{ marginTop:4 }}>Obrigado pela preferência 🙏</div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('btn-print').addEventListener('click', function(){ window.print(); });
        document.getElementById('btn-copy').addEventListener('click', function(){
          navigator.clipboard.writeText(window.location.href).then(function(){
            var b = document.getElementById('btn-copy');
            b.textContent = '✓ Link copiado!';
            setTimeout(function(){ b.textContent = '📋 Copiar Link'; }, 2000);
          });
        });
      `}} />
    </>
  );
}
