import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getInvoice, updateInvoiceStatus, sendInvoiceEmail, downloadInvoicePDF, deleteInvoice } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const fmt = (n, sym = '₹') => `${sym}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const load = () => {
    setLoading(true);
    getInvoice(id).then(({ data }) => setInvoice(data.data)).catch(() => toast.error('Invoice not found')).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleSend = async () => {
    setActionLoading('send');
    try { await sendInvoiceEmail(id); toast.success('Invoice emailed! 📧'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Email failed'); }
    finally { setActionLoading(''); }
  };

  const handleDownload = async () => {
    setActionLoading('pdf');
    try {
      const { data } = await downloadInvoicePDF(id);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `${invoice.invoiceNumber}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('PDF download failed'); }
    finally { setActionLoading(''); }
  };

  const handleMarkPaid = async () => {
    setActionLoading('pay');
    try { await updateInvoiceStatus(id, 'Paid'); toast.success('Marked as Paid ✅'); load(); }
    catch { toast.error('Failed'); }
    finally { setActionLoading(''); }
  };

  const handleCopyPaymentLink = () => {
    const link = `${window.location.origin}/pay/${invoice._id}`;
    navigator.clipboard.writeText(link)
      .then(() => toast.success('Payment link copied! 📋'))
      .catch(() => toast.error('Failed to copy link'));
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this invoice?')) return;
    try { await deleteInvoice(id); toast.success('Deleted'); navigate('/invoices'); }
    catch { toast.error('Delete failed'); }
  };

  const getBadge = (s) => {
    const map = { Draft:'badge-draft', Sent:'badge-sent', Paid:'badge-paid', Overdue:'badge-overdue', Cancelled:'badge-cancelled' };
    return map[s] || 'badge-draft';
  };

  if (loading) return <Layout title="Invoice"><div className="flex justify-center p-20"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  if (!invoice) return <Layout title="Invoice"><div className="text-center p-20 text-slate-400">Invoice not found</div></Layout>;

  return (
    <Layout title={invoice.invoiceNumber}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/invoices')} className="btn-icon">←</button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="page-title">{invoice.invoiceNumber}</h2>
                <span className={getBadge(invoice.status)}>{invoice.status}</span>
              </div>
              <p className="page-subtitle">Created {fmtDate(invoice.createdAt)}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {invoice.status !== 'Paid' && (
              <button onClick={handleSend} disabled={actionLoading === 'send'} className="btn-secondary">
                {actionLoading === 'send' ? '⏳' : '📧'} Send Email
              </button>
            )}
            {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
              <button onClick={handleCopyPaymentLink} className="btn-secondary">
                🔗 Copy Pay Link
              </button>
            )}
            <button onClick={handleDownload} disabled={actionLoading === 'pdf'} className="btn-secondary">
              {actionLoading === 'pdf' ? '⏳' : '📥'} Download PDF
            </button>
            {invoice.status !== 'Paid' && (
              <button onClick={handleMarkPaid} disabled={actionLoading === 'pay'} className="btn-success">
                {actionLoading === 'pay' ? '⏳' : '✅'} Mark Paid
              </button>
            )}
            <Link to={`/invoices/${id}/edit`} className="btn-secondary">✏️ Edit</Link>
            <button onClick={handleDelete} className="btn-danger">🗑️</button>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="card p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="text-2xl font-bold gradient-text mb-1">INVOICE</div>
              <div className="text-slate-400 text-sm">{invoice.invoiceNumber}</div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Amount Due</p>
              <p className="text-3xl font-bold text-slate-100">{fmt(invoice.total, invoice.currencySymbol)}</p>
              <p className={`text-sm mt-1 ${invoice.status === 'Overdue' ? 'text-red-400' : 'text-slate-400'}`}>
                Due {fmtDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Bill To</p>
              <p className="font-semibold text-slate-200">{invoice.client?.name}</p>
              {invoice.client?.company && <p className="text-slate-400 text-sm">{invoice.client.company}</p>}
              <p className="text-slate-400 text-sm">{invoice.client?.email}</p>
              {invoice.client?.phone && <p className="text-slate-400 text-sm">{invoice.client.phone}</p>}
              {invoice.client?.address && <p className="text-slate-400 text-sm">{invoice.client.address}</p>}
              {invoice.client?.gstNumber && <p className="text-slate-400 text-sm">GST: {invoice.client.gstNumber}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Invoice Details</p>
              <div className="space-y-1 text-sm">
                <div className="flex gap-2"><span className="text-slate-400 w-24">Issue Date</span><span className="text-slate-200">{fmtDate(invoice.issueDate || invoice.createdAt)}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-24">Due Date</span><span className={invoice.status === 'Overdue' ? 'text-red-400' : 'text-slate-200'}>{fmtDate(invoice.dueDate)}</span></div>
                {invoice.sentAt && <div className="flex gap-2"><span className="text-slate-400 w-24">Sent At</span><span className="text-slate-200">{fmtDate(invoice.sentAt)}</span></div>}
                {invoice.paidAt && <div className="flex gap-2"><span className="text-slate-400 w-24">Paid At</span><span className="text-emerald-400">{fmtDate(invoice.paidAt)}</span></div>}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-dark-500 rounded-xl overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-dark-600">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="text-center px-4 py-3 text-xs text-slate-400 uppercase tracking-wider">Qty</th>
                  <th className="text-right px-4 py-3 text-xs text-slate-400 uppercase tracking-wider">Rate</th>
                  <th className="text-right px-4 py-3 text-xs text-slate-400 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {invoice.lineItems?.map((item, i) => (
                  <tr key={i} className="hover:bg-dark-600/30">
                    <td className="px-4 py-3 text-sm text-slate-200">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-right">{fmt(item.rate, invoice.currencySymbol)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-100 text-right">{fmt(item.amount, invoice.currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="text-slate-200">{fmt(invoice.subtotal, invoice.currencySymbol)}</span></div>
              {invoice.discountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-400">Discount ({invoice.discountPercent}%)</span><span className="text-red-400">-{fmt(invoice.discountAmount, invoice.currencySymbol)}</span></div>}
              {invoice.taxType !== 'None' && <div className="flex justify-between text-sm"><span className="text-slate-400">{invoice.taxType} ({invoice.taxRate}%)</span><span className="text-slate-200">{fmt(invoice.taxAmount, invoice.currencySymbol)}</span></div>}
              <div className="border-t border-dark-500 pt-2 flex justify-between font-bold"><span className="text-slate-100 text-lg">Total</span><span className="text-xl gradient-text">{fmt(invoice.total, invoice.currencySymbol)}</span></div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 pt-6 border-t border-dark-500">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Notes</p>
              <p className="text-slate-400 text-sm">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Terms</p>
              <p className="text-slate-400 text-sm">{invoice.terms}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default InvoiceDetailPage;
