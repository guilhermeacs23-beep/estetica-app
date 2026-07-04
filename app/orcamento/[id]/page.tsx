import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";

export default async function OrcamentoPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: o } = await supabaseAdmin
    .from("orcamentos")
    .select("*, clientes(nome, telefone, whatsapp, cidade), orcamento_servicos(id, servico_nome, preco, quantidade)")
    .eq("id", id)
    .single();

  if (!o) return notFound();

  const { data: config } = await supabaseAdmin
    .from("configuracoes")
    .select("nome_fantasia")
    .eq("tenant_id", o.tenant_id)
    .single();

  const nomeLoja = config?.nome_fantasia ?? "Studio RPM";
  const nomeCliente = o.clientes?.nome ?? o.nome_avulso ?? "";
  const placa = o.placa_avulsa ?? "";
  const modelo = o.modelo_avulso ?? "";
  const itens: any[] = o.orcamento_servicos ?? [];
  const subtotal = itens.reduce((s: number, i: any) => s + (Number(i.preco) * (i.quantidade ?? 1)), 0);
  const desconto = Number(o.desconto ?? 0);
  const total = Number(o.valor_total ?? (subtotal - desconto));
  const validade = o.validade ? new Date(o.validade + "T12:00").toLocaleDateString("pt-BR") : "";
  const emitido = new Date(o.created_at).toLocaleDateString("pt-BR");
  const fmt = (v: number) => "R$ " + v.toFixed(2).replace(".", ",");

  const STATUS_LABEL: Record<string,string> = { pendente:"Pendente", aprovado:"Aprovado", recusado:"Recusado", expirado:"Expirado" };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f0f0f0;color:#111}
        .wrap{max-width:720px;margin:0 auto;background:#fff;min-height:100vh}
        @media(min-width:768px){.wrap{margin:28px auto;box-shadow:0 4px 32px rgba(0,0,0,.15);border-radius:14px;overflow:hidden}}
        .topbar{background:#111;padding:12px 24px;display:flex;gap:10px;justify-content:center;position:sticky;top:0;z-index:10}
        .btn-print{background:#c0392b;color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:13px;font-weight:700;cursor:pointer}
        .btn-copy{background:transparent;color:#fff;border:1px solid #555;border-radius:8px;padding:9px 22px;font-size:13px;font-weight:700;cursor:pointer}
        .header{background:#111;color:#fff;padding:28px 36px;display:flex;align-items:center;justify-content:space-between}
        .logo{width:44px;height:44px;background:#c0392b;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:#fff;flex-shrink:0}
        .loja-nome{font-size:20px;font-weight:800}
        .loja-sub{font-size:11px;color:#aaa;margin-top:2px}
        .num-orcamento{text-align:right}
        .num-orcamento .n{font-size:26px;font-weight:900;color:#c0392b}
        .num-orcamento .l{font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1px}
        .metabar{background:#f7f7f7;border-bottom:1px solid #e5e5e5;padding:10px 36px;display:flex;gap:20px;align-items:center;flex-wrap:wrap}
        .badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase}
        .pendente{background:#fef3c7;color:#d97706}
        .aprovado{background:#d1fae5;color:#059669}
        .recusado{background:#fee2e2;color:#dc2626}
        .meta{font-size:12px;color:#666}
        .meta strong{color:#111}
        .body{padding:32px 36px}
        .cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
        .card{border:1px solid #e5e5e5;border-radius:10px;padding:18px}
        .card h3{font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
        .card .big{font-size:20px;font-weight:800;color:#c0392b;letter-spacing:1px}
        .sec-title{font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
        table{width:100%;border-collapse:collapse;margin-bottom:4px}
        th{background:#f5f5f5;font-size:10px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:.5px;padding:9px 12px;text-align:left}
        th:last-child,td:last-child{text-align:right}
        td{padding:13px 12px;border-bottom:1px solid #f0f0f0;font-size:13px}
        tr:last-child td{border-bottom:none}
        .totais{border-top:2px solid #e5e5e5;padding-top:14px;margin-top:6px}
        .trow{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:#666}
        .trow.final{font-size:20px;font-weight:800;color:#111;padding-top:10px;margin-top:8px;border-top:1px solid #e5e5e5}
        .trow.final span:last-child{color:#c0392b}
        .desc{color:#dc2626}
        .obs{background:#fffbf0;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-top:22px}
        .obs h3{font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}
        .obs p{font-size:13px;color:#78350f;line-height:1.5}
        .footer{background:#f7f7f7;border-top:1px solid #e5e5e5;padding:20px 36px;text-align:center}
        .footer p{font-size:12px;color:#999;line-height:1.6}
        @media print{.topbar{display:none}.metabar{display:none}.wrap{box-shadow:none;margin:0;border-radius:0}body{background:#fff}}
      `}} />

      <div className="wrap">
        {/* Barra de ações (JS puro, sem React handlers) */}
        <div className="topbar">
          <button className="btn-print" id="btn-print">🖨️ Imprimir / Salvar PDF</button>
          <button className="btn-copy" id="btn-copy">📋 Copiar Link</button>
        </div>

        {/* Header */}
        <div className="header">
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div className="logo">R</div>
            <div>
              <div className="loja-nome">{nomeLoja}</div>
              <div className="loja-sub">Estética Automotiva</div>
            </div>
          </div>
          <div className="num-orcamento">
            <div className="l">Orçamento</div>
            <div className="n">#{o.numero}</div>
          </div>
        </div>

        {/* Meta bar */}
        <div className="metabar">
          <span className={`badge ${o.status}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
          <span className="meta">Emitido em <strong>{emitido}</strong></span>
          {validade && <span className="meta">Válido até <strong>{validade}</strong></span>}
        </div>

        {/* Body */}
        <div className="body">
          <div className="cards">
            <div className="card">
              <h3>Cliente</h3>
              <p style={{ fontWeight:700, fontSize:16 }}>{nomeCliente || "—"}</p>
              {o.clientes?.cidade && <p style={{ fontSize:13, color:"#666", marginTop:4 }}>📍 {o.clientes.cidade}</p>}
              {o.clientes?.telefone && <p style={{ fontSize:13, color:"#666", marginTop:2 }}>📞 {o.clientes.telefone}</p>}
            </div>
            <div className="card">
              <h3>Veículo</h3>
              {placa ? <p className="big">{placa}</p> : null}
              {modelo ? <p style={{ fontWeight:500, marginTop:4 }}>{modelo}</p> : null}
              {!placa && !modelo && <p style={{ color:"#999" }}>Não informado</p>}
            </div>
          </div>

          <div className="sec-title">Serviços</div>
          <table>
            <thead>
              <tr>
                <th>Serviço</th>
                <th style={{ width:60, textAlign:"center" }}>Qtd</th>
                <th style={{ width:110 }}>Unit.</th>
                <th style={{ width:120 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.length === 0
                ? <tr><td colSpan={4} style={{ textAlign:"center", color:"#999" }}>Nenhum serviço</td></tr>
                : itens.map((it: any) => (
                    <tr key={it.id}>
                      <td>{it.servico_nome}</td>
                      <td style={{ textAlign:"center" }}>{it.quantidade ?? 1}</td>
                      <td>{fmt(Number(it.preco))}</td>
                      <td>{fmt(Number(it.preco) * (it.quantidade ?? 1))}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>

          <div className="totais">
            <div className="trow"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {desconto > 0 && <div className="trow"><span>Desconto</span><span className="desc">− {fmt(desconto)}</span></div>}
            <div className="trow final"><span>Total</span><span>{fmt(total)}</span></div>
          </div>

          {o.observacoes && (
            <div className="obs">
              <h3>Observações</h3>
              <p>{o.observacoes}</p>
            </div>
          )}
        </div>

        <div className="footer">
          <p>
            {validade ? <>Orçamento válido até <strong>{validade}</strong>.<br /></> : null}
            Obrigado pela preferência — {nomeLoja}
          </p>
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
