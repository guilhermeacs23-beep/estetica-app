import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";

export default async function OrcamentoPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: o } = await supabaseAdmin
    .from("orcamentos")
    .select("*, clientes(nome, telefone, whatsapp, email, cidade), orcamento_servicos(id, servico_nome, preco, quantidade)")
    .eq("id", id)
    .single();

  if (!o) return notFound();

  const { data: config } = await supabaseAdmin
    .from("configuracoes")
    .select("nome_fantasia, logo_url")
    .eq("tenant_id", o.tenant_id)
    .single();

  const nomeLoja = config?.nome_fantasia ?? "Studio RPM";
  const nomeCliente = o.clientes?.nome ?? o.nome_avulso ?? "—";
  const placa = o.veiculos?.placa ?? o.placa_avulsa ?? "";
  const modelo = o.veiculos?.modelo ?? o.modelo_avulso ?? "";
  const itens = o.orcamento_servicos ?? [];
  const subtotal = itens.reduce((s: number, i: any) => s + (Number(i.preco) * (i.quantidade ?? 1)), 0);
  const desconto = Number(o.desconto ?? 0);
  const total = Number(o.valor_total ?? subtotal - desconto);
  const validade = o.validade ? new Date(o.validade + "T12:00").toLocaleDateString("pt-BR") : "—";
  const emitido = new Date(o.created_at).toLocaleDateString("pt-BR");

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Orçamento #{o.numero} — {nomeLoja}</title>
        <style>{`
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f5f5f5; color:#1a1a1a; }
          .page { max-width:720px; margin:0 auto; background:#fff; min-height:100vh; }
          @media(min-width:768px){ .page { margin:32px auto; box-shadow:0 4px 32px rgba(0,0,0,0.12); border-radius:12px; overflow:hidden; } }

          /* Header */
          .header { background:#1a1a1a; color:#fff; padding:32px 40px; display:flex; align-items:center; justify-content:space-between; }
          .logo-area { display:flex; align-items:center; gap:16px; }
          .logo-box { width:48px; height:48px; background:#c0392b; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:20px; color:#fff; }
          .loja-nome { font-size:22px; font-weight:800; letter-spacing:-0.5px; }
          .loja-sub { font-size:12px; color:#aaa; margin-top:2px; }
          .orcamento-id { text-align:right; }
          .orcamento-id .num { font-size:28px; font-weight:900; color:#c0392b; }
          .orcamento-id .label { font-size:11px; color:#aaa; text-transform:uppercase; letter-spacing:1px; }

          /* Status */
          .status-bar { background:#f8f8f8; border-bottom:1px solid #e8e8e8; padding:12px 40px; display:flex; gap:24px; align-items:center; }
          .status-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; }
          .status-pendente { background:#fef3c7; color:#d97706; }
          .status-aprovado { background:#d1fae5; color:#059669; }
          .status-recusado { background:#fee2e2; color:#dc2626; }
          .meta-item { font-size:12px; color:#666; }
          .meta-item strong { color:#1a1a1a; }

          /* Body */
          .body { padding:40px; }

          /* Cliente / Veiculo */
          .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:32px; }
          .info-box { border:1px solid #e8e8e8; border-radius:10px; padding:20px; }
          .info-box h3 { font-size:10px; font-weight:700; color:#999; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
          .info-box p { font-size:14px; color:#1a1a1a; line-height:1.5; }
          .info-box .big { font-size:18px; font-weight:700; color:#c0392b; }

          /* Tabela */
          .table-title { font-size:12px; font-weight:700; color:#999; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; }
          table { width:100%; border-collapse:collapse; margin-bottom:8px; }
          th { background:#f5f5f5; font-size:11px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:0.5px; padding:10px 14px; text-align:left; }
          th:last-child { text-align:right; }
          td { padding:14px; border-bottom:1px solid #f0f0f0; font-size:14px; color:#1a1a1a; vertical-align:top; }
          td:last-child { text-align:right; font-weight:600; }
          tr:last-child td { border-bottom:none; }

          /* Totais */
          .totais { border-top:2px solid #e8e8e8; padding-top:16px; margin-top:8px; }
          .total-row { display:flex; justify-content:space-between; font-size:13px; padding:4px 0; color:#666; }
          .total-row.final { font-size:20px; font-weight:800; color:#1a1a1a; padding-top:12px; margin-top:8px; border-top:1px solid #e8e8e8; }
          .total-row.final span:last-child { color:#c0392b; }
          .desconto { color:#dc2626; }

          /* Obs */
          .obs { background:#fffbf0; border:1px solid #fde68a; border-radius:10px; padding:16px 20px; margin-top:24px; }
          .obs h3 { font-size:11px; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
          .obs p { font-size:13px; color:#78350f; line-height:1.5; }

          /* Footer */
          .footer { background:#f8f8f8; border-top:1px solid #e8e8e8; padding:24px 40px; text-align:center; }
          .footer p { font-size:12px; color:#999; line-height:1.6; }

          /* Print btn */
          .print-bar { position:sticky; top:0; z-index:10; background:#1a1a1a; padding:12px 24px; display:flex; gap:12px; justify-content:center; }
          .print-btn { background:#c0392b; color:#fff; border:none; border-radius:8px; padding:10px 24px; font-size:14px; font-weight:600; cursor:pointer; }
          .print-btn:hover { background:#a93226; }
          .share-btn { background:transparent; color:#fff; border:1px solid #444; border-radius:8px; padding:10px 24px; font-size:14px; font-weight:600; cursor:pointer; }

          @media print {
            .print-bar { display:none !important; }
            .status-bar { display:none; }
            body { background:#fff; }
            .page { box-shadow:none; margin:0; border-radius:0; }
          }
        `}</style>
      </head>
      <body>
        {/* Barra de ação — oculta na impressão */}
        <div className="print-bar">
          <button className="print-btn" onClick={() => {}}>🖨️ Imprimir / Salvar PDF</button>
          <button className="share-btn" id="share-btn">📋 Copiar Link</button>
        </div>

        <div className="page">
          {/* Header */}
          <div className="header">
            <div className="logo-area">
              <div className="logo-box">R</div>
              <div>
                <div className="loja-nome">{nomeLoja}</div>
                <div className="loja-sub">Estética Automotiva</div>
              </div>
            </div>
            <div className="orcamento-id">
              <div className="label">Orçamento</div>
              <div className="num">#{o.numero}</div>
            </div>
          </div>

          {/* Status bar */}
          <div className="status-bar">
            <span className={`status-badge status-${o.status}`}>{o.status}</span>
            <span className="meta-item">Emitido em <strong>{emitido}</strong></span>
            <span className="meta-item">Válido até <strong>{validade}</strong></span>
          </div>

          {/* Body */}
          <div className="body">
            {/* Info grid */}
            <div className="info-grid">
              <div className="info-box">
                <h3>Cliente</h3>
                <p style={{ fontWeight: 700, fontSize: 16 }}>{nomeCliente}</p>
                {o.clientes?.telefone && <p style={{ marginTop: 6, color: "#666", fontSize: 13 }}>📞 {o.clientes.telefone}</p>}
                {o.clientes?.cidade && <p style={{ color: "#666", fontSize: 13 }}>📍 {o.clientes.cidade}</p>}
              </div>
              <div className="info-box">
                <h3>Veículo</h3>
                {placa && <p className="big">{placa}</p>}
                {modelo && <p style={{ marginTop: 4, fontWeight: 500 }}>{modelo}</p>}
                {!placa && !modelo && <p style={{ color: "#999" }}>Não informado</p>}
              </div>
            </div>

            {/* Serviços */}
            <div className="table-title">Serviços</div>
            <table>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th style={{ width: 60, textAlign: "center" }}>Qtd</th>
                  <th style={{ width: 100 }}>Valor Unit.</th>
                  <th style={{ width: 110 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr><td colSpan={4} style={{ color: "#999", textAlign: "center" }}>Nenhum serviço</td></tr>
                ) : itens.map((i: any) => (
                  <tr key={i.id}>
                    <td>{i.servico_nome}</td>
                    <td style={{ textAlign: "center" }}>{i.quantidade ?? 1}</td>
                    <td>{fmt(Number(i.preco))}</td>
                    <td>{fmt(Number(i.preco) * (i.quantidade ?? 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totais */}
            <div className="totais">
              <div className="total-row">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {desconto > 0 && (
                <div className="total-row">
                  <span>Desconto</span>
                  <span className="desconto">− {fmt(desconto)}</span>
                </div>
              )}
              <div className="total-row final">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            {/* Observações */}
            {o.observacoes && (
              <div className="obs">
                <h3>Observações</h3>
                <p>{o.observacoes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="footer">
            <p>
              Este orçamento é válido até <strong>{validade}</strong>.<br />
              Para aceitar ou tirar dúvidas, entre em contato conosco. Obrigado pela preferência!
            </p>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelector('.print-btn').onclick = () => window.print();
          document.getElementById('share-btn').onclick = () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
              document.getElementById('share-btn').textContent = 'Link copiado! ✓';
              setTimeout(() => document.getElementById('share-btn').textContent = '📋 Copiar Link', 2000);
            });
          };
        `}} />
      </body>
    </html>
  );
}
