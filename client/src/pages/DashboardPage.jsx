import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAnalyticsSummary, getMonthlyData, getStatusBreakdown,
  getTopClients, getInvoices, getPnL,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Calendar,
  CreditCard,
  Inbox,
  Activity,
  BarChart3,
  FileSpreadsheet,
  PieChart as PieIcon,
  Award,
  FileText,
  Users
} from 'lucide-react';

const fmt = (n, sym = '₹') =>
  `${sym}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const fmtCompact = (v, sym = '₹') => {
  const n = Number(v || 0);
  if (n >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}k`;
  return `${sym}${n.toFixed(0)}`;
};

const STATUS_COLORS = { Paid: '#10b981', Sent: '#a1a1aa', Draft: '#71717a', Overdue: '#f43f5e', Cancelled: '#3f3f46' };

// ── KPI Card ──────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'primary', trend }) => {
  const colorMap = {
    primary: { bg: '#121215', icon: '#a1a1aa' },
    green: { bg: 'rgba(16,185,129,0.08)', icon: '#10b981' },
    red: { bg: 'rgba(244,63,94,0.08)', icon: '#f43f5e' },
    amber: { bg: 'rgba(245,158,11,0.08)', icon: '#f59e0b' },
    violet: { bg: '#121215', icon: '#a1a1aa' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <div style={{
      background: '#101012', border: '1px solid #1f1f24', borderRadius: '12px',
      padding: '22px', display: 'flex', alignItems: 'flex-start', gap: '16px',
      transition: 'border-color 0.2s', cursor: 'default',
    }}>
      <div style={{
        width: '50px', height: '50px', borderRadius: '8px', flexShrink: 0,
        background: c.bg, border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {Icon && <Icon size={22} color={c.icon} />}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </p>
        <p style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', marginTop: '6px', lineHeight: '1' }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>{sub}</p>}
      </div>
    </div>
  );
};

// ── Chart Tooltip ─────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, sym }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: '#141417', border: '1px solid #2a2a32', borderRadius: '8px',
        padding: '12px 16px', minWidth: '160px',
      }}>
        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>{label}</p>
        {payload.map((p) => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: p.color }}>{p.name}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0' }}>{fmtCompact(p.value, sym || '₹')}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ── P&L Row ───────────────────────────────────────────────
const PnLRow = ({ label, value, sub, color, icon: Icon, bold }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid #1f1f24',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {Icon && (
        <span style={{ display: 'flex', alignItems: 'center', color: color || '#94a3b8' }}>
          <Icon size={18} />
        </span>
      )}
      <div>
        <p style={{ fontSize: '13px', fontWeight: bold ? '700' : '500', color: bold ? '#f1f5f9' : '#94a3b8' }}>{label}</p>
        {sub && <p style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>{sub}</p>}
      </div>
    </div>
    <p style={{ fontSize: bold ? '18px' : '14px', fontWeight: bold ? '800' : '600', color: color || '#e2e8f0' }}>{value}</p>
  </div>
);

