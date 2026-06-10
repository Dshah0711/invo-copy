import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getExpenses, createExpense, updateExpense, deleteExpense,
  getExpenseCategories, getExpenseBreakdown,
} from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingDown,
  Coins,
  Award,
  RefreshCw,
  Edit2,
  Trash2
} from 'lucide-react';

const fmt = (n, sym = '₹') =>
  `${sym}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CATEGORY_COLORS = {
  'Rent & Office': '#6366f1',
  'Salaries & Payroll': '#8b5cf6',
  'Software & Subscriptions': '#3b82f6',
  'Marketing & Ads': '#f59e0b',
  'Utilities & Bills': '#10b981',
  'Travel & Transport': '#06b6d4',
  'Equipment & Hardware': '#f97316',
  'Professional Services': '#ec4899',
  'Insurance': '#14b8a6',
  'Taxes & Compliance': '#ef4444',
  'Miscellaneous': '#64748b',
};

const RECURRENCE_LABELS = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

const EMPTY_FORM = {
  title: '', amount: '', category: 'Miscellaneous', date: new Date().toISOString().split('T')[0],
  isRecurring: false, recurrenceInterval: 'monthly', notes: '',
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const sym = user?.currencySymbol || '₹';

  const [expenses, setExpenses] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [total, setTotal] = useState(0);

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const [expRes, brkRes, catRes] = await Promise.all([
        getExpenses(params),
        getExpenseBreakdown(params),
        getExpenseCategories(),
      ]);
      setExpenses(expRes.data.data);
      setTotalAmount(expRes.data.totalAmount);
      setTotal(expRes.data.total);
      setBreakdown(brkRes.data.data.map(b => ({ name: b._id, value: b.total, count: b.count })));
      setCategories(catRes.data.data);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterCategory, filterFrom, filterTo]);

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (exp) => {
    setEditId(exp._id);
    setForm({
      title: exp.title, amount: exp.amount, category: exp.category,
      date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : '',
      isRecurring: exp.isRecurring, recurrenceInterval: exp.recurrenceInterval || 'monthly',
      notes: exp.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return toast.error('Title and amount are required.');
    setSaving(true);
    try {
      if (editId) {
        await updateExpense(editId, form);
        toast.success('Expense updated ✅');
      } else {
        await createExpense(form);
        toast.success('Expense logged! 💸');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      toast.success('Expense deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <Layout title="Expenses">
      <div className="page-header">
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={24} className="text-rose-500" />
            Expenses
          </h2>
          <p className="page-subtitle">Track your business costs to get a complete P&L view</p>
        </div>
        <button className="btn-primary" onClick={openAdd} id="add-expense-btn">
          + Add Expense
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard icon={TrendingDown} label="Total Expenses" value={fmt(totalAmount, sym)} sub={`${total} entries`} color="#f43f5e" />
        <KpiCard
          icon={Award}
          label="Biggest Category"
          value={breakdown[0]?.name || '—'}
          sub={breakdown[0] ? fmt(breakdown[0].value, sym) : 'No data'}
          color="#f59e0b"
        />
        <KpiCard
          icon={RefreshCw}
          label="Recurring"
          value={expenses.filter(e => e.isRecurring).length}
          sub="active recurring entries"
          color="#a1a1aa"
        />
      </div>

      {/* Filters + Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '24px' }}>
        {/* Filters + Table */}
        <div>
          {/* Filter bar */}
          <div style={{
            display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px',
            background: '#101012', borderRadius: '12px', padding: '14px 18px',
            border: '1px solid #1f1f24',
          }}>
            <div style={{ flex: '1', minWidth: '140px' }}>
              <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{ width: '100%', background: '#141417', border: '1px solid #1f1f24', borderRadius: '8px', color: '#e2e8f0', padding: '8px 10px', fontSize: '13px', outline: 'none' }}
              >
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</label>
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                style={{ background: '#141417', border: '1px solid #1f1f24', borderRadius: '8px', color: '#e2e8f0', padding: '8px 10px', fontSize: '13px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To</label>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                style={{ background: '#141417', border: '1px solid #1f1f24', borderRadius: '8px', color: '#e2e8f0', padding: '8px 10px', fontSize: '13px', outline: 'none' }} />
            </div>
            {(filterCategory !== 'all' || filterFrom || filterTo) && (
              <button onClick={() => { setFilterCategory('all'); setFilterFrom(''); setFilterTo(''); }}
                style={{ alignSelf: 'flex-end', padding: '8px 14px', borderRadius: '8px', border: '1px solid #1f1f24', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>
                ✕ Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="table-container">
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ width: '32px', height: '32px', border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              </div>
            ) : expenses.length === 0 ? (
              <div style={{ padding: '64px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <TrendingDown size={48} className="text-slate-600" style={{ marginBottom: '12px' }} />
                <p style={{ color: '#64748b', fontSize: '15px' }}>No expenses yet</p>
                <p style={{ color: '#475569', fontSize: '13px', marginTop: '4px' }}>Click "Add Expense" to start tracking your costs</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Recurrence</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp._id}>
                      <td>
                        <p style={{ fontWeight: '600', color: '#e2e8f0' }}>{exp.title}</p>
                        {exp.notes && <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{exp.notes}</p>}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                          background: `${CATEGORY_COLORS[exp.category] || '#64748b'}22`,
                          color: CATEGORY_COLORS[exp.category] || '#64748b',
                          border: `1px solid ${CATEGORY_COLORS[exp.category] || '#64748b'}44`,
                        }}>
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8' }}>{fmtDate(exp.date)}</td>
                      <td>
                        {exp.isRecurring ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontSize: '12px', fontWeight: '600' }}>
                            <RefreshCw size={12} /> {RECURRENCE_LABELS[exp.recurrenceInterval] || exp.recurrenceInterval}
                          </span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '12px' }}>One-time</span>
                        )}
                      </td>
                      <td style={{ fontWeight: '700', color: '#ef4444', fontSize: '15px' }}>{fmt(exp.amount, sym)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                           <button onClick={() => openEdit(exp)}
                            style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #1f1f24', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(exp._id)}
                            style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #ef444433', background: 'transparent', color: '#ef4444', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Breakdown Pie */}
        <div>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '16px', fontSize: '14px' }}>Expense Breakdown</h3>
            {breakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={breakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {breakdown.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [fmt(v, sym), 'Amount']} contentStyle={{ background: '#101012', border: '1px solid #1f1f24', borderRadius: '8px', color: '#ffffff' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {breakdown.slice(0, 6).map((b) => (
                    <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: CATEGORY_COLORS[b.name] || '#6366f1', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0' }}>{fmt(b.value, sym)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '13px' }}>
                No data to display
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #1f1f24', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '18px' }}>
                {editId ? '✏️ Edit Expense' : '+ New Expense'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Title */}
              <div>
                <label className="label">Expense Title *</label>
                <input className="input" placeholder="e.g. Office Rent June 2026" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
              </div>

              {/* Amount + Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="label">Amount ({sym}) *</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="5000" value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input className="input" type="date" value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Recurring */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isRecurring}
                    onChange={e => setForm(p => ({ ...p, isRecurring: e.target.checked }))}
                    style={{ width: '16px', height: '16px', accentColor: '#ffffff' }} />
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>🔄 This is a recurring expense</span>
                </label>
                {form.isRecurring && (
                  <select className="input" value={form.recurrenceInterval}
                    onChange={e => setForm(p => ({ ...p, recurrenceInterval: e.target.value }))}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input" rows={2} placeholder="Any additional details..." value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving...' : editId ? '✅ Update' : '💸 Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{
      background: '#101012', border: '1px solid #1f1f24', borderRadius: '12px', padding: '20px',
      display: 'flex', alignItems: 'flex-start', gap: '14px',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '8px', flexShrink: 0,
        background: `${color}08`, border: '1px solid rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {Icon && <Icon size={20} color={color} />}
      </div>
      <div>
        <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</p>
        <p style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', marginTop: '4px', lineHeight: '1' }}>{value}</p>
        {sub && <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{sub}</p>}
      </div>
    </div>
  );
}
