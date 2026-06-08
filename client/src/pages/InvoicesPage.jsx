import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, deleteInvoice, updateInvoiceStatus, sendInvoiceEmail, downloadInvoicePDF } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const fmt = (n, sym = '₹') => `${sym}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUSES = ['all', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({});
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getInvoices({ status, search: search || undefined, page, limit: 10 });
      setInvoices(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status, page]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const getBadge = (s) => {
    const map = { Draft:'badge-draft', Sent:'badge-sent', Paid:'badge-paid', Overdue:'badge-overdue', Cancelled:'badge-cancelled' };
    return map[s] || 'badge-draft';
  };

  const handleDelete = async (id, num) => {
    if (!window.confirm(`Delete invoice ${num}?`)) return;
    try {
      await deleteInvoice(id);
      toast.success('Invoice deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const handleMarkPaid = async (id) => {
    setActionLoading(id + '_pay');
    try {
      await updateInvoiceStatus(id, 'Paid');
      toast.success('Marked as Paid ✅');
      load();
    } catch { toast.error('Failed'); }
    finally { setActionLoading(null); }
  };

  const handleSend = async (id) => {
    setActionLoading(id + '_send');
    try {
      await sendInvoiceEmail(id);
      toast.success('Invoice emailed to client! 📧');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Email failed'); }
    finally { setActionLoading(null); }
  };

  const handleDownload = async (id, num) => {
    setActionLoading(id + '_pdf');
    try {
      const { data } = await downloadInvoicePDF(id);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${num}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('PDF download failed'); }
    finally { setActionLoading(null); }
  };

  return (
    <Layout title="Invoices">
      <div className="page-header">
        <div>
          <h2 className="page-title">Invoices</h2>
          <p className="page-subtitle">{pagination.total || 0} total invoices</p>
        </div>
        <Link to="/invoices/new" className="btn-primary">✏️ New Invoice</Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-60">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices or clients..." className="input pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${status === s ? 'bg-primary-500 text-white' : 'bg-dark-600 text-slate-400 hover:text-slate-200'}`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-slate-400">No invoices found</p>
            <Link to="/invoices/new" className="btn-primary mt-4 inline-flex">Create your first invoice</Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td>
                    <Link to={`/invoices/${inv._id}`} className="text-primary-400 hover:text-primary-300 font-semibold">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium text-slate-200">{inv.client?.name}</p>
                      <p className="text-xs text-slate-500">{inv.client?.email}</p>
                    </div>
                  </td>
                  <td className="font-semibold text-slate-100">{fmt(inv.total, inv.currencySymbol)}</td>
                  <td className={inv.status === 'Overdue' ? 'text-red-400' : 'text-slate-300'}>{fmtDate(inv.dueDate)}</td>
                  <td><span className={getBadge(inv.status)}>{inv.status}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link to={`/invoices/${inv._id}`} className="btn-icon text-xs p-1.5" title="View">👁️</Link>
                      {inv.status !== 'Paid' && (
                        <button onClick={() => handleSend(inv._id)} disabled={actionLoading === inv._id+'_send'} className="btn-icon text-xs p-1.5" title="Send Email">
                          {actionLoading === inv._id+'_send' ? '⏳' : '📧'}
                        </button>
                      )}
                      <button onClick={() => handleDownload(inv._id, inv.invoiceNumber)} disabled={actionLoading === inv._id+'_pdf'} className="btn-icon text-xs p-1.5" title="Download PDF">
                        {actionLoading === inv._id+'_pdf' ? '⏳' : '📥'}
                      </button>
                      {inv.status !== 'Paid' && (
                        <button onClick={() => handleMarkPaid(inv._id)} disabled={actionLoading === inv._id+'_pay'} className="btn-icon text-xs p-1.5 text-emerald-400" title="Mark Paid">✅</button>
                      )}
                      <button onClick={() => handleDelete(inv._id, inv.invoiceNumber)} className="btn-icon text-xs p-1.5 text-red-400" title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-400">Page {page} of {pagination.pages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
            <button disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default InvoicesPage;
