import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnalyticsSummary, getMonthlyData, getStatusBreakdown, getTopClients, getInvoices } from '../services/api';
import Layout from '../components/Layout';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const fmt = (n, sym = '₹') => `${sym}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const STATUS_COLORS = { Paid: '#22c55e', Sent: '#3b82f6', Draft: '#64748b', Overdue: '#ef4444', Cancelled: '#94a3b8' };

const StatCard = ({ icon, label, value, sub, color = 'primary' }) => {
  const colorMap = {
    primary: 'from-primary-500/20 to-violet-500/10 text-primary-400',
    green: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400',
    red: 'from-red-500/20 to-red-600/10 text-red-400',
    amber: 'from-amber-500/20 to-amber-600/10 text-amber-400',
  };
  return (
    <div className="stat-card animate-fade-in">
      <div className={`stat-icon bg-gradient-to-br ${colorMap[color]}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-100 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="card-glass p-3 border border-dark-400">
        <p className="text-xs text-slate-400 mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
            {p.name}: {fmt(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, m, b, t, r] = await Promise.all([
          getAnalyticsSummary(), getMonthlyData(), getStatusBreakdown(),
          getTopClients(), getInvoices({ limit: 5, sortBy: 'createdAt', order: 'desc' }),
        ]);
        setSummary(s.data.data);
        setMonthly(m.data.data);
        setBreakdown(b.data.data.map(d => ({ name: d._id, value: d.count, amount: d.amount })));
        setTopClients(t.data.data);
        setRecentInvoices(r.data.data);
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="card p-5 h-24 animate-pulse bg-dark-700" />)}
      </div>
    </Layout>
  );

  return (
    <Layout title="Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon="💰" label="Total Revenue" value={fmt(summary?.totalRevenue)} sub="All time paid" color="green" />
        <StatCard icon="⏳" label="Outstanding" value={fmt(summary?.outstanding)} sub={`${summary?.totalInvoices || 0} total invoices`} color="primary" />
        <StatCard icon="🔴" label="Overdue" value={`${summary?.overdueCount || 0} invoices`} sub={fmt(summary?.overdueAmount)} color="red" />
        <StatCard icon="📋" label="This Month" value={`${summary?.thisMonthCount || 0} invoices`} sub={`${summary?.totalClients || 0} clients total`} color="amber" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 card p-6">
          <h3 className="font-semibold text-slate-200 mb-4">Revenue Overview (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly}>
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="totalPaid" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} name="Paid" />
              <Line type="monotone" dataKey="totalInvoiced" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Invoiced" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-200 mb-4">Invoice Status</h3>
          {breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={breakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {breakdown.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Pie>
                <Legend iconType="circle" formatter={(v) => <span className="text-xs text-slate-400">{v}</span>} />
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No invoice data yet</div>}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-dark-600">
            <h3 className="font-semibold text-slate-200">Recent Invoices</h3>
            <Link to="/invoices" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
          </div>
          <div className="divide-y divide-dark-600">
            {recentInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <p className="text-2xl mb-2">📄</p>
                <p>No invoices yet</p>
                <Link to="/invoices/new" className="btn-primary mt-3 inline-flex text-xs">Create Invoice</Link>
              </div>
            ) : recentInvoices.map((inv) => (
              <Link key={inv._id} to={`/invoices/${inv._id}`} className="flex items-center justify-between p-4 hover:bg-dark-600/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-200">{inv.invoiceNumber}</p>
                  <p className="text-xs text-slate-400">{inv.client?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-100">{fmt(inv.total, inv.currencySymbol)}</p>
                  <span className={getBadge(inv.status)}>{inv.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Clients */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-dark-600">
            <h3 className="font-semibold text-slate-200">Top Clients</h3>
            <Link to="/clients" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
          </div>
          <div className="divide-y divide-dark-600">
            {topClients.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <p className="text-2xl mb-2">👥</p>
                <p>No clients yet</p>
                <Link to="/clients" className="btn-primary mt-3 inline-flex text-xs">Add Client</Link>
              </div>
            ) : topClients.map((client, i) => (
              <div key={client._id} className="flex items-center gap-4 p-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/30 to-violet-500/30 flex items-center justify-center text-sm font-bold text-primary-400 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">{client.name}</p>
                  <p className="text-xs text-slate-400">{client.invoiceCount} invoices</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-400">{fmt(client.totalPaid)}</p>
                  <p className="text-xs text-slate-500">paid</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
