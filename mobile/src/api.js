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
  plans: () => request('/plans'),
  createQuote: (body) => request('/quotes/public', { method: 'POST', body: JSON.stringify(body) }),
  publicFeedback: () => request('/public/feedback'),
  sendContact: (body) => request('/public/contact', { method: 'POST', body: JSON.stringify(body) }),
  summary: () => request('/dashboard/summary'),
  clients: () => request('/clients'),
  contracts: () => request('/contracts'),
  quotes: () => request('/quotes'),
  invoices: () => request('/invoices'),
  payments: () => request('/payments'),
  tickets: () => request('/support/tickets'),
  users: () => request('/users'),
  clientSpace: () => request('/client-space/me')
};
