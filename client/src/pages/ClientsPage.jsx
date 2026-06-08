import { useState, useEffect } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '../services/api';
import Layout from '../components/Layout';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const ClientModal = ({ client, onClose, onSave }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: client || {} });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (client?._id) { await updateClient(client._id, data); toast.success('Client updated!'); }
      else { await createClient(data); toast.success('Client created! 🎉'); }
      onSave();
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-dark-500">
          <h3 className="font-semibold text-slate-200">{client?._id ? 'Edit Client' : 'Add New Client'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input {...register('name', { required: 'Required' })} placeholder="John Smith" className="input" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input {...register('email', { required: 'Required' })} type="email" placeholder="client@email.com" className="input" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} placeholder="+91 98765 43210" className="input" />
            </div>
            <div>
              <label className="label">Company</label>
              <input {...register('company')} placeholder="Acme Corp" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input {...register('address')} placeholder="123 Street, City, State" className="input" />
          </div>
          <div>
            <label className="label">GST Number</label>
            <input {...register('gstNumber')} placeholder="22AAAAA0000A1Z5" className="input" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Any notes..." className="input resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? '⏳ Saving...' : (client?._id ? '✅ Update' : '+ Add Client')}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | client object

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getClients({ search: search || undefined });
      setClients(data.data);
    } catch { toast.error('Failed to load clients'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const timer = setTimeout(load, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete client "${name}"?`)) return;
    try { await deleteClient(id); toast.success('Client deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <Layout title="Clients">
      <div className="page-header">
        <div>
          <h2 className="page-title">Clients</h2>
          <p className="page-subtitle">{clients.length} clients</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary">👤 Add Client</button>
      </div>

      <div className="mb-6 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="input pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : clients.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-slate-400 mb-4">No clients yet</p>
          <button onClick={() => setModal('new')} className="btn-primary">Add your first client</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map(client => (
            <div key={client._id} className="card p-5 hover:border-primary-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/30 to-violet-500/20 flex items-center justify-center text-primary-400 font-bold text-lg">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">{client.name}</p>
                    {client.company && <p className="text-xs text-slate-500">{client.company}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal(client)} className="btn-icon text-xs p-1.5">✏️</button>
                  <button onClick={() => handleDelete(client._id, client.name)} className="btn-icon text-xs p-1.5 text-red-400">🗑️</button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-400"><span>📧</span><span className="truncate">{client.email}</span></div>
                {client.phone && <div className="flex items-center gap-2 text-slate-400"><span>📞</span><span>{client.phone}</span></div>}
                {client.gstNumber && <div className="flex items-center gap-2 text-slate-400"><span>🏷️</span><span>{client.gstNumber}</span></div>}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-dark-600">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Invoices</p>
                  <p className="font-bold text-slate-200">{client.invoiceCount || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Invoiced</p>
                  <p className="font-bold text-slate-300 text-xs">{fmt(client.totalInvoiced)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="font-bold text-emerald-400 text-xs">{fmt(client.totalPaid)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ClientModal
          client={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={load}
        />
      )}
    </Layout>
  );
};

export default ClientsPage;
