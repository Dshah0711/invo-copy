import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham (د.إ)' },
];

const PAYMENT_TERMS = [7, 14, 15, 30, 45, 60, 90];

export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    company: user?.company || '',
    phone: user?.phone || '',
    gstNumber: user?.gstNumber || '',
    currency: user?.currency || 'INR',
    currencySymbol: user?.currencySymbol || '₹',
    invoicePrefix: user?.invoicePrefix || 'INV',
    paymentTerms: user?.paymentTerms || 30,
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      pincode: user?.address?.pincode || '',
      country: user?.address?.country || 'India',
    },
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(user?.logo || null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  const fileInputRef = useRef();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCurrencyChange = (e) => {
    const cur = CURRENCIES.find((c) => c.code === e.target.value);
    if (cur) setForm((prev) => ({ ...prev, currency: cur.code, currencySymbol: cur.symbol }));
  };

  const processFile = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be smaller than 5MB.');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('company', form.company);
      formData.append('phone', form.phone);
      formData.append('gstNumber', form.gstNumber);
      formData.append('currency', form.currency);
      formData.append('currencySymbol', form.currencySymbol);
      formData.append('invoicePrefix', form.invoicePrefix);
      formData.append('paymentTerms', form.paymentTerms);
      formData.append('address', JSON.stringify(form.address));
      if (logoFile) formData.append('logo', logoFile);

      const { data } = await updateProfile(formData);
      updateUser(data.user);
      if (data.user.logo) setLogoPreview(data.user.logo);
      toast.success('✅ Business settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const prefixPreview = `${form.invoicePrefix}-${new Date().getFullYear()}-0001`;
  const sym = CURRENCIES.find((c) => c.code === form.currency)?.symbol || '₹';

  const tabs = [
    { id: 'business', label: 'Business Info', icon: '🏢' },
    { id: 'branding', label: 'Logo & Brand', icon: '🎨' },
    { id: 'invoice', label: 'Invoice Settings', icon: '📄' },
  ];

  return (
    <Layout title="Business Settings">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
            ⚙️ Business Settings
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>
            Customize your business profile — your logo and details will appear on every PDF invoice.
          </p>
        </div>

        {/* Live PDF Preview Banner */}
        <div style={{
          background: '#101012',
          border: '1px solid #1f1f24',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}>
          {/* Logo preview */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '8px', flexShrink: 0, overflow: 'hidden',
            background: logoPreview ? 'transparent' : '#141417',
            border: '1px solid #1f1f24',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {logoPreview
              ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '20px' }}>
                  {(form.company || form.name || 'B').charAt(0).toUpperCase()}
                </span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#ffffff' }}>
              {form.company || form.name || 'Your Business Name'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{user?.email}</div>
            {form.gstNumber && <div style={{ fontSize: '10px', color: '#a1a1aa', marginTop: '2px' }}>GST: {form.gstNumber}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', letterSpacing: '2px' }}>INVOICE</div>
            <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>{prefixPreview}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
              Net {form.paymentTerms} days • {form.currency} {sym}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #1f1f24', paddingBottom: '0' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#000000' : '#a1a1aa',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Business Info Tab ── */}
          {activeTab === 'business' && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Your Name *" id="name" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required />
                <Field label="Company / Business Name" id="company" name="company" value={form.company} onChange={handleChange} placeholder="Acme Corp Pvt. Ltd." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Phone Number" id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                <Field label="GST Number" id="gstNumber" name="gstNumber" value={form.gstNumber} onChange={handleChange} placeholder="22AAAAA0000A1Z5" />
              </div>

              <SectionLabel>📍 Business Address</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Street Address" id="street" name="address.street" value={form.address.street} onChange={handleChange} placeholder="123 Main Street" />
                <Field label="City" id="city" name="address.city" value={form.address.city} onChange={handleChange} placeholder="Mumbai" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <Field label="State" id="state" name="address.state" value={form.address.state} onChange={handleChange} placeholder="Maharashtra" />
                <Field label="Pincode" id="pincode" name="address.pincode" value={form.address.pincode} onChange={handleChange} placeholder="400001" />
                <Field label="Country" id="country" name="address.country" value={form.address.country} onChange={handleChange} placeholder="India" />
              </div>
            </div>
          )}

          {/* ── Logo & Brand Tab ── */}
          {activeTab === 'branding' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <SectionLabel>🖼️ Company Logo</SectionLabel>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-16px' }}>
                Upload your logo to appear on all PDF invoices. Recommended: PNG with transparent background, min 200x200px.
              </p>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `1px dashed ${isDragging ? '#ffffff' : '#1f1f24'}`,
                  borderRadius: '12px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? 'rgba(255,255,255,0.02)' : '#101012',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
                {logoPreview ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      style={{ maxWidth: '160px', maxHeight: '100px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #1f1f24' }}
                    />
                    <p style={{ fontSize: '12px', color: '#a1a1aa' }}>Click or drag to replace</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeLogo(); }}
                      style={{
                        padding: '6px 16px', borderRadius: '6px', border: '1px solid #f43f5e',
                        background: 'transparent', color: '#f43f5e', fontSize: '11px', cursor: 'pointer', fontWeight: '600',
                      }}
                    >
                      🗑️ Remove Logo
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📷</div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#a1a1aa', marginBottom: '6px' }}>
                      Drop your logo here or click to browse
                    </p>
                    <p style={{ fontSize: '11px', color: '#475569' }}>PNG, JPG, WEBP • Max 5MB</p>
                  </div>
                )}
              </div>
 
              {/* Logo preview on invoice card */}
              {logoPreview && (
                <div style={{
                  background: 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: '8px', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <span style={{ fontSize: '16px' }}>✅</span>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '650', color: '#10b981' }}>Logo ready!</p>
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Your logo will appear in the top-left corner of every PDF invoice.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Invoice Settings Tab ── */}
          {activeTab === 'invoice' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Currency */}
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                    Default Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={handleCurrencyChange}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '8px',
                      border: '1px solid #1f1f24', background: '#141417',
                      color: '#e2e8f0', fontSize: '14px', cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
 
                {/* Payment Terms */}
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                    Default Payment Terms
                  </label>
                  <select
                    value={form.paymentTerms}
                    onChange={(e) => setForm((p) => ({ ...p, paymentTerms: Number(e.target.value) }))}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '8px',
                      border: '1px solid #1f1f24', background: '#141417',
                      color: '#e2e8f0', fontSize: '14px', cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {PAYMENT_TERMS.map((t) => (
                      <option key={t} value={t}>Net {t} days</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Invoice Prefix */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                  Invoice Number Prefix
                </label>
                <input
                  name="invoicePrefix"
                  value={form.invoicePrefix}
                  onChange={handleChange}
                  placeholder="INV"
                  maxLength={10}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '8px',
                    border: '1px solid #1f1f24', background: '#141417',
                    color: '#e2e8f0', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
 
              {/* Preview */}
              <div style={{
                background: '#141417',
                border: '1px solid #1f1f24',
                borderRadius: '8px', padding: '20px 24px',
              }}>
                <p style={{ fontSize: '10px', fontWeight: '700', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                  Live Preview
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Invoice Number</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', letterSpacing: '1px' }}>{prefixPreview}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Currency</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{sym} {form.currency}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Payment Terms</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>Net {form.paymentTerms}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setForm({
                  name: user?.name || '', company: user?.company || '', phone: user?.phone || '',
                  gstNumber: user?.gstNumber || '', currency: user?.currency || 'INR',
                  currencySymbol: user?.currencySymbol || '₹', invoicePrefix: user?.invoicePrefix || 'INV',
                  paymentTerms: user?.paymentTerms || 30,
                  address: user?.address || { street: '', city: '', state: '', pincode: '', country: 'India' },
                });
                setLogoFile(null);
                setLogoPreview(user?.logo || null);
                toast('Changes discarded.', { icon: '↩️' });
              }}
              style={{
                padding: '12px 24px', borderRadius: '8px', border: '1px solid #1f1f24',
                background: 'transparent', color: '#a1a1aa', fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px'
              }}
              className="hover:bg-dark-600 hover:text-white"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 32px', borderRadius: '8px', border: 'none',
                background: saving ? '#141417' : '#ffffff',
                color: saving ? '#71717a' : '#000000', fontSize: '12px', fontWeight: '700',
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}
              className={saving ? '' : 'hover:bg-neutral-200'}
            >
              {saving ? '⏳ Saving...' : '💾 Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
 
// ── Helper components ──────────────────────────────
function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: '10px', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '1px', margin: '8px 0 -8px' }}>
      {children}
    </p>
  );
}
 
function Field({ label, id, name, value, onChange, placeholder, required, type = 'text' }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: '8px',
          border: '1px solid #1f1f24', background: '#141417',
          color: '#e2e8f0', fontSize: '14px', outline: 'none',
          boxSizing: 'border-box', transition: 'border-color 0.2s',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#2a2a32')}
        onBlur={(e) => (e.target.style.borderColor = '#1f1f24')}
      />
    </div>
  );
}
