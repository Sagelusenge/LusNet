const DEFAULT_API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'lwasivanet.onrender.com'
    ? 'https://lwasiva-net.onrender.com/api'
    : '/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export function getToken() {
  return localStorage.getItem('lwasiva_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('lwasiva_token', token);
  else localStorage.removeItem('lwasiva_token');
}

export function getCurrentUser() {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch (error) {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Erreur API');
  }

  return payload.data ?? payload;
}

export const api = {
  login: (body) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiRequest('/auth/me'),
  budgetSummary: () => apiRequest('/budget/summary'),
  budgetCategories: (type = '') => apiRequest(`/budget/categories${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  createBudgetCategory: (body) => apiRequest('/budget/categories', { method: 'POST', body: JSON.stringify(body) }),
  budgetEntries: () => apiRequest('/budget/entries'),
  createBudgetEntry: (body) => apiRequest('/budget/entries', { method: 'POST', body: JSON.stringify(body) }),
  updateBudgetEntry: (id, body) => apiRequest(`/budget/entries/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBudgetEntry: (id) => apiRequest(`/budget/entries/${id}`, { method: 'DELETE' }),
  users: () => apiRequest('/users'),
  createUser: (body) => apiRequest('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
  createQuote: (body) => apiRequest('/quotes/public', { method: 'POST', body: JSON.stringify(body) }),
  quotes: () => apiRequest('/quotes'),
  updateQuoteStatus: (id, body) => apiRequest(`/quotes/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateQuote: (id, body) => apiRequest(`/quotes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteQuote: (id) => apiRequest(`/quotes/${id}`, { method: 'DELETE' }),
  convertQuoteToClient: (id) => apiRequest(`/quotes/${id}/convert-client`, { method: 'POST' }),
  notificationLogs: () => apiRequest('/notifications/whatsapp'),
  sendWhatsAppReminders: () => apiRequest('/notifications/whatsapp/send-j5', { method: 'POST' }),
  appMessages: () => apiRequest('/notifications/app/me'),
  adminAppMessages: () => apiRequest('/notifications/app'),
  sendAppMessage: (body) => apiRequest('/notifications/app', { method: 'POST', body: JSON.stringify(body) }),
  contactMessages: () => apiRequest('/public/contact'),
  publicFeedback: () => apiRequest('/public/feedback'),
  allFeedback: () => apiRequest('/public/feedback/all'),
  sendContact: (body) => apiRequest('/public/contact', { method: 'POST', body: JSON.stringify(body) }),
  sendFeedback: (body) => apiRequest('/public/feedback', { method: 'POST', body: JSON.stringify(body) }),
  updateFeedback: (id, body) => apiRequest(`/public/feedback/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  clientSpace: () => apiRequest('/client-space/me'),
  summary: () => apiRequest('/dashboard/summary'),
  plans: () => apiRequest('/plans'),
  clients: (search = '') => apiRequest(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createClient: (body) => apiRequest('/clients', { method: 'POST', body: JSON.stringify(body) }),
  updateClient: (id, body) => apiRequest(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteClient: (id) => apiRequest(`/clients/${id}`, { method: 'DELETE' }),
  contracts: () => apiRequest('/contracts'),
  createContract: (body) => apiRequest('/contracts', { method: 'POST', body: JSON.stringify(body) }),
  updateContract: (id, body) => apiRequest(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteContract: (id) => apiRequest(`/contracts/${id}`, { method: 'DELETE' }),
  balances: () => apiRequest('/contracts/balances'),
  equipmentStatus: () => apiRequest('/contracts/equipment-status'),
  invoices: () => apiRequest('/invoices'),
  unpaidInvoices: () => apiRequest('/invoices/unpaid'),
  createInvoice: (body) => apiRequest('/invoices/monthly', { method: 'POST', body: JSON.stringify(body) }),
  payments: () => apiRequest('/payments'),
  registerPayment: (body) => apiRequest('/payments', { method: 'POST', body: JSON.stringify(body) }),
  kits: () => apiRequest('/equipment/kits'),
  createInstallment: (body) => apiRequest('/equipment/installments', { method: 'POST', body: JSON.stringify(body) }),
  tickets: () => apiRequest('/support/tickets'),
  openTicket: (body) => apiRequest('/support/tickets', { method: 'POST', body: JSON.stringify(body) })
};
