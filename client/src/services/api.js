import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('invoai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post('http://localhost:5000/api/auth/refresh', {}, { withCredentials: true });
        localStorage.setItem('invoai_token', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return API(original);
      } catch {
        localStorage.removeItem('invoai_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────────────────
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const logoutUser = () => API.post('/auth/logout');
export const getMe = () => API.get('/auth/me');
export const updateProfile = (data) => API.put('/auth/profile', data);

// ─── Invoices ────────────────────────────────────────────
export const getInvoices = (params) => API.get('/invoices', { params });
export const getInvoice = (id) => API.get(`/invoices/${id}`);
export const createInvoice = (data) => API.post('/invoices', data);
export const updateInvoice = (id, data) => API.put(`/invoices/${id}`, data);
export const deleteInvoice = (id) => API.delete(`/invoices/${id}`);
export const updateInvoiceStatus = (id, status) => API.patch(`/invoices/${id}/status`, { status });
export const sendInvoiceEmail = (id) => API.post(`/invoices/${id}/send`);
export const downloadInvoicePDF = (id) => API.get(`/invoices/${id}/pdf`, { responseType: 'blob' });

// ─── Vendor Invoices ─────────────────────────────────────
export const getVendorInvoices = (params) => API.get('/vendor-invoices', { params });
export const getVendorInvoice = (id) => API.get(`/vendor-invoices/${id}`);
export const uploadVendorInvoice = (formData) =>
  API.post('/vendor-invoices/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateVendorInvoice = (id, data) => API.put(`/vendor-invoices/${id}`, data);
export const approveVendorInvoice = (id) => API.patch(`/vendor-invoices/${id}/approve`);
export const rejectVendorInvoice = (id, reason) => API.patch(`/vendor-invoices/${id}/reject`, { reason });
export const markVendorPaid = (id) => API.patch(`/vendor-invoices/${id}/pay`);

// ─── Clients ─────────────────────────────────────────────
export const getClients = (params) => API.get('/clients', { params });
export const getClient = (id) => API.get(`/clients/${id}`);
export const createClient = (data) => API.post('/clients', data);
export const updateClient = (id, data) => API.put(`/clients/${id}`, data);
export const deleteClient = (id) => API.delete(`/clients/${id}`);

// ─── Analytics ───────────────────────────────────────────
export const getAnalyticsSummary = () => API.get('/analytics/summary');
export const getMonthlyData = () => API.get('/analytics/monthly');
export const getTopClients = () => API.get('/analytics/top-clients');
export const getStatusBreakdown = () => API.get('/analytics/status-breakdown');
export const getNotifications = () => API.get('/analytics/notifications');
export const markNotificationsRead = (ids) => API.patch('/analytics/notifications/read', { ids });

export default API;
