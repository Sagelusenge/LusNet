import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://lwasiva-net.onrender.com/api';

export async function getToken() {
  return AsyncStorage.getItem('lwasiva_token');
}

export async function setToken(token) {
  if (token) await AsyncStorage.setItem('lwasiva_token', token);
  else await AsyncStorage.removeItem('lwasiva_token');
}

export function parseUser(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(global.atob ? global.atob(payload) : Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Erreur API');
  return payload.data ?? payload;
}

export const api = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  users: () => request('/users'),
  createUser: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  plans: () => request('/plans'),
  createQuote: (body) => request('/quotes/public', { method: 'POST', body: JSON.stringify(body) }),
  publicFeedback: () => request('/public/feedback'),
  allFeedback: () => request('/public/feedback/all'),
  sendFeedback: (body) => request('/public/feedback', { method: 'POST', body: JSON.stringify(body) }),
  updateFeedback: (id, body) => request(`/public/feedback/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  sendContact: (body) => request('/public/contact', { method: 'POST', body: JSON.stringify(body) }),
  contactMessages: () => request('/public/contact'),
  summary: () => request('/dashboard/summary'),
  clients: () => request('/clients'),
  createClient: (body) => request('/clients', { method: 'POST', body: JSON.stringify(body) }),
  updateClient: (id, body) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),
  contracts: () => request('/contracts'),
  createContract: (body) => request('/contracts', { method: 'POST', body: JSON.stringify(body) }),
  updateContract: (id, body) => request(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteContract: (id) => request(`/contracts/${id}`, { method: 'DELETE' }),
  balances: () => request('/contracts/balances'),
  equipmentStatus: () => request('/contracts/equipment-status'),
  quotes: () => request('/quotes'),
  updateQuote: (id, body) => request(`/quotes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateQuoteStatus: (id, body) => request(`/quotes/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteQuote: (id) => request(`/quotes/${id}`, { method: 'DELETE' }),
  convertQuoteToClient: (id) => request(`/quotes/${id}/convert-client`, { method: 'POST' }),
  invoices: () => request('/invoices'),
  unpaidInvoices: () => request('/invoices/unpaid'),
  createInvoice: (body) => request('/invoices/monthly', { method: 'POST', body: JSON.stringify(body) }),
  payments: () => request('/payments'),
  registerPayment: (body) => request('/payments', { method: 'POST', body: JSON.stringify(body) }),
  kits: () => request('/equipment/kits'),
  createInstallment: (body) => request('/equipment/installments', { method: 'POST', body: JSON.stringify(body) }),
  tickets: () => request('/support/tickets'),
  openTicket: (body) => request('/support/tickets', { method: 'POST', body: JSON.stringify(body) }),
  updateTicketStatus: (id, body) => request(`/support/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  notificationLogs: () => request('/notifications/whatsapp'),
  sendWhatsAppReminders: () => request('/notifications/whatsapp/send-j5', { method: 'POST' }),
  clientSpace: () => request('/client-space/me')
};
