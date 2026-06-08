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

const fmt = (n, sym = '₹') =>
  `${sym}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const fmtCompact = (v, sym = '₹') => {
  const n = Number(v || 0);
  if (n >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}k`;
  return `${sym}${n.toFixed(0)}`;
};

const STATUS_COLORS = { Paid: '#22c55e', Sent: '#3b82f6', Draft: '#64748b', Overdue: '#ef4444', Cancelled: '#94a3b8' };

// ── KPI Card ──────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = 'primary', trend }) => {
  const colorMap = {
    primary: { bg: 'rgba(99,102,241,0.15)', icon: '#6366f1' },
    green: { bg: 'rgba(34,197,94,0.12)', icon: '#22c55e' },
    red: { bg: 'rgba(239,68,68,0.12)', icon: '#ef4444' },
    amber: { bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' },
    violet: { bg: 'rgba(139,92,246,0.12)', icon: '#8b5cf6' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <div style={{
      background: '#141d35', border: '1px solid #1e2a45', borderRadius: '20px',
      padding: '22px', display: 'flex', alignItems: 'flex-start', gap: '16px',
      transition: 'border-color 0.2s', cursor: 'default',
    }}>
      <div style={{
        width: '50px', height: '50px', borderRadius: '14px', flexShrink: 0,
        background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </p>
        <p style={{ fontSize: '24px', fontWeight: '800', color: '#f1f5f9', marginTop: '6px', lineHeight: '1' }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>{sub}</p>}
      </div>
    </div>
  );
};

// ── Chart Tooltip ─────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, sym }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: '#141d35', border: '1px solid #2d3a5e', borderRadius: '12px',
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
const PnLRow = ({ label, value, sub, color, icon, bold }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid #1a2540',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>
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
          <div key={i} style={{ background: '#141d35', borderRadius: '20px', height: '100px', animation: 'pulse 1.5s infinite' }} />
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
        <StatCard icon="💰" label="Total Revenue" value={fmt(summary?.totalRevenue, sym)} sub="All time paid" color="green" />
        <StatCard icon="⏳" label="Outstanding" value={fmt(summary?.outstanding, sym)} sub={`${summary?.totalInvoices || 0} invoices total`} color="primary" />
        <StatCard icon="🚨" label="Overdue" value={fmt(summary?.overdueAmount, sym)} sub={`${summary?.overdueCount || 0} overdue invoices`} color="red" />
        <StatCard icon="📋" label="This Month" value={`${summary?.thisMonthCount || 0} invoices`} sub={`${summary?.totalClients || 0} clients total`} color="amber" />
      </div>

      {/* ── P&L Summary Banner ── */}
      {pnlSummary && (
        <div style={{
          background: pnlSummary.isProfitable
            ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(16,185,129,0.04) 100%)'
            : 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.04) 100%)',
          border: `1px solid ${pnlSummary.isProfitable ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: '20px', padding: '20px 28px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {pnlSummary.isProfitable ? '📈' : '📉'} 12-Month P&L Summary
            </p>
            <p style={{ fontSize: '28px', fontWeight: '800', color: pnlSummary.isProfitable ? '#22c55e' : '#ef4444', marginTop: '4px' }}>
              {pnlSummary.isProfitable ? '+' : ''}{fmt(pnlSummary.netProfit, sym)}
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Net {pnlSummary.isProfitable ? 'Profit' : 'Loss'} • {pnlSummary.netMargin}% margin
            </p>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Income (AR)</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#22c55e', marginTop: '4px' }}>{fmt(pnlSummary.totalIncome, sym)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Payables (AP)</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b', marginTop: '4px' }}>{fmt(pnlSummary.totalPayables, sym)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Expenses</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444', marginTop: '4px' }}>{fmt(pnlSummary.totalExpenses, sym)}</p>
            </div>
          </div>
          <Link to="/expenses" style={{
            padding: '10px 20px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)',
            color: '#a5b4fc', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
            border: '1px solid rgba(99,102,241,0.3)',
          }}>
            Manage Expenses →
          </Link>
        </div>
      )}

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Cash Flow Chart */}
        <div style={{ background: '#141d35', border: '1px solid #1e2a45', borderRadius: '20px', padding: '24px' }}>
          <h3 style={{ fontWeight: '700', color: '#e2e8f0', marginBottom: '4px', fontSize: '15px' }}>💹 Cash Flow (Last 6 Months)</h3>
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>Income vs. Total Outflow vs. Net Profit</p>
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
              <CartesianGrid stroke="#1a2540" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCompact(v, sym)} />
              <Tooltip content={<ChartTooltip sym={sym} />} />
              <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2.5} fill="url(#incomeGrad)" name="Income" />
              <Area type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} fill="url(#outflowGrad)" name="Outflow" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="netProfit" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} name="Net Profit" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Line Chart */}
        <div style={{ background: '#141d35', border: '1px solid #1e2a45', borderRadius: '20px', padding: '24px' }}>
          <h3 style={{ fontWeight: '700', color: '#e2e8f0', marginBottom: '4px', fontSize: '15px' }}>📊 Revenue Overview (12 Months)</h3>
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>Invoiced vs. Collected</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly}>
              <CartesianGrid stroke="#1a2540" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v.split(' ')[0]} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtCompact(v, sym)} />
              <Tooltip content={<ChartTooltip sym={sym} />} />
              <Line type="monotone" dataKey="totalPaid" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} name="Collected" />
              <Line type="monotone" dataKey="totalInvoiced" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Invoiced" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── P&L Statement + Status Pie ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '24px' }}>
        {/* P&L Statement */}
        <div style={{ background: '#141d35', border: '1px solid #1e2a45', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a2540', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: '700', color: '#e2e8f0', fontSize: '15px' }}>📋 Profit & Loss Statement</h3>
              <p style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Last 12 months — Accrual Basis</p>
            </div>
            <Link to="/expenses" style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', fontWeight: '600' }}>
              + Add Expense
            </Link>
          </div>

          {pnlSummary ? (
            <>
              <PnLRow icon="💳" label="Accounts Receivable (AR)" sub="Revenue from paid invoices" value={fmt(pnlSummary.totalIncome, sym)} color="#22c55e" />
              <div style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.01)' }}>
                <p style={{ fontSize: '10px', color: '#334155', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>OUTFLOWS</p>
              </div>
              <PnLRow icon="📥" label="Accounts Payable (AP)" sub="Paid vendor invoices" value={`− ${fmt(pnlSummary.totalPayables, sym)}`} color="#f59e0b" />
              <PnLRow icon="💸" label="Business Expenses" sub="Rent, salaries, software, etc." value={`− ${fmt(pnlSummary.totalExpenses, sym)}`} color="#ef4444" />
              <div style={{ padding: '4px 0', background: 'rgba(99,102,241,0.05)', borderTop: '2px solid #1e2a45' }}>
                <PnLRow
                  icon={pnlSummary.isProfitable ? '📈' : '📉'}
                  label="Net Profit / Loss"
                  sub={`${pnlSummary.netMargin}% net margin`}
                  value={`${pnlSummary.isProfitable ? '+' : ''}${fmt(pnlSummary.netProfit, sym)}`}
                  color={pnlSummary.isProfitable ? '#22c55e' : '#ef4444'}
                  bold
                />
              </div>
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>
              <p style={{ fontSize: '30px', marginBottom: '8px' }}>📊</p>
              <p>No data yet. Start creating invoices and logging expenses.</p>
            </div>
          )}
        </div>

        {/* Invoice Status Pie */}
        <div style={{ background: '#141d35', border: '1px solid #1e2a45', borderRadius: '20px', padding: '24px' }}>
          <h3 style={{ fontWeight: '700', color: '#e2e8f0', marginBottom: '16px', fontSize: '15px' }}>🥧 Invoice Status</h3>
          {breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={breakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {breakdown.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Pie>
                <Legend iconType="circle" formatter={(v) => <span style={{ fontSize: '11px', color: '#64748b' }}>{v}</span>} />
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#141d35', border: '1px solid #2d3a5e', borderRadius: '10px', color: '#e2e8f0' }} />
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
        <div style={{ background: '#141d35', border: '1px solid #1e2a45', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1a2540' }}>
            <h3 style={{ fontWeight: '700', color: '#e2e8f0', fontSize: '15px' }}>🕐 Recent Invoices</h3>
            <Link to="/invoices" style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', fontWeight: '600' }}>View all →</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#475569' }}>
              <p style={{ fontSize: '28px', marginBottom: '8px' }}>📄</p>
              <p>No invoices yet</p>
              <Link to="/invoices/new" style={{ display: 'inline-block', marginTop: '12px', padding: '8px 16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>
                Create Invoice
              </Link>
            </div>
          ) : recentInvoices.map((inv) => (
            <Link key={inv._id} to={`/invoices/${inv._id}`} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 24px', borderBottom: '1px solid #1a2540', textDecoration: 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
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
        <div style={{ background: '#141d35', border: '1px solid #1e2a45', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1a2540' }}>
            <h3 style={{ fontWeight: '700', color: '#e2e8f0', fontSize: '15px' }}>🏆 Top Clients</h3>
            <Link to="/clients" style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', fontWeight: '600' }}>View all →</Link>
          </div>
          {topClients.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#475569' }}>
              <p style={{ fontSize: '28px', marginBottom: '8px' }}>👥</p>
              <p>No clients yet</p>
              <Link to="/clients" style={{ display: 'inline-block', marginTop: '12px', padding: '8px 16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>
                Add Client
              </Link>
            </div>
          ) : topClients.map((client, i) => (
            <div key={client._id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 24px', borderBottom: '1px solid #1a2540' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                background: `hsl(${(i * 60 + 240) % 360}, 60%, 25%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '800', color: `hsl(${(i * 60 + 240) % 360}, 80%, 70%)`,
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
