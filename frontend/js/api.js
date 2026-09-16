'use strict';

async function apiFetch(endpoint, options = {}) {
  const token = HFAuth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (response.status === 401) { HFAuth.logout(); if (typeof ToastView !== 'undefined') ToastView.show('Session expired. Please log in again.', 'warning'); }
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: { success: false, message: 'Cannot connect to server. Is the backend running on port 5000?' } };
  }
}

const AuthAPI = {
  register    : (username, email, password, display_name = '') => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password, display_name }) }),
  login       : async (email, password) => { const r = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); if (r.ok && r.data.token) { HFAuth.setToken(r.data.token); HFAuth.setUser(r.data.user); } return r; },
  getProfile  : ()       => apiFetch('/auth/profile'),
  updateProfile: (fields) => apiFetch('/auth/profile',         { method: 'PUT', body: JSON.stringify(fields) }),
  changePassword: (current_password, new_password) => apiFetch('/auth/change-password', { method: 'PUT', body: JSON.stringify({ current_password, new_password }) }),
  updateSettings: (settings) => apiFetch('/settings',         { method: 'PUT', body: JSON.stringify(settings) }),
  logout      : async () => { await apiFetch('/auth/logout', { method: 'POST' }); HFAuth.logout(); },
};

const HabitsAPI = {
  create : (body)      => apiFetch('/habits',     { method: 'POST',   body: JSON.stringify(body) }),
  getAll : (params={}) => apiFetch('/habits?' + new URLSearchParams(params).toString()),
  getOne : (id)        => apiFetch(`/habits/${id}`),
  update : (id, body)  => apiFetch(`/habits/${id}`, { method: 'PUT',    body: JSON.stringify(body) }),
  remove : (id)        => apiFetch(`/habits/${id}`, { method: 'DELETE' }),
};

const TrackingAPI = {
  markComplete   : (id, date, note) => apiFetch(`/habits/${id}/complete`, { method: 'POST',   body: JSON.stringify({ date, note }) }),
  markIncomplete : (id, date)       => apiFetch(`/habits/${id}/complete`, { method: 'DELETE', body: JSON.stringify({ date }) }),
  getStreak      : (id)             => apiFetch(`/habits/${id}/streak`),
  getDashboard   : ()               => apiFetch('/dashboard/stats'),
};

const AnalyticsAPI = {
  weekly      : ()             => apiFetch('/analytics/weekly'),
  monthly     : ()             => apiFetch('/analytics/monthly'),
  category    : ()             => apiFetch('/analytics/category'),
  completion  : ()             => apiFetch('/analytics/completion'),
  bestHabit   : ()             => apiFetch('/analytics/best-habit'),
  missedHabits: (days = 14)   => apiFetch(`/analytics/missed-habits?days=${days}`),
  calendar    : (month, year) => apiFetch(`/calendar/${month}/${year}`),
};

const SettingsAPI = {
  get   : ()         => apiFetch('/settings'),
  update: (settings) => apiFetch('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};

const RemindersAPI = {
  getAll: ()               => apiFetch('/reminders'),
  save  : (reminderData)   => apiFetch('/reminders', { method: 'POST', body: JSON.stringify(reminderData) }),
};

const UserAPI = {
  resetData: () => apiFetch('/user/reset-data', { method: 'DELETE' }),
};

const ExportAPI = {
  downloadCsv: async () => {
    const token = HFAuth.getToken();
    const response = await fetch(`${API_BASE}/export/csv`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!response.ok) return { ok: false };
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitflow-export-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    return { ok: true };
  },
  downloadPdf: async () => {
    const token = HFAuth.getToken();
    const response = await fetch(`${API_BASE}/export/pdf`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!response.ok) return { ok: false };
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitflow-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
    return { ok: true };
  }
};

window.AuthAPI      = AuthAPI;
window.HabitsAPI    = HabitsAPI;
window.TrackingAPI  = TrackingAPI;
window.AnalyticsAPI = AnalyticsAPI;
window.SettingsAPI  = SettingsAPI;
window.RemindersAPI = RemindersAPI;
window.UserAPI      = UserAPI;
window.ExportAPI    = ExportAPI;
