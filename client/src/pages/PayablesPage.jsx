import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { getVendorInvoices, uploadVendorInvoice, approveVendorInvoice, rejectVendorInvoice, markVendorPaid, getVendorInvoice, updateVendorInvoice } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const STATUSES = ['all', 'Processing', 'Pending', 'Approved', 'Paid', 'Rejected'];

const getBadge = (s) => {
  const m = { Processing:'badge-processing', Pending:'badge-pending', Approved:'badge-approved', Paid:'badge-paid', Rejected:'badge-rejected' };
  return m[s] || 'badge-pending';
};

const PayablesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [polling, setPolling] = useState(null);

  const load = async () => {
    try {
      const { data } = await getVendorInvoices({ status });
      setInvoices(data.data);
    } catch { toast.error('Failed to load payables'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  // Poll for processing invoices to auto-refresh
  useEffect(() => {
    const hasProcessing = invoices.some(i => i.status === 'Processing');
    if (hasProcessing && !polling) {
      const interval = setInterval(load, 3000);
      setPolling(interval);
    } else if (!hasProcessing && polling) {
      clearInterval(polling);
      setPolling(null);
    }
    return () => { if (polling) clearInterval(polling); };
  }, [invoices]);

  const openDetail = async (id) => {
    setSelectedId(id);
    try {
      const { data } = await getVendorInvoice(id);
      setDetail(data.data);
    } catch { toast.error('Failed to load details'); }
  };

  const onDrop = useCallback(async (files) => {
    if (!files[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('invoice', files[0]);
    try {
      await uploadVendorInvoice(formData);
      toast.success('Uploaded! AI is parsing your invoice... 🤖✨');
      setStatus('Processing');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'], 'application/pdf': ['.pdf'] },
    maxFiles: 1, maxSize: 10 * 1024 * 1024,
  });

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve');
    try { await approveVendorInvoice(id); toast.success('Invoice approved ✅'); load(); if (selectedId === id) openDetail(id); }
    catch { toast.error('Failed'); }
    finally { setActionLoading(''); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection (optional):') || '';
    setActionLoading(id + '_reject');
    try { await rejectVendorInvoice(id, reason); toast.success('Invoice rejected'); load(); if (selectedId === id) setSelectedId(null); }
    catch { toast.error('Failed'); }
    finally { setActionLoading(''); }
  };

  const handlePaid = async (id) => {
    setActionLoading(id + '_pay');
    try { await markVendorPaid(id); toast.success('Marked as paid'); load(); if (selectedId === id) openDetail(id); }
    catch { toast.error('Failed'); }
    finally { setActionLoading(''); }
  };

  return (
    <Layout title="Accounts Payable">
      <div className="page-header">
        <div>
          <h2 className="page-title">Vendor Invoices</h2>
          <p className="page-subtitle">Upload vendor invoices — AI automatically extracts all data</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border border-dashed rounded-xl p-10 text-center cursor-pointer transition-all mb-6 ${
          isDragActive ? 'border-white bg-white/5' : 'border-dark-500 hover:border-dark-400 hover:bg-dark-750'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-slate-300 font-semibold uppercase tracking-wider text-xs">Uploading & parsing with AI...</p>
            <p className="text-slate-500 text-xs">Gemini 1.5 Flash is analyzing your invoice</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-dark-700 border border-dark-500 flex items-center justify-center text-2xl mb-1">🤖</div>
            <p className="text-slate-200 font-bold text-sm uppercase tracking-wider">{isDragActive ? 'Drop it here!' : 'Drop vendor invoice here'}</p>
            <p className="text-slate-400 text-xs">PDF, JPG, PNG up to 10MB — AI extracts data automatically</p>
            <button className="btn-primary mt-2" type="button">📤 Browse Files</button>
          </div>
        )}
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${status === s ? 'bg-white text-black' : 'bg-dark-700 border border-dark-500 text-slate-400 hover:text-slate-200'}`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Two-pane layout */}
      <div className="flex gap-6">
        {/* List */}
        <div className={`${selectedId ? 'w-1/2' : 'w-full'} transition-all`}>
          <div className="table-container">
            {loading ? (
              <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : invoices.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-4xl mb-3">📥</p>
                <p className="text-slate-400">No vendor invoices yet</p>
                <p className="text-slate-500 text-sm mt-1">Upload a PDF or image above to get started</p>
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>Vendor</th><th>Total</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv._id} onClick={() => openDetail(inv._id)} className={`cursor-pointer ${selectedId === inv._id ? 'bg-primary-500/10' : ''}`}>
                      <td>
                        <p className="font-medium text-slate-200">{inv.vendorName || 'Processing...'}</p>
                        <p className="text-xs text-slate-500">{inv.rawFileName}</p>
                      </td>
                      <td className="font-semibold text-slate-100">{inv.total ? fmt(inv.total) : '—'}</td>
                      <td className="text-slate-400">{fmtDate(inv.dueDate)}</td>
                      <td>
                        <span className={getBadge(inv.status)}>{inv.status}</span>
                        {inv.status === 'Processing' && <span className="ml-1 text-xs text-violet-400 animate-pulse">⚡ AI parsing...</span>}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {inv.status === 'Pending' && <>
                            <button onClick={() => handleApprove(inv._id)} className="btn-success text-xs py-1 px-2" disabled={actionLoading === inv._id+'_approve'}>✅ Approve</button>
                            <button onClick={() => handleReject(inv._id)} className="btn-danger text-xs py-1 px-2" disabled={actionLoading === inv._id+'_reject'}>✗</button>
                          </>}
                          {inv.status === 'Approved' && <button onClick={() => handlePaid(inv._id)} className="btn-primary text-xs py-1 px-2" disabled={actionLoading === inv._id+'_pay'}>💳 Pay</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail Pane */}
        {selectedId && detail && (
          <div className="w-1/2 animate-slide-in-right">
            <div className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-slate-200">📋 Parsed Invoice Details</h3>
                <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-200 text-lg">✕</button>
              </div>

              {/* AI Confidence */}
              <div className="mb-4 p-3 rounded-xl bg-dark-600 border border-dark-500">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400">AI Confidence</span>
                  <span className={`text-xs font-bold ${detail.aiConfidence >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{detail.aiConfidence}%</span>
                </div>
                <div className="w-full bg-dark-500 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${detail.aiConfidence >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${detail.aiConfidence}%` }} />
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-slate-500 uppercase tracking-wide">Vendor</p><p className="text-slate-200 font-medium">{detail.vendorName || '—'}</p></div>
                  <div><p className="text-xs text-slate-500 uppercase tracking-wide">Invoice #</p><p className="text-slate-200">{detail.invoiceNumber || '—'}</p></div>
                  <div><p className="text-xs text-slate-500 uppercase tracking-wide">Email</p><p className="text-slate-200">{detail.vendorEmail || '—'}</p></div>
                  <div><p className="text-xs text-slate-500 uppercase tracking-wide">Phone</p><p className="text-slate-200">{detail.vendorPhone || '—'}</p></div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Due Date</p>
                    <input
                      type="date"
                      value={detail.dueDate ? new Date(detail.dueDate).toISOString().split('T')[0] : ''}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        try {
                          const { data } = await updateVendorInvoice(detail._id, { dueDate: newDate });
                          setDetail(data.data);
                          setInvoices(prev => prev.map(inv => inv._id === detail._id ? { ...inv, dueDate: newDate } : inv));
                          toast.success('Due date updated successfully');
                        } catch {
                          toast.error('Failed to update due date');
                        }
                      }}
                      className="w-full bg-dark-700 text-slate-200 text-xs py-1.5 px-2 rounded-xl border border-dark-500 outline-none focus:border-primary-500 transition-all font-medium"
                    />
                  </div>
                  <div><p className="text-xs text-slate-500 uppercase tracking-wide">Total</p><p className="text-primary-400 font-bold text-base">{fmt(detail.total)}</p></div>
                </div>

                {detail.vendorBankDetails?.bankName && (
                  <div className="p-3 bg-dark-600 rounded-xl">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Bank Details</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span className="text-slate-400">Bank:</span><span className="text-slate-200">{detail.vendorBankDetails.bankName}</span>
                      <span className="text-slate-400">Account:</span><span className="text-slate-200">{detail.vendorBankDetails.accountNumber}</span>
                      <span className="text-slate-400">IFSC:</span><span className="text-slate-200">{detail.vendorBankDetails.ifsc}</span>
                      {detail.vendorBankDetails.upiId && <><span className="text-slate-400">UPI:</span><span className="text-slate-200">{detail.vendorBankDetails.upiId}</span></>}
                    </div>
                  </div>
                )}

                {detail.lineItems?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Line Items</p>
                    <div className="space-y-1">
                      {detail.lineItems.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs p-2 bg-dark-600 rounded">
                          <span className="text-slate-300 flex-1">{item.description}</span>
                          <span className="text-slate-400 mx-2">{item.quantity} × {fmt(item.rate)}</span>
                          <span className="text-primary-400 font-semibold">{fmt(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-dark-500 pt-3 flex justify-between font-bold">
                  <span className="text-slate-300">Total</span>
                  <span className="text-xl gradient-text">{fmt(detail.total)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                {detail.status === 'Pending' && (
                  <>
                    <button onClick={() => handleApprove(detail._id)} className="btn-success flex-1 justify-center" disabled={actionLoading === detail._id+'_approve'}>✅ Approve</button>
                    <button onClick={() => handleReject(detail._id)} className="btn-danger flex-1 justify-center" disabled={actionLoading === detail._id+'_reject'}>✗ Reject</button>
                  </>
                )}
                {detail.status === 'Approved' && (
                  <button onClick={() => handlePaid(detail._id)} className="btn-primary flex-1 justify-center" disabled={actionLoading === detail._id+'_pay'}>💳 Mark as Paid</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PayablesPage;