// ── Main Dashboard ────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const sym = user?.currencySymbol || '₹';

  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, m, b, t, r, p] = await Promise.all([
          getAnalyticsSummary(), getMonthlyData(), getStatusBreakdown(),
          getTopClients(), getInvoices({ limit: 5, sortBy: 'createdAt', order: 'desc' }),
          getPnL(),
        ]);
        setSummary(s.data.data);
        setMonthly(m.data.data);
        setBreakdown(b.data.data.map(d => ({ name: d._id, value: d.count, amount: d.amount })));
        setTopClients(t.data.data);
        setRecentInvoices(r.data.data);
        setPnl(p.data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const getBadge = (status) => {
    const map = { Draft: 'badge-draft', Sent: 'badge-sent', Paid: 'badge-paid', Overdue: 'badge-overdue', Cancelled: 'badge-cancelled' };
    return map[status] || 'badge-draft';
  };

  if (loading) return (
    <Layout title="Dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: '#141417', border: '1px solid #1f1f24', borderRadius: '12px', height: '100px', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    </Layout>
  );

  const pnlSummary = pnl?.summary;
  const pnlMonths = pnl?.months || [];
  // Last 6 months for the cashflow chart
  const cashflowData = pnlMonths.slice(-6);

  return (
    <Layout title="Dashboard">
      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={TrendingUp} label="Total Revenue" value={fmt(summary?.totalRevenue, sym)} sub="All time paid" color="green" />
        <StatCard icon={Clock} label="Outstanding" value={fmt(summary?.outstanding, sym)} sub={`${summary?.totalInvoices || 0} invoices total`} color="primary" />
        <StatCard icon={AlertCircle} label="Overdue" value={fmt(summary?.overdueAmount, sym)} sub={`${summary?.overdueCount || 0} overdue invoices`} color="red" />
        <StatCard icon={Calendar} label="This Month" value={`${summary?.thisMonthCount || 0} invoices`} sub={`${summary?.totalClients || 0} clients total`} color="amber" />
      </div>

      {/* ── P&L Summary Banner ── */}
      {pnlSummary && (
        <div style={{
          background: '#101012',
          border: '1px solid #1f1f24',
          borderLeft: `4px solid ${pnlSummary.isProfitable ? '#10b981' : '#f43f5e'}`,
          borderRadius: '12px', padding: '20px 28px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {pnlSummary.isProfitable ? <TrendingUp size={14} color="#10b981" /> : <TrendingDown size={14} color="#f43f5e" />}
              <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                12-Month P&L Summary
              </p>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '800', color: pnlSummary.isProfitable ? '#10b981' : '#f43f5e', marginTop: '4px' }}>
              {pnlSummary.isProfitable ? '+' : ''}{fmt(pnlSummary.netProfit, sym)}
            </p>
            <p style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
              Net {pnlSummary.isProfitable ? 'Profit' : 'Loss'} • {pnlSummary.netMargin}% margin
            </p>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Income (AR)</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', marginTop: '4px' }}>{fmt(pnlSummary.totalIncome, sym)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Payables (AP)</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b', marginTop: '4px' }}>{fmt(pnlSummary.totalPayables, sym)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Expenses</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#f43f5e', marginTop: '4px' }}>{fmt(pnlSummary.totalExpenses, sym)}</p>
            </div>
          </div>
          <Link to="/expenses" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Manage Expenses →
          </Link>
        </div>
      )}

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Cash Flow Chart */}
        <div style={{ background: '#101012', border: '1px solid #1f1f24', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontWeight: '700', color: '#ffffff', marginBottom: '4px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} className="text-slate-400" />
            Cash Flow (Last 6 Months)
          </h3>
          <p style={{ fontSize: '11px', color: '#475569', marginBottom: '16px' }}>Income vs. Total Outflow vs. Net Profit</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cashflowData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f1f24" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCompact(v, sym)} />
              <Tooltip content={<ChartTooltip sym={sym} />} />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
              <Area type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={1.5} fill="url(#outflowGrad)" name="Outflow" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="netProfit" stroke="#ffffff" strokeWidth={2} dot={{ fill: '#ffffff', r: 3 }} name="Net Profit" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Line Chart */}
        <div style={{ background: '#101012', border: '1px solid #1f1f24', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontWeight: '700', color: '#ffffff', marginBottom: '4px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={16} className="text-slate-400" />
            Revenue Overview (12 Months)
          </h3>
          <p style={{ fontSize: '11px', color: '#475569', marginBottom: '16px' }}>Invoiced vs. Collected</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly}>
              <CartesianGrid stroke="#1f1f24" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v.split(' ')[0]} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCompact(v, sym)} />
              <Tooltip content={<ChartTooltip sym={sym} />} />
              <Line type="monotone" dataKey="totalPaid" stroke="#ffffff" strokeWidth={2} dot={{ fill: '#ffffff', r: 3 }} name="Collected" />
              <Line type="monotone" dataKey="totalInvoiced" stroke="#71717a" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Invoiced" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── P&L Statement + Status Pie ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '24px' }}>
        {/* P&L Statement */}
        <div style={{ background: '#101012', border: '1px solid #1f1f24', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f1f24', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: '700', color: '#ffffff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={16} className="text-slate-400" />
                Profit & Loss Statement
              </h3>
              <p style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Last 12 months — Accrual Basis</p>
            </div>
            <Link to="/expenses" style={{ fontSize: '11px', color: '#a1a1aa', textDecoration: 'none', fontWeight: 'bold' }} className="hover:text-white transition-colors">
              + Add Expense
            </Link>
          </div>

          {pnlSummary ? (
            <>
              <PnLRow icon={CreditCard} label="Accounts Receivable (AR)" sub="Revenue from paid invoices" value={fmt(pnlSummary.totalIncome, sym)} color="#22c55e" />
              <div style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.01)' }}>
                <p style={{ fontSize: '10px', color: '#334155', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>OUTFLOWS</p>
              </div>
              <PnLRow icon={Inbox} label="Accounts Payable (AP)" sub="Paid vendor invoices" value={`− ${fmt(pnlSummary.totalPayables, sym)}`} color="#f59e0b" />
              <PnLRow icon={TrendingDown} label="Business Expenses" sub="Rent, salaries, software, etc." value={`− ${fmt(pnlSummary.totalExpenses, sym)}`} color="#ef4444" />
              <div style={{ padding: '4px 0', background: 'rgba(255,255,255,0.02)', borderTop: '2px solid #1f1f24' }}>
                <PnLRow
                  icon={pnlSummary.isProfitable ? TrendingUp : TrendingDown}
                  label="Net Profit / Loss"
                  sub={`${pnlSummary.netMargin}% net margin`}
                  value={`${pnlSummary.isProfitable ? '+' : ''}${fmt(pnlSummary.netProfit, sym)}`}
                  color={pnlSummary.isProfitable ? '#22c55e' : '#ef4444'}
                  bold
                />
              </div>
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#475569', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FileSpreadsheet size={32} className="text-slate-600" style={{ marginBottom: '8px' }} />
              <p>No data yet. Start creating invoices and logging expenses.</p>
            </div>
          )}
        </div>

        {/* Invoice Status Pie */}
        <div style={{ background: '#101012', border: '1px solid #1f1f24', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontWeight: '700', color: '#ffffff', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieIcon size={16} className="text-slate-400" />
            Invoice Status
          </h3>
          {breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={breakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {breakdown.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || '#a1a1aa'} />
                  ))}
                </Pie>
                <Legend iconType="circle" formatter={(v) => <span style={{ fontSize: '11px', color: '#64748b' }}>{v}</span>} />
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#101012', border: '1px solid #1f1f24', borderRadius: '8px', color: '#ffffff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '13px' }}>
              No invoice data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Recent Invoices + Top Clients ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Recent Invoices */}
        <div style={{ background: '#101012', border: '1px solid #1f1f24', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1f1f24' }}>
            <h3 style={{ fontWeight: '700', color: '#ffffff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} className="text-slate-400" />
              Recent Invoices
            </h3>
            <Link to="/invoices" style={{ fontSize: '11px', color: '#a1a1aa', textDecoration: 'none', fontWeight: 'bold' }} className="hover:text-white transition-colors">View all →</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#475569', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FileText size={32} className="text-slate-600" style={{ marginBottom: '8px' }} />
              <p>No invoices yet</p>
              <Link to="/invoices/new" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '12px' }}>
                Create Invoice
              </Link>
            </div>
          ) : recentInvoices.map((inv) => (
            <Link key={inv._id} to={`/invoices/${inv._id}`} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 24px', borderBottom: '1px solid #1f1f24', textDecoration: 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{inv.invoiceNumber}</p>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{inv.client?.name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9' }}>{fmt(inv.total, inv.currencySymbol || sym)}</p>
                <span className={getBadge(inv.status)}>{inv.status}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Top Clients */}
        <div style={{ background: '#101012', border: '1px solid #1f1f24', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1f1f24' }}>
            <h3 style={{ fontWeight: '700', color: '#ffffff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} className="text-slate-400" />
              Top Clients
            </h3>
            <Link to="/clients" style={{ fontSize: '11px', color: '#a1a1aa', textDecoration: 'none', fontWeight: 'bold' }} className="hover:text-white transition-colors">View all →</Link>
          </div>
          {topClients.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#475569', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Users size={32} className="text-slate-600" style={{ marginBottom: '8px' }} />
              <p>No clients yet</p>
              <Link to="/clients" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '12px' }}>
                Add Client
              </Link>
            </div>
          ) : topClients.map((client, i) => (
            <div key={client._id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 24px', borderBottom: '1px solid #1f1f24' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                background: '#1f1f24',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '800', color: '#64748b',
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{client.name}</p>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{client.invoiceCount} invoices</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e' }}>{fmt(client.totalPaid, sym)}</p>
                <p style={{ fontSize: '11px', color: '#475569' }}>paid</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
