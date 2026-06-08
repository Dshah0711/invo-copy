import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { createInvoice, updateInvoice, getInvoice, getClients, createClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const TAX_OPTIONS = [
  { label: 'No Tax', type: 'None', rate: 0 },
  { label: 'GST 5%', type: 'GST', rate: 5 },
  { label: 'GST 12%', type: 'GST', rate: 12 },
  { label: 'GST 18%', type: 'GST', rate: 18 },
  { label: 'GST 28%', type: 'GST', rate: 28 },
  { label: 'IGST 18%', type: 'IGST', rate: 18 },
  { label: 'VAT 5%', type: 'VAT', rate: 5 },
  { label: 'VAT 20%', type: 'VAT', rate: 20 },
];

const NewInvoicePage = () => {
  const { id } = useParams(); // if editing
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [taxOption, setTaxOption] = useState(TAX_OPTIONS[3]); // GST 18% default
  const [discount, setDiscount] = useState(0);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      lineItems: [{ description: '', quantity: 1, rate: 0 }],
      template: 'modern',
      notes: '',
      terms: 'Payment due within 30 days.',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const lineItems = watch('lineItems');

  // Load existing invoice if editing
  useEffect(() => {
    if (id) {
      getInvoice(id).then(({ data }) => {
        const inv = data.data;
        reset({
          lineItems: inv.lineItems,
          template: inv.template,
          notes: inv.notes,
          terms: inv.terms,
          dueDate: inv.dueDate?.slice(0, 10),
          clientName: inv.client.name,
          clientEmail: inv.client.email,
          clientPhone: inv.client.phone,
          clientCompany: inv.client.company,
          clientAddress: inv.client.address,
          clientGst: inv.client.gstNumber,
        });
        setDiscount(inv.discountPercent || 0);
        const to = TAX_OPTIONS.find(t => t.type === inv.taxType && t.rate === inv.taxRate);
        if (to) setTaxOption(to);
      }).catch(() => toast.error('Invoice not found'));
    }
  }, [id]);

  // Load clients
  useEffect(() => {
    getClients().then(({ data }) => setClients(data.data)).catch(() => {});
  }, []);

  // Auto-fill from selected client
  const handleClientSelect = (e) => {
    const client = clients.find(c => c._id === e.target.value);
    setSelectedClient(client);
    if (client) {
      setValue('clientName', client.name);
      setValue('clientEmail', client.email);
      setValue('clientPhone', client.phone);
      setValue('clientCompany', client.company);
      setValue('clientAddress', client.address);
      setValue('clientGst', client.gstNumber);
    }
  };

  // Totals
  const subtotal = lineItems.reduce((s, item) => s + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const discountAmt = (subtotal * discount) / 100;
  const taxable = subtotal - discountAmt;
  const taxAmt = taxOption.type !== 'None' ? (taxable * taxOption.rate) / 100 : 0;
  const total = taxable + taxAmt;

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        client: {
          name: data.clientName, email: data.clientEmail, phone: data.clientPhone || '',
          company: data.clientCompany || '', address: data.clientAddress || '', gstNumber: data.clientGst || '',
        },
        clientId: selectedClient?._id,
        lineItems: data.lineItems.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          amount: Number(item.quantity) * Number(item.rate),
        })),
        taxType: taxOption.type,
        taxRate: taxOption.rate,
        discountPercent: Number(discount),
        dueDate: data.dueDate,
        notes: data.notes,
        terms: data.terms,
        template: data.template,
      };

      if (id) {
        await updateInvoice(id, payload);
        toast.success('Invoice updated! ✅');
        navigate(`/invoices/${id}`);
      } else {
        const { data: res } = await createInvoice(payload);
        toast.success(`Invoice ${res.data.invoiceNumber} created! 🎉`);
        navigate(`/invoices/${res.data._id}`);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save invoice');
    } finally { setLoading(false); }
  };

  const fmt = (n) => `${user?.currencySymbol || '₹'}${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <Layout title={id ? 'Edit Invoice' : 'New Invoice'}>
      <div className="max-w-5xl mx-auto">
        <div className="page-header">
          <div>
            <h2 className="page-title">{id ? 'Edit Invoice' : 'Create Invoice'}</h2>
            <p className="page-subtitle">{id ? 'Update invoice details' : 'Fill in the details to generate a new invoice'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Section */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">👤 Client Information</h3>
            {clients.length > 0 && (
              <div className="mb-4">
                <label className="label">Select Existing Client</label>
                <select onChange={handleClientSelect} className="input">
                  <option value="">— Select a saved client —</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name} ({c.email})</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Client Name *</label>
                <input {...register('clientName', { required: 'Required' })} placeholder="John Smith" className="input" />
                {errors.clientName && <p className="text-red-400 text-xs mt-1">{errors.clientName.message}</p>}
              </div>
              <div>
                <label className="label">Client Email *</label>
                <input {...register('clientEmail', { required: 'Required', pattern: { value: /\S+@\S+/, message: 'Invalid email' } })} placeholder="client@example.com" className="input" />
                {errors.clientEmail && <p className="text-red-400 text-xs mt-1">{errors.clientEmail.message}</p>}
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...register('clientPhone')} placeholder="+91 98765 43210" className="input" />
              </div>
              <div>
                <label className="label">Company</label>
                <input {...register('clientCompany')} placeholder="Acme Corp" className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Address</label>
                <input {...register('clientAddress')} placeholder="123 Street, City, State" className="input" />
              </div>
              <div>
                <label className="label">GST Number</label>
                <input {...register('clientGst')} placeholder="22AAAAA0000A1Z5" className="input" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">📋 Line Items</h3>
            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-5">
                    {i === 0 && <label className="label">Description</label>}
                    <input {...register(`lineItems.${i}.description`, { required: true })} placeholder="Service or product..." className="input" />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <label className="label">Qty</label>}
                    <input {...register(`lineItems.${i}.quantity`, { required: true, min: 0.01 })} type="number" step="0.01" min="0" className="input" />
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <label className="label">Rate ({user?.currencySymbol || '₹'})</label>}
                    <input {...register(`lineItems.${i}.rate`, { required: true, min: 0 })} type="number" step="0.01" min="0" className="input" />
                  </div>
                  <div className="col-span-1">
                    {i === 0 && <label className="label">Amount</label>}
                    <div className="input flex items-center text-primary-400 font-semibold text-sm bg-dark-500">
                      {fmt((Number(lineItems[i]?.quantity) || 0) * (Number(lineItems[i]?.rate) || 0))}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end">
                    {i === 0 && <label className="label opacity-0">Del</label>}
                    <button type="button" onClick={() => remove(i)} disabled={fields.length === 1} className="btn-icon w-full justify-center disabled:opacity-30">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => append({ description: '', quantity: 1, rate: 0 })} className="btn-secondary mt-4 text-sm">
              + Add Line Item
            </button>
          </div>

          {/* Settings + Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Settings */}
            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-slate-200">⚙️ Invoice Settings</h3>
              <div>
                <label className="label">Due Date *</label>
                <input {...register('dueDate', { required: 'Required' })} type="date" className="input" />
                {errors.dueDate && <p className="text-red-400 text-xs mt-1">{errors.dueDate.message}</p>}
              </div>
              <div>
                <label className="label">Tax</label>
                <select value={taxOption.label} onChange={e => setTaxOption(TAX_OPTIONS.find(t => t.label === e.target.value))} className="input">
                  {TAX_OPTIONS.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Discount (%)</label>
                <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} min="0" max="100" className="input" />
              </div>
              <div>
                <label className="label">Template</label>
                <select {...register('template')} className="input">
                  <option value="modern">Modern (Recommended)</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea {...register('notes')} rows={2} placeholder="Thank you for your business!" className="input resize-none" />
              </div>
              <div>
                <label className="label">Terms</label>
                <textarea {...register('terms')} rows={2} placeholder="Payment due within 30 days." className="input resize-none" />
              </div>
            </div>

            {/* Totals */}
            <div className="card p-6 flex flex-col justify-between">
              <h3 className="font-semibold text-slate-200 mb-4">💰 Summary</h3>
              <div className="space-y-3 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-200 font-medium">{fmt(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Discount ({discount}%)</span>
                    <span className="text-red-400 font-medium">-{fmt(discountAmt)}</span>
                  </div>
                )}
                {taxOption.type !== 'None' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{taxOption.label}</span>
                    <span className="text-slate-200 font-medium">{fmt(taxAmt)}</span>
                  </div>
                )}
                <div className="border-t border-dark-500 pt-3 flex justify-between">
                  <span className="font-bold text-slate-100 text-lg">Total</span>
                  <span className="font-bold text-2xl gradient-text">{fmt(total)}</span>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{id ? 'Updating...' : 'Creating...'}</> : (id ? '✅ Update Invoice' : '🚀 Create Invoice')}
                </button>
                <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary w-full justify-center">Cancel</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewInvoicePage;
