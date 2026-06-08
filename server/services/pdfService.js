const puppeteer = require('puppeteer');

const formatCurrency = (amount, symbol = '₹') => {
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusColor = (status) => {
  const colors = { Draft: '#64748b', Sent: '#3b82f6', Paid: '#22c55e', Overdue: '#ef4444', Cancelled: '#94a3b8' };
  return colors[status] || '#64748b';
};

const generateInvoiceHTML = (invoice, user, template = 'modern') => {
  const sym = invoice.currencySymbol || '₹';
  const lineItemsHTML = invoice.lineItems.map((item, i) => `
    <tr class="line-row ${i % 2 === 0 ? 'even' : 'odd'}">
      <td class="desc">${item.description}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${formatCurrency(item.rate, sym)}</td>
      <td class="right bold">${formatCurrency(item.amount, sym)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 13px; line-height: 1.6; }
    .page { max-width: 800px; margin: 0 auto; padding: 48px; }

    /* HEADER */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 20px; }
    .brand-name { font-size: 22px; font-weight: 700; color: #1e293b; }
    .brand-tagline { font-size: 11px; color: #94a3b8; }
    .invoice-badge { text-align: right; }
    .invoice-title { font-size: 32px; font-weight: 300; color: #6366f1; letter-spacing: 3px; text-transform: uppercase; }
    .invoice-number { font-size: 15px; font-weight: 600; color: #1e293b; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; color: white; background: ${getStatusColor(invoice.status)}; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }

    /* DIVIDER */
    .divider { height: 2px; background: linear-gradient(90deg, #6366f1, #8b5cf6, transparent); margin: 0 0 32px; border-radius: 2px; }

    /* INFO GRID */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 40px; }
    .info-block label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px; }
    .info-block .value { font-size: 13px; font-weight: 500; color: #1e293b; }
    .info-block .value.large { font-size: 16px; font-weight: 700; color: #6366f1; }
    .info-block .sub { font-size: 12px; color: #64748b; }

    /* TABLE */
    .table-wrap { margin-bottom: 32px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
    thead th { padding: 14px 16px; color: white; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    thead th:first-child { text-align: left; }
    .center { text-align: center; }
    .right { text-align: right; }
    .desc { text-align: left; padding: 12px 16px; }
    td { padding: 12px 16px; }
    tr.even { background: #f8fafc; }
    tr.odd { background: #ffffff; }
    .bold { font-weight: 600; }
    .line-row td { border-bottom: 1px solid #f1f5f9; }

    /* TOTALS */
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals-table { width: 280px; }
    .totals-table tr td { padding: 8px 0; font-size: 13px; }
    .totals-table tr td:first-child { color: #64748b; }
    .totals-table tr td:last-child { text-align: right; font-weight: 500; }
    .totals-divider { border: none; border-top: 1px solid #e2e8f0; margin: 8px 0; }
    .grand-total { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .grand-total .label { color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .grand-total .amount { color: white; font-size: 22px; font-weight: 700; }

    /* FOOTER */
    .footer-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
    .notes-box { background: #f8fafc; border-radius: 10px; padding: 16px; border-left: 3px solid #6366f1; }
    .notes-box h4 { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .notes-box p { font-size: 12px; color: #64748b; line-height: 1.6; }
    .from-box h4 { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .from-box p { font-size: 12px; color: #64748b; }

    /* WATERMARK for paid */
    ${invoice.status === 'Paid' ? `
    .page::before {
      content: 'PAID';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 120px;
      font-weight: 900;
      color: rgba(34, 197, 94, 0.08);
      pointer-events: none;
      z-index: 0;
      letter-spacing: 20px;
    }` : ''}
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="brand-logo">${(user.company || user.name || 'I').charAt(0).toUpperCase()}</div>
        <div>
          <div class="brand-name">${user.company || user.name}</div>
          <div class="brand-tagline">${user.email}</div>
          ${user.gstNumber ? `<div class="brand-tagline">GST: ${user.gstNumber}</div>` : ''}
        </div>
      </div>
      <div class="invoice-badge">
        <div class="invoice-title">Invoice</div>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <span class="status-badge">${invoice.status}</span>
      </div>
    </div>

    <div class="divider"></div>

    <div class="info-grid">
      <div class="info-block">
        <label>Bill To</label>
        <div class="value">${invoice.client.name}</div>
        <div class="sub">${invoice.client.company || ''}</div>
        <div class="sub">${invoice.client.email}</div>
        ${invoice.client.phone ? `<div class="sub">${invoice.client.phone}</div>` : ''}
        ${invoice.client.address ? `<div class="sub">${invoice.client.address}</div>` : ''}
        ${invoice.client.gstNumber ? `<div class="sub">GST: ${invoice.client.gstNumber}</div>` : ''}
      </div>
      <div class="info-block">
        <label>Issue Date</label>
        <div class="value">${formatDate(invoice.issueDate || invoice.createdAt)}</div>
        <br/>
        <label>Due Date</label>
        <div class="value" style="color: ${invoice.status === 'Overdue' ? '#ef4444' : '#1e293b'}">${formatDate(invoice.dueDate)}</div>
      </div>
      <div class="info-block">
        <label>Amount Due</label>
        <div class="value large">${formatCurrency(invoice.total, sym)}</div>
        <div class="sub">${invoice.currency}</div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="center">Qty</th>
            <th class="right">Rate</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHTML}
        </tbody>
      </table>
    </div>

    <div class="totals-section">
      <div>
        <table class="totals-table">
          <tr><td>Subtotal</td><td>${formatCurrency(invoice.subtotal, sym)}</td></tr>
          ${invoice.discountAmount > 0 ? `<tr><td>Discount (${invoice.discountPercent}%)</td><td>-${formatCurrency(invoice.discountAmount, sym)}</td></tr>` : ''}
          ${invoice.taxType !== 'None' ? `<tr><td>${invoice.taxType} (${invoice.taxRate}%)</td><td>${formatCurrency(invoice.taxAmount, sym)}</td></tr>` : ''}
        </table>
        <hr class="totals-divider" />
        <div class="grand-total">
          <span class="label">Total Due</span>
          <span class="amount">${formatCurrency(invoice.total, sym)}</span>
        </div>
        ${invoice.status === 'Paid' ? `<div style="text-align:center;color:#22c55e;font-weight:600;font-size:12px;margin-top:8px;">✓ Payment Received on ${formatDate(invoice.paidAt)}</div>` : ''}
      </div>
    </div>

    <div class="footer-section">
      <div class="notes-box">
        <h4>Notes</h4>
        <p>${invoice.notes || 'Thank you for your business!'}</p>
        ${invoice.terms ? `<br/><h4 style="margin-top:8px">Terms</h4><p>${invoice.terms}</p>` : ''}
      </div>
      <div class="from-box">
        <h4>From</h4>
        <p><strong>${user.name}</strong></p>
        <p>${user.company || ''}</p>
        <p>${user.email}</p>
        <p>${user.phone || ''}</p>
        ${user.address?.street ? `<p>${user.address.street}, ${user.address.city}</p>` : ''}
        ${user.gstNumber ? `<p>GST: ${user.gstNumber}</p>` : ''}
      </div>
    </div>

    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px;">
      Generated by InvoAI • ${new Date().toLocaleDateString('en-IN')}
    </div>
  </div>
</body>
</html>`;
};

const generateInvoicePDF = async (invoice, user) => {
  const html = generateInvoiceHTML(invoice, user, invoice.template);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
  return pdfBuffer;
};

module.exports = { generateInvoicePDF, generateInvoiceHTML };
