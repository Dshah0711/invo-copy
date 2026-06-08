const nodemailer = require('nodemailer');

// Check if email is configured
const emailConfigured =
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS &&
  !process.env.EMAIL_USER.includes('your_gmail') &&
  !process.env.EMAIL_PASS.includes('your_16');

let transporter = null;
if (emailConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  console.log('📧 Email service configured:', process.env.EMAIL_USER);
} else {
  console.log('⚠️  Email not configured — email features disabled. Set EMAIL_USER & EMAIL_PASS in .env to enable.');
}

const formatCurrency = (amount, symbol = '₹') => {
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Send invoice email with PDF attachment
const sendInvoiceEmail = async ({ to, clientName, invoiceNumber, total, dueDate, currencySymbol, senderName, senderCompany, pdfBuffer }) => {
  if (!transporter) {
    console.log(`[Email skipped] Invoice ${invoiceNumber} → ${to} (email not configured)`);
    return;
  }
  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 40px 32px;text-align:center;">
        <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:white;line-height:56px;">I</div>
        <h1 style="color:white;font-size:24px;font-weight:700;margin:0 0 4px;">Invoice from ${senderCompany || senderName}</h1>
        <p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px;">${invoiceNumber}</p>
      </div>
      <!-- Body -->
      <div style="padding:40px;">
        <p style="color:#1e293b;font-size:16px;margin:0 0 24px;">Hi <strong>${clientName}</strong>,</p>
        <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 32px;">
          Please find your invoice attached to this email. You can also view the details below.
        </p>
        <!-- Invoice Card -->
        <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:32px;border:1px solid #e2e8f0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <span style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Invoice Number</span>
            <span style="color:#1e293b;font-weight:600;font-size:14px;">${invoiceNumber}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <span style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Due Date</span>
            <span style="color:#ef4444;font-weight:600;font-size:14px;">${formatDate(dueDate)}</span>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"/>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#1e293b;font-size:16px;font-weight:700;">Total Amount Due</span>
            <span style="color:#6366f1;font-size:24px;font-weight:800;">${formatCurrency(total, currencySymbol)}</span>
          </div>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0 0 32px;">
          The invoice PDF is attached to this email. Please process the payment before the due date.
          If you have any questions, reply to this email.
        </p>
        <div style="text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">This invoice was sent via <strong>InvoAI</strong></p>
        </div>
      </div>
      <!-- Footer -->
      <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">Sent by ${senderName} ${senderCompany ? `• ${senderCompany}` : ''}</p>
      </div>
    </div>
  </body>
  </html>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `InvoAI <${process.env.EMAIL_USER}>`,
    to,
    subject: `Invoice ${invoiceNumber} from ${senderCompany || senderName} — Due ${formatDate(dueDate)}`,
    html,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

// Send overdue reminder email
const sendOverdueReminderEmail = async ({ to, clientName, invoiceNumber, total, dueDate, currencySymbol, senderName, senderCompany }) => {
  if (!transporter) {
    console.log(`[Email skipped] Overdue reminder for ${invoiceNumber} (email not configured)`);
    return;
  }
  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:40px;text-align:center;">
        <p style="font-size:48px;margin:0 0 8px;">⚠️</p>
        <h1 style="color:white;font-size:22px;font-weight:700;margin:0;">Payment Overdue</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">${invoiceNumber}</p>
      </div>
      <div style="padding:40px;">
        <p style="color:#1e293b;font-size:16px;">Hi <strong>${clientName}</strong>,</p>
        <p style="color:#64748b;font-size:14px;line-height:1.7;">
          This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> for
          <strong style="color:#ef4444;">${formatCurrency(total, currencySymbol)}</strong> was due on
          <strong>${formatDate(dueDate)}</strong> and remains unpaid.
        </p>
        <p style="color:#64748b;font-size:14px;line-height:1.7;">
          Please arrange payment at your earliest convenience to avoid any service interruptions.
          If you've already made the payment, please disregard this message and share the payment details.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;">
          — ${senderName}, ${senderCompany || ''}
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `InvoAI <${process.env.EMAIL_USER}>`,
    to,
    subject: `⚠️ Payment Overdue: ${invoiceNumber} — ${formatCurrency(total, currencySymbol)}`,
    html,
  });
};

module.exports = { sendInvoiceEmail, sendOverdueReminderEmail };
