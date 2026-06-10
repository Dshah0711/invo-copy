import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DocIcon = () => (
  <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="7" width="16" height="19" rx="2.5" fill="#2a2a32" stroke="#3a3a44" strokeWidth="1"/>
    <rect x="7" y="4" width="16" height="19" rx="2.5" fill="#ffffff" />
    <rect x="10" y="9" width="10" height="1.5" rx="0.75" fill="#d4d4d8" />
    <rect x="10" y="12.5" width="7" height="1.5" rx="0.75" fill="#e4e4e7" />
    <rect x="10" y="16" width="9" height="1.5" rx="0.75" fill="#e4e4e7" />
  </svg>
);

const FEATURES = [
  { label: 'Invoice Generation', desc: 'Create & send professional invoices instantly' },
  { label: 'AP Document Parser', desc: 'Auto-extract vendor invoice data with AI' },
  { label: 'Financial Dashboards', desc: 'Real-time P&L and cash flow insights' },
  { label: 'Automated Reminders', desc: 'Smart follow-ups for overdue payments' },
];

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');
    try {
      await login(data);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#080809', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden border-r" style={{ borderColor: '#1f1f24' }}>

        {/* Dot-grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, #ffffff0d 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }} />

        {/* Glow orb */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle at 30% 80%, rgba(99,102,241,0.07) 0%, transparent 65%)'
        }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <DocIcon />
          <div className="font-bold text-white text-lg tracking-tight">
            Invo<span style={{ color: '#94a3b8' }}>AI</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-6" style={{ background: '#ffffff08', color: '#6b7280', border: '1px solid #1f1f24' }}>
            ✦ Smart Finance Automation
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            Smart Invoicing.<br />
            <span style={{ color: '#94a3b8' }}>Simplified.</span>
          </h2>
          <p className="text-sm leading-relaxed mb-10" style={{ color: '#6b7280' }}>
            Generate professional invoices, parse vendor documents with AI, and monitor your cash flow — all in one place.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {FEATURES.map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#ffffff0a', border: '1px solid #2a2a32' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 2.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white uppercase tracking-wide">{label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#4b5563' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-[11px] font-medium uppercase tracking-widest" style={{ color: '#374151' }}>
          © {new Date().getFullYear()} InvoAI · All rights reserved
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: '#080809' }}>
        <div className="w-full max-w-[400px]" style={{ animation: 'slideUp 0.35s ease-out' }}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <DocIcon />
            <div className="font-bold text-white text-lg tracking-tight">
              Invo<span style={{ color: '#94a3b8' }}>AI</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
              Welcome back
            </h1>
            <p className="text-sm" style={{ color: '#6b7280' }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Server error banner */}
          {serverError && (
            <div style={{
              background: '#2a0a0a',
              border: '1px solid #7f1d1d',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: '500' }}>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" onChange={() => setServerError('')}>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>
                Email Address
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' }
                })}
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                style={{
                  width: '100%',
                  background: '#101012',
                  border: `1px solid ${errors.email ? '#ef4444' : '#1f1f24'}`,
                  borderRadius: '10px',
                  padding: '13px 16px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#3a3a44'}
                onBlur={e => e.target.style.borderColor = errors.email ? '#ef4444' : '#1f1f24'}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Minimum 6 characters' }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    background: '#101012',
                    border: `1px solid ${errors.password ? '#ef4444' : '#1f1f24'}`,
                    borderRadius: '10px',
                    padding: '13px 44px 13px 16px',
                    color: '#f1f5f9',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#3a3a44'}
                  onBlur={e => e.target.style.borderColor = errors.password ? '#ef4444' : '#1f1f24'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                    cursor: 'pointer', color: '#4b5563', padding: '0',
                  }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#1f1f24' : '#ffffff',
                color: loading ? '#6b7280' : '#000000',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '14px', height: '14px',
                    border: '2px solid #3a3a44',
                    borderTopColor: '#6b7280',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px" style={{ background: '#1f1f24' }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#374151' }}>or</span>
            <div className="flex-1 h-px" style={{ background: '#1f1f24' }} />
          </div>

          {/* Register link */}
          <p className="text-center text-xs font-medium" style={{ color: '#6b7280' }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{ color: '#ffffff', fontWeight: '600', textDecoration: 'none' }}
            >
              Create one free →
            </Link>
          </p>

          {/* Trust badge */}
          <p className="text-center text-[10px] mt-8 uppercase tracking-widest font-semibold" style={{ color: '#374151' }}>
            Secured · Enterprise-grade encryption
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: #374151 !important; }
      `}</style>
    </div>
  );
};

export default LoginPage;
