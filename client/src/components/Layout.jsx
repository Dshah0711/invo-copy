import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationsRead } from '../services/api';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Inbox, 
  Users, 
  TrendingDown, 
  Settings, 
  Bell, 
  LogOut 
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/invoices/new', icon: PlusCircle, label: 'New Invoice' },
  { to: '/payables', icon: Inbox, label: 'Payables' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/expenses', icon: TrendingDown, label: 'Expenses' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const Logo = () => (
  <div className="flex items-center gap-2.5">
    {/* Clean document-stack mark — no gradients, looks like a real product logo */}
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back document */}
      <rect x="5" y="7" width="16" height="19" rx="2.5" fill="#2a2a32" stroke="#3a3a44" strokeWidth="1"/>
      {/* Front document */}
      <rect x="7" y="4" width="16" height="19" rx="2.5" fill="#ffffff" />
      {/* Lines on document */}
      <rect x="10" y="9" width="10" height="1.5" rx="0.75" fill="#d4d4d8" />
      <rect x="10" y="12.5" width="7" height="1.5" rx="0.75" fill="#e4e4e7" />
      <rect x="10" y="16" width="9" height="1.5" rx="0.75" fill="#e4e4e7" />
    </svg>
    <div>
      <div className="font-bold text-white text-[15px] tracking-tight leading-none font-sans">
        Invo<span className="text-slate-400 font-semibold">AI</span>
      </div>
      <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mt-0.5">Smart Invoice</div>
    </div>
  </div>
);

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-dark-900 border-r border-dark-500 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-dark-500">
        <Logo />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-4 mb-3">Main Menu</p>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4 h-4 nav-icon transition-colors" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-dark-500">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-700 mb-3 border border-dark-500/60 shadow-glow">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 border border-cyan-400/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden shadow-inner">
            {user?.logo
              ? <img src={user.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : (user?.name || 'U').charAt(0).toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full btn-secondary text-[10px] justify-center py-2.5 flex items-center gap-2">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );
};

const TopBar = ({ title }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    getNotifications().then(({ data }) => setNotifications(data.data || [])).catch(() => {});
  }, []);

  const unread = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async () => {
    await markNotificationsRead([]);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-dark-800/80 backdrop-blur-sm border-b border-dark-500 flex items-center justify-between px-6 z-30">
      <h1 className="text-sm font-bold uppercase tracking-wider text-slate-200">{title}</h1>
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-lg bg-dark-700 border border-dark-500 hover:bg-dark-600 text-slate-400 hover:text-slate-100 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-black text-[9px] rounded-full flex items-center justify-center font-black">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 card z-50 animate-slide-up">
              <div className="flex items-center justify-between p-4 border-b border-dark-500">
                <span className="font-bold text-xs uppercase tracking-wider text-white">Notifications</span>
                {unread > 0 && (
                  <button onClick={handleMarkRead} className="text-[10px] font-bold text-white uppercase hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs uppercase tracking-wide">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div key={n._id} className={`p-4 border-b border-dark-500 last:border-0 ${!n.isRead ? 'bg-white/5' : ''}`}>
                      <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{n.message}</p>
                      <p className="text-[9px] text-slate-600 mt-1 uppercase font-semibold">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const Layout = ({ children, title = 'InvoAI' }) => {
  return (
    <div className="flex min-h-screen bg-dark-800">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <TopBar title={title} />
        <main className="flex-1 p-6 pt-22 mt-16 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
