import type { Order } from '@/types'
import { formatMoney, formatDate } from './format'
import { currentUser } from '@/mocks/data'

// Opens a print-ready document in a new window. The browser's "Save as PDF"
// turns this into a downloadable invoice / gate pass — no backend required.
function openPrintable(title: string, bodyHtml: string) {
  const styles = `
    * { box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', system-ui, Arial, sans-serif; color:#161B24; margin:0; padding:48px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #11543B; padding-bottom:20px; margin-bottom:28px; }
    .brand { font-weight:800; font-size:26px; color:#0E432F; letter-spacing:-0.02em; }
    .muted { color:#6B7585; font-size:13px; }
    .tag { display:inline-block; background:#EAF6F0; color:#11543B; font-weight:700; font-size:12px; padding:4px 10px; border-radius:6px; letter-spacing:0.06em; }
    table { width:100%; border-collapse:collapse; margin-top:18px; }
    th { text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#6B7585; border-bottom:1px solid #E2E6EC; padding:10px 8px; }
    td { padding:12px 8px; border-bottom:1px solid #EDEFF3; font-size:14px; }
    .right { text-align:right; }
    .totals { margin-top:18px; margin-left:auto; width:300px; }
    .totals .row { display:flex; justify-content:space-between; padding:6px 0; font-size:14px; }
    .totals .grand { border-top:2px solid #161B24; margin-top:8px; padding-top:10px; font-weight:800; font-size:18px; }
    .foot { margin-top:48px; color:#9AA4B2; font-size:12px; text-align:center; }
    .grid2 { display:flex; gap:48px; margin-bottom:8px; }
    @media print { body { padding:24px; } }`

  const html = `<!doctype html><html><head><title>${title}</title>
  <meta charset="utf-8" />
  <style>${styles}</style></head><body>${bodyHtml}
  <script>window.onload=()=>{window.print()}</script></body></html>`

  // Preferred path: a dedicated window (lets the user "Save as PDF").
  const win = window.open('', '_blank', 'width=820,height=900')
  if (win) {
    win.document.write(html)
    win.document.close()
    return
  }

  // Fallback: popup blocked. Render & print via a hidden iframe so the
  // invoice is still generated without relying on a new window.
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(`<!doctype html><html><head><title>${title}</title>
  <meta charset="utf-8" /><style>${styles}</style></head><body>${bodyHtml}</body></html>`)
  doc.close()

  const triggerPrint = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    // Clean up after the print dialog has had a chance to open.
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }, 1000)
  }
  // Give the iframe a tick to lay out its content before printing.
  if (iframe.contentWindow) iframe.contentWindow.onload = triggerPrint
  setTimeout(triggerPrint, 300)
}

export function downloadInvoice(order: Order) {
  const rows = order.lines
    .map(
      (l) => `<tr><td>${l.name}</td><td class="right">${l.quantity} ${l.unit}</td>
      <td class="right">${formatMoney(l.unitPrice)}</td><td class="right">${formatMoney(l.lineTotal)}</td></tr>`,
    )
    .join('')
  openPrintable(
    `Invoice ${order.invoiceNo ?? order.reference}`,
    `<div class="head">
      <div><div class="brand">Agriport</div><div class="muted">Wholesale Trading · CRM</div></div>
      <div class="right"><span class="tag">INVOICE</span>
      <div class="muted" style="margin-top:8px">${order.invoiceNo ?? order.reference}</div>
      <div class="muted">${formatDate(order.placedOn)}</div></div>
    </div>
    <div class="grid2">
      <div><div class="muted">BILLED TO</div><strong>${currentUser.companyName}</strong>
      <div class="muted">${currentUser.address}</div><div class="muted">GST: ${currentUser.gstNumber}</div></div>
      <div><div class="muted">ORDER</div><strong>${order.reference}</strong>
      <div class="muted">Payment: ${order.paymentMode.toUpperCase()} · ${order.paymentStatus}</div></div>
    </div>
    <table><thead><tr><th>Product</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Amount</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="totals">
      <div class="row grand"><span>Total</span><span>${formatMoney(order.total)}</span></div>
    </div>
    <div class="foot">This is a system-generated invoice for client review. © Agriport — B2B Wholesale Trading Platform.</div>`,
  )
}

