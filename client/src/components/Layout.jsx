import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationsRead } from '../services/api';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/invoices', icon: '📄', label: 'Invoices' },
  { to: '/invoices/new', icon: '✏️', label: 'New Invoice' },
  { to: '/payables', icon: '📥', label: 'Payables' },
  { to: '/clients', icon: '👥', label: 'Clients' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-dark-900 border-r border-dark-600 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-glow">
            I
          </div>
          <div>
            <div className="font-bold text-white text-lg leading-none">InvoAI</div>
            <div className="text-xs text-slate-500 mt-0.5">Smart Invoicing</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs text-slate-600 font-semibold uppercase tracking-widest px-4 mb-3">Main Menu</p>
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-dark-600">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-700 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
            {user?.logo
              ? <img src={user.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : (user?.name || 'U').charAt(0).toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full btn-secondary text-xs justify-center">
          🚪 Sign Out
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
    <header className="fixed top-0 right-0 left-64 h-16 bg-dark-800/80 backdrop-blur-sm border-b border-dark-600 flex items-center justify-between px-6 z-30">
      <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="btn-icon relative"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 card shadow-glow-lg z-50 animate-slide-up">
              <div className="flex items-center justify-between p-4 border-b border-dark-500">
                <span className="font-semibold text-sm">Notifications</span>
                {unread > 0 && (
                  <button onClick={handleMarkRead} className="text-xs text-primary-400 hover:text-primary-300">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div key={n._id} className={`p-4 border-b border-dark-600 last:border-0 ${!n.isRead ? 'bg-primary-500/5' : ''}`}>
                      <p className="text-sm font-medium text-slate-200">{n.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                      <p className="text-xs text-slate-600 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
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
