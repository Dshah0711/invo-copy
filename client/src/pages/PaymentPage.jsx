import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

let apiBaseUrl = import.meta.env.VITE_API_URL;
if (apiBaseUrl && !apiBaseUrl.endsWith('/api') && !apiBaseUrl.endsWith('/api/')) {
  apiBaseUrl = apiBaseUrl.replace(/\/$/, '') + '/api';
}

const API_BASE = apiBaseUrl || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : `http://${window.location.hostname}:5000/api`
);

const formatCurrency = (amount, symbol = '₹') => {
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Load Razorpay checkout script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PaymentPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/payments/public-invoice/${id}`);
      setInvoice(res.data.data);
      if (res.data.data.status === 'Paid') {
        setPaid(true);
        setPaymentDetails({ paymentId: res.data.data.razorpayPaymentId, paidAt: res.data.data.paidAt });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invoice not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const simulatePaymentMock = async (inv, orderId) => {
    try {
      // Verify payment on our server using mock data
      const verifyRes = await axios.post(`${API_BASE}/payments/verify`, {
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: 'mock_signature',
        invoiceId: inv._id,
        isMock: true,
      });

      if (verifyRes.data.success) {
        setPaid(true);
        setPaymentDetails({
          paymentId: verifyRes.data.data.paymentId,
          paidAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      alert('Simulation verification failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setPaying(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice) return;
    setPaying(true);

    try {
      // Create order on our server first (tells us if it's mock or real)
      const orderRes = await axios.post(`${API_BASE}/payments/order/${invoice._id}`);
      const { orderId, amount, currency, keyId, clientName, clientEmail, invoiceNumber, isMock } = orderRes.data.data;

      if (isMock) {
        const confirmPay = window.confirm(
          `[DEMO MODE] Razorpay API keys are not configured.\n\nWould you like to simulate a successful payment of ${formatCurrency(invoice.total, invoice.currencySymbol)}?`
        );
        if (confirmPay) {
          await simulatePaymentMock(invoice, orderId);
        } else {
          setPaying(false);
        }
        return;
      }

      // Load Razorpay SDK (only if real checkout is active)
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert('Failed to load Razorpay. Please check your internet connection and try again.');
        setPaying(false);
        return;
      }

      let safetyTimeout;

      // Configure Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: invoice.merchant.company || invoice.merchant.name || 'InvoAI',
        description: `Payment for Invoice ${invoiceNumber}`,
        image: invoice.merchant.logo || '',
        order_id: orderId,
        prefill: {
          name: clientName,
          email: clientEmail,
        },
        theme: {
          color: '#6366f1',
        },
        handler: async (response) => {
          if (safetyTimeout) clearTimeout(safetyTimeout);
          try {
            // Verify payment on our server
            const verifyRes = await axios.post(`${API_BASE}/payments/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId: invoice._id,
            });

            if (verifyRes.data.success) {
              setPaid(true);
              setPaymentDetails({
                paymentId: response.razorpay_payment_id,
                paidAt: new Date().toISOString(),
              });
            }
          } catch (err) {
            alert('Payment verification failed. Please contact support with your Payment ID: ' + response.razorpay_payment_id);
          }
          setPaying(false);
        },
        modal: {
          ondismiss: () => {
            if (safetyTimeout) clearTimeout(safetyTimeout);
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        if (safetyTimeout) clearTimeout(safetyTimeout);
        alert(`Payment failed: ${response.error.description}`);
        setPaying(false);
      });

      // Set safety timeout to reset the paying state if the user gets stuck
      // (e.g. adblocker, tracking blocker, or frame loading restrictions)
      safetyTimeout = setTimeout(() => {
        const btn = document.querySelector('.pay-btn');
        if (btn && btn.disabled) {
          const proceedMock = window.confirm(
            "The payment gateway is taking too long to open. This can happen if an ad-blocker (like Brave Shields, uBlock Origin) is blocking Razorpay's scripts on localhost.\n\nWould you like to simulate a successful payment instead to test the application flow?"
          );
          if (proceedMock) {
            simulatePaymentMock(invoice, orderId);
          } else {
            setPaying(false);
          }
        }
      }, 7000);

      rzp.open();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setPaying(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const styles = {
    page: {
      minHeight: '100vh',
      background: '#080809',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    card: {
      background: '#101012',
      borderRadius: '12px',
      border: '1px solid #1f1f24',
      width: '100%',
      maxWidth: '480px',
      overflow: 'hidden',
    },
    header: {
      background: '#101012',
      borderBottom: '1px solid #1f1f24',
      padding: '32px 32px 24px',
      textAlign: 'center',
    },
    successHeader: {
      background: '#101012',
      borderBottom: '1px solid #1f1f24',
      padding: '32px 32px 24px',
      textAlign: 'center',
    },
    logoBox: {
      width: '56px',
      height: '56px',
      borderRadius: '10px',
      background: '#18181b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      fontSize: '24px',
      fontWeight: '700',
      color: '#ffffff',
      border: '1px solid #27272a',
    },
    merchantName: {
      color: '#ffffff',
      fontSize: '18px',
      fontWeight: '700',
      margin: '0 0 4px',
      letterSpacing: '-0.02em',
    },
    invoiceTag: {
      color: '#71717a',
      fontSize: '12px',
      margin: 0,
    },
    body: {
      padding: '28px 32px 32px',
    },
    amountBlock: {
      background: '#141417',
      border: '1px solid #1f1f24',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '24px',
      textAlign: 'center',
    },
    amountLabel: {
      color: '#71717a',
      fontSize: '10px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      margin: '0 0 6px',
    },
    amountValue: {
      color: '#ffffff',
      fontSize: '32px',
      fontWeight: '800',
      margin: 0,
      letterSpacing: '-0.03em',
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '24px',
    },
    infoCard: {
      background: '#141417',
      border: '1px solid #1f1f24',
      borderRadius: '10px',
      padding: '12px 16px',
    },
    infoLabel: {
      color: '#71717a',
      fontSize: '10px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      margin: '0 0 4px',
    },
    infoValue: {
      color: '#e4e4e7',
      fontSize: '13px',
      fontWeight: '600',
      margin: 0,
    },
    lineItemsSection: {
      marginBottom: '24px',
    },
    sectionTitle: {
      color: '#71717a',
      fontSize: '10px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      marginBottom: '12px',
    },
    lineItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #1f1f24',
    },
    lineItemDesc: {
      color: '#e4e4e7',
      fontSize: '13px',
      flex: 1,
    },
    lineItemMeta: {
      color: '#71717a',
      fontSize: '11px',
    },
    lineItemAmount: {
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: '600',
      marginLeft: '16px',
    },
    totalsSection: {
      borderTop: '1px solid #1f1f24',
      paddingTop: '16px',
      marginBottom: '28px',
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
    },
    totalLabel: {
      color: '#71717a',
      fontSize: '13px',
    },
    totalValue: {
      color: '#cbd5e1',
      fontSize: '13px',
    },
    grandTotalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: '1px solid #2a2a32',
    },
    grandTotalLabel: {
      color: '#ffffff',
      fontSize: '15px',
      fontWeight: '700',
    },
    grandTotalValue: {
      color: '#ffffff',
      fontSize: '18px',
      fontWeight: '800',
    },
    payBtn: {
      width: '100%',
      background: paying ? '#27272a' : '#ffffff',
      color: paying ? '#71717a' : '#101012',
      border: 'none',
      borderRadius: '8px',
      padding: '14px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: paying ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s ease-in-out',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    secureNote: {
      textAlign: 'center',
      marginTop: '16px',
    },
    secureText: {
      color: '#52525b',
      fontSize: '11px',
      margin: 0,
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 14px',
      borderRadius: '999px',
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '16px',
    },
    poweredBy: {
      textAlign: 'center',
      padding: '16px 32px',
      borderTop: '1px solid #1f1f24',
    },
    poweredText: {
      color: '#3f3f46',
      fontSize: '11px',
      margin: 0,
    },
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
            <h1 style={styles.merchantName}>Loading Invoice...</h1>
          </div>
          <div style={{ ...styles.body, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.header, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>❌</div>
            <h1 style={{ ...styles.merchantName, fontSize: '18px' }}>Invoice Not Found</h1>
          </div>
          <div style={{ ...styles.body, textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px' }}>{error}</p>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
              Please contact the sender for a valid payment link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = paid || invoice?.status === 'Paid';
  const isCancelled = invoice?.status === 'Cancelled';

  // ── Success state ─────────────────────────────────────────────────────────
  if (isPaid) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.successHeader}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
            <h1 style={styles.merchantName}>Payment Successful!</h1>
            <p style={styles.invoiceTag}>{invoice?.invoiceNumber}</p>
          </div>
          <div style={styles.body}>
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 8px' }}>Amount Paid</p>
              <p style={{ color: '#22c55e', fontSize: '36px', fontWeight: '800', margin: '0 0 16px' }}>{formatCurrency(invoice?.total, invoice?.currencySymbol)}</p>
              {paymentDetails?.paymentId && (
                <p style={{ color: '#6366f1', fontSize: '12px', fontWeight: '600', margin: 0, wordBreak: 'break-all' }}>
                  Payment ID: {paymentDetails.paymentId}
                </p>
              )}
            </div>
            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <p style={styles.infoLabel}>Invoice</p>
                <p style={styles.infoValue}>{invoice?.invoiceNumber}</p>
              </div>
              <div style={styles.infoCard}>
                <p style={styles.infoLabel}>Paid On</p>
                <p style={styles.infoValue}>{formatDate(paymentDetails?.paidAt || invoice?.paidAt)}</p>
              </div>
              <div style={styles.infoCard}>
                <p style={styles.infoLabel}>Paid To</p>
                <p style={styles.infoValue}>{invoice?.merchant?.company || invoice?.merchant?.name || '—'}</p>
              </div>
              <div style={styles.infoCard}>
                <p style={styles.infoLabel}>Client</p>
                <p style={styles.infoValue}>{invoice?.client?.name}</p>
              </div>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ color: '#86efac', fontSize: '13px', margin: 0 }}>
                ✅ A payment receipt has been sent to <strong>{invoice?.client?.email}</strong>
              </p>
            </div>
          </div>
          <div style={styles.poweredBy}>
            <p style={styles.poweredText}>Powered by <span style={{ color: '#475569' }}>Razorpay</span> · Secured by <span style={{ color: '#475569' }}>InvoAI</span></p>
          </div>
        </div>
      </div>
    );
  }

  // ── Cancelled state ───────────────────────────────────────────────────────
  if (isCancelled) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.header, background: 'linear-gradient(135deg, #6b7280, #374151)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚫</div>
            <h1 style={styles.merchantName}>Invoice Cancelled</h1>
            <p style={styles.invoiceTag}>{invoice?.invoiceNumber}</p>
          </div>
          <div style={{ ...styles.body, textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
              This invoice has been cancelled. Please contact {invoice?.merchant?.name || 'the sender'} for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Payment UI ────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pay-btn:hover:not(:disabled) {
          background: #e4e4e7 !important;
        }
      `}</style>

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          {invoice?.merchant?.logo ? (
            <img
              src={invoice.merchant.logo}
              alt="Logo"
              style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', margin: '0 auto 16px', display: 'block', border: '2px solid rgba(255,255,255,0.3)' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={styles.logoBox}>
              {(invoice?.merchant?.company || invoice?.merchant?.name || 'I')[0].toUpperCase()}
            </div>
          )}
          <h1 style={styles.merchantName}>
            {invoice?.merchant?.company || invoice?.merchant?.name || 'Invoice Payment'}
          </h1>
          <p style={styles.invoiceTag}>{invoice?.invoiceNumber}</p>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Amount */}
          <div style={styles.amountBlock}>
            <p style={styles.amountLabel}>Total Amount Due</p>
            <p style={styles.amountValue}>{formatCurrency(invoice?.total, invoice?.currencySymbol)}</p>
          </div>

          {/* Info Grid */}
          <div style={styles.infoGrid}>
            <div style={styles.infoCard}>
              <p style={styles.infoLabel}>Bill To</p>
              <p style={styles.infoValue}>{invoice?.client?.name}</p>
            </div>
            <div style={styles.infoCard}>
              <p style={styles.infoLabel}>Due Date</p>
              <p style={{ ...styles.infoValue, color: new Date(invoice?.dueDate) < new Date() ? '#ef4444' : '#e2e8f0' }}>
                {formatDate(invoice?.dueDate)}
              </p>
            </div>
            <div style={styles.infoCard}>
              <p style={styles.infoLabel}>Invoice Date</p>
              <p style={styles.infoValue}>{formatDate(invoice?.issueDate)}</p>
            </div>
            <div style={styles.infoCard}>
              <p style={styles.infoLabel}>Status</p>
              <p style={{ ...styles.infoValue, color: invoice?.status === 'Overdue' ? '#ef4444' : '#f59e0b' }}>
                {invoice?.status}
              </p>
            </div>
          </div>

          {/* Line Items */}
          {invoice?.lineItems && invoice.lineItems.length > 0 && (
            <div style={styles.lineItemsSection}>
              <p style={styles.sectionTitle}>Invoice Items</p>
              {invoice.lineItems.map((item, idx) => (
                <div key={idx} style={styles.lineItem}>
                  <div style={{ flex: 1 }}>
                    <p style={{ ...styles.lineItemDesc, margin: '0 0 2px' }}>{item.description}</p>
                    <p style={{ ...styles.lineItemMeta, margin: 0 }}>{item.quantity} × {formatCurrency(item.rate, invoice.currencySymbol)}</p>
                  </div>
                  <p style={styles.lineItemAmount}>{formatCurrency(item.amount, invoice.currencySymbol)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div style={styles.totalsSection}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Subtotal</span>
              <span style={styles.totalValue}>{formatCurrency(invoice?.subtotal, invoice?.currencySymbol)}</span>
            </div>
            {invoice?.discountAmount > 0 && (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Discount ({invoice.discountPercent}%)</span>
                <span style={{ ...styles.totalValue, color: '#22c55e' }}>−{formatCurrency(invoice.discountAmount, invoice.currencySymbol)}</span>
              </div>
            )}
            {invoice?.taxAmount > 0 && (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>{invoice.taxType} ({invoice.taxRate}%)</span>
                <span style={styles.totalValue}>{formatCurrency(invoice.taxAmount, invoice.currencySymbol)}</span>
              </div>
            )}
            <div style={styles.grandTotalRow}>
              <span style={styles.grandTotalLabel}>Total Due</span>
              <span style={styles.grandTotalValue}>{formatCurrency(invoice?.total, invoice?.currencySymbol)}</span>
            </div>
          </div>

          {/* Pay Button */}
          <button
            className="pay-btn"
            onClick={handlePayment}
            disabled={paying}
            style={styles.payBtn}
          >
            {paying ? (
              <>
                <span style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Processing...
              </>
            ) : (
              <>
                💳 Pay {formatCurrency(invoice?.total, invoice?.currencySymbol)} Securely
              </>
            )}
          </button>

          {/* Simulator button for localhost testing */}
          {window.location.hostname === 'localhost' && (
            <button
              onClick={async () => {
                if (window.confirm("Would you like to simulate a successful payment for testing?")) {
                  setPaying(true);
                  try {
                    const orderRes = await axios.post(`${API_BASE}/payments/order/${invoice._id}`);
                    const { orderId } = orderRes.data.data;
                    await simulatePaymentMock(invoice, orderId);
                  } catch (err) {
                    alert('Failed to initiate mock payment: ' + (err.response?.data?.message || err.message));
                    setPaying(false);
                  }
                }
              }}
              disabled={paying}
              style={{
                ...styles.payBtn,
                background: 'transparent',
                color: '#6366f1',
                border: '1px dashed #6366f1',
                marginTop: '12px',
                cursor: paying ? 'not-allowed' : 'pointer',
              }}
            >
              🛠️ Simulate Test Payment (Local Dev)
            </button>
          )}

          {/* Secure note */}
          <div style={styles.secureNote}>
            <p style={styles.secureText}>🔒 Secured by Razorpay · Supports UPI, Card, Netbanking</p>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.poweredBy}>
          <p style={styles.poweredText}>
            Invoice managed by <span style={{ color: '#6366f1', fontWeight: '600' }}>InvoAI</span>
          </p>
        </div>
      </div>
    </div>
  );
}
