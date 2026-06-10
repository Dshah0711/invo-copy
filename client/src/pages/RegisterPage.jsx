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

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>
      {label}
    </label>
    {children}
    {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
  </div>
);

const inputStyle = (hasError) => ({
  width: '100%',
  background: '#101012',
  border: `1px solid ${hasError ? '#ef4444' : '#1f1f24'}`,
  borderRadius: '10px',
  padding: '12px 16px',
  color: '#f1f5f9',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  fontFamily: "'Outfit', sans-serif",
});

const RegisterPage = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerUser({ name: data.name, email: data.email, password: data.password, company: data.company });
      toast.success('Account created! Welcome to InvoAI');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const EyeToggle = ({ show, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: 'absolute', right: '14px', top: '50%',
        transform: 'translateY(-50%)', background: 'none', border: 'none',
        cursor: 'pointer', color: '#4b5563', padding: '0',
      }}
    >
      {show ? (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#080809', fontFamily: "'Outfit', sans-serif" }}>

      {/* Dot-grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, #ffffff0d 1px, transparent 1px)',
        backgroundSize: '28px 28px'
      }} />

      {/* Glow orb */}
      <div className="absolute pointer-events-none" style={{
        top: '-200px', right: '-200px',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)'
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: '-200px', left: '-200px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)'
      }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[440px] mx-4 my-8" style={{ animation: 'slideUp 0.35s ease-out' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <DocIcon />
          <div className="font-bold text-white text-lg tracking-tight">
            Invo<span style={{ color: '#94a3b8' }}>AI</span>
          </div>
        </div>

        {/* Panel */}
        <div style={{
          background: '#0d0d0f',
          border: '1px solid #1f1f24',
          borderRadius: '16px',
          padding: '36px 32px',
        }}>
          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
              Create your account
            </h1>
            <p className="text-sm" style={{ color: '#6b7280' }}>
              Start managing invoices the smart way
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Name + Company row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name *" error={errors.name?.message}>
                <input
                  {...register('name', { required: 'Required' })}
                  placeholder="Jane Doe"
                  style={inputStyle(!!errors.name)}
                  onFocus={e => e.target.style.borderColor = '#3a3a44'}
                  onBlur={e => e.target.style.borderColor = errors.name ? '#ef4444' : '#1f1f24'}
                />
              </Field>
              <Field label="Company">
                <input
                  {...register('company')}
                  placeholder="Acme Ltd."
                  style={inputStyle(false)}
                  onFocus={e => e.target.style.borderColor = '#3a3a44'}
                  onBlur={e => e.target.style.borderColor = '#1f1f24'}
                />
              </Field>
            </div>

            {/* Email */}
            <Field label="Email Address *" error={errors.email?.message}>
              <input
                {...register('email', {
                  required: 'Required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' }
                })}
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                style={inputStyle(!!errors.email)}
                onFocus={e => e.target.style.borderColor = '#3a3a44'}
                onBlur={e => e.target.style.borderColor = errors.email ? '#ef4444' : '#1f1f24'}
              />
            </Field>

            {/* Password */}
            <Field label="Password *" error={errors.password?.message}>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password', {
                    required: 'Required',
                    minLength: { value: 6, message: 'Minimum 6 characters' }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.password), paddingRight: '44px' }}
                  onFocus={e => e.target.style.borderColor = '#3a3a44'}
                  onBlur={e => e.target.style.borderColor = errors.password ? '#ef4444' : '#1f1f24'}
                />
                <EyeToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
              </div>
            </Field>

            {/* Confirm Password */}
            <Field label="Confirm Password *" error={errors.confirm?.message}>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('confirm', {
                    required: 'Required',
                    validate: v => v === watch('password') || 'Passwords do not match'
                  })}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.confirm), paddingRight: '44px' }}
                  onFocus={e => e.target.style.borderColor = '#3a3a44'}
                  onBlur={e => e.target.style.borderColor = errors.confirm ? '#ef4444' : '#1f1f24'}
                />
                <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
              </div>
            </Field>

            {/* Submit */}
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
                fontFamily: "'Outfit', sans-serif",
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
                  Creating account...
                </>
              ) : 'Create Free Account'}
            </button>
          </form>

          {/* Sign in link */}
          <p className="text-center text-xs font-medium mt-6" style={{ color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#ffffff', fontWeight: '600', textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>

        {/* Terms */}
        <p className="text-center text-[10px] mt-5 uppercase tracking-widest font-semibold" style={{ color: '#374151' }}>
          By creating an account, you agree to our Terms &amp; Privacy Policy
        </p>
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

export default RegisterPage;