export function downloadGatePass(order: Order) {
  const rows = order.lines
    .map((l) => `<tr><td>${l.name}</td><td class="right">${l.quantity} ${l.unit}</td></tr>`)
    .join('')
  openPrintable(
    `Gate Pass ${order.gatePassNo ?? order.reference}`,
    `<div class="head">
      <div><div class="brand">Agriport</div><div class="muted">Warehouse Gate Pass</div></div>
      <div class="right"><span class="tag">GATE PASS</span>
      <div class="muted" style="margin-top:8px">${order.gatePassNo ?? '—'}</div></div>
    </div>
    <div class="grid2">
      <div><div class="muted">ORDER REF</div><strong>${order.reference}</strong></div>
      <div><div class="muted">PICKUP</div><strong>${order.pickupAddress ?? '—'}</strong></div>
    </div>
    <table><thead><tr><th>Product</th><th class="right">Quantity</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="foot">Present this gate pass at the warehouse for collection. Security verification required.</div>`,
  )
}

/**
 * Generate a quotation invoice with executive-entered prices.
 * Opens a print window AND returns the plain-text WhatsApp message.
 */
export function generateQuotationInvoice(
  order: Order,
  linePrices: Record<string, number>,
  shipping: number,
): string {
  const lines = order.lines.map((l) => {
    const unitPrice = linePrices[l.productId] ?? l.unitPrice ?? 0
    const lineTotal = unitPrice * l.quantity
    return { ...l, unitPrice, lineTotal }
  })

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const gst = 0
  const grandTotal = subtotal

  const invoiceNo = order.invoiceNo ?? `QT-${order.reference.slice(4)}`
  const customerName = order.customerName ?? 'Valued Customer'
  const companyName = order.companyName ?? ''
  const customerPhone = order.customerPhone ?? ''
  const customerCity = order.customerCity ?? ''
  const deliveryAddress = order.deliveryAddress ?? ''
  const today = formatDate(new Date().toISOString())

  // ── Printable HTML ──────────────────────────────────────────────────────────
  const rows = lines
    .map(
      (l) =>
        `<tr><td>${l.name}</td><td class="right">${l.quantity} ${l.unit}</td>
        <td class="right">${formatMoney(l.unitPrice)}</td><td class="right">${formatMoney(l.lineTotal)}</td></tr>`,
    )
    .join('')

  openPrintable(
    `Quotation ${invoiceNo}`,
    `<div class="head">
      <div><div class="brand">Agriport</div><div class="muted">Wholesale Trading · B2B Platform</div></div>
      <div class="right"><span class="tag">QUOTATION</span>
      <div class="muted" style="margin-top:8px">${invoiceNo}</div>
      <div class="muted">${today}</div></div>
    </div>
    <div class="grid2">
      <div>
        <div class="muted">PREPARED FOR</div>
        <strong>${companyName || customerName}</strong>
        <div class="muted">${customerName}</div>
        <div class="muted">${customerPhone}</div>
        <div class="muted">${customerCity}</div>
        ${deliveryAddress ? `<div class="muted">${deliveryAddress}</div>` : ''}
      </div>
      <div>
        <div class="muted">ENQUIRY REF</div><strong>${order.reference}</strong>
        <div class="muted">Raised on: ${formatDate(order.placedOn)}</div>
        <div class="muted">Prepared by: Rahul Verma · Sales Executive</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Product</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row grand"><span>Grand Total</span><span>${formatMoney(grandTotal)}</span></div>
    </div>
    <div style="margin-top:32px; padding:16px; background:#EAF6F0; border-radius:8px; font-size:13px; color:#0E432F;">
      <strong>Note:</strong> This is a quotation/proforma. Final invoice will be issued upon order confirmation and payment.
      Valid for 7 days from date of issue.
    </div>
    <div class="foot">© Agriport — B2B Wholesale Trading Platform · For queries contact your sales executive.</div>`,
  )

  // ── WhatsApp plain-text message ─────────────────────────────────────────────
  const lineText = lines
    .map((l) => `  • ${l.name} — ${l.quantity} ${l.unit} × ${formatMoney(l.unitPrice)} = ${formatMoney(l.lineTotal)}`)
    .join('\n')

  return (
    `Hello ${customerName},\n\n` +
    `Thank you for your enquiry! Please find your quotation from *Agriport* below:\n\n` +
    `📋 *Quotation Ref:* ${invoiceNo}\n` +
    `📅 *Date:* ${today}\n\n` +
    `📦 *Products:*\n${lineText}\n\n` +
    `✅ *Grand Total: ${formatMoney(grandTotal)}*\n\n` +
    `This quotation is valid for 7 days. Please reply to confirm your order.\n\n` +
    `Regards,\n*Rahul Verma* — Agriport Sales Executive\n📞 +91 90000 00003`
  )
}
