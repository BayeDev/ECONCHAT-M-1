/**
 * API Client for Admin Dashboard
 * Uses Clerk's useAuth hook for token retrieval
 */

const API_BASE = '/api';

// Token will be set by the hook
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  console.log(`[API] Fetching ${url}, hasToken: ${!!authToken}`);

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    console.error(`[API] Error ${response.status}:`, error);
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
}

// Dashboard
export const adminApi = {
  // Bootstrap - call this first to promote user to admin if eligible
  bootstrap: () => fetchWithAuth('/admin/bootstrap', { method: 'POST' }),

  // Dashboard
  getDashboard: () => fetchWithAuth('/admin/dashboard'),

  // Users
  getUsers: (params?: { page?: number; limit?: number; status?: string; role?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.role) query.set('role', params.role);
    if (params?.search) query.set('search', params.search);
    return fetchWithAuth(`/admin/users?${query}`);
  },

  getUser: (id: string) => fetchWithAuth(`/admin/users/${id}`),

  updateUser: (id: string, data: { role?: string; status?: string; limits?: unknown }) =>
    fetchWithAuth(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  resetUserUsage: (id: string, type: 'daily' | 'monthly') =>
    fetchWithAuth(`/admin/users/${id}/reset-usage`, { method: 'POST', body: JSON.stringify({ type }) }),

  // Usage
  getUsageStats: (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    return fetchWithAuth(`/admin/usage/stats?${query}`);
  },

  getDailyUsage: (days?: number) =>
    fetchWithAuth(`/admin/usage/daily${days ? `?days=${days}` : ''}`),

  getTopUsers: (limit?: number) =>
    fetchWithAuth(`/admin/usage/top-users${limit ? `?limit=${limit}` : ''}`),

  getUsageLogs: (params?: { page?: number; limit?: number; userId?: string; tier?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.userId) query.set('userId', params.userId);
    if (params?.tier) query.set('tier', params.tier.toString());
    return fetchWithAuth(`/admin/usage/logs?${query}`);
  },

  // Settings
  getSettings: () => fetchWithAuth('/admin/settings'),

  updateSettings: (data: Record<string, unknown>) =>
    fetchWithAuth('/admin/settings', { method: 'PATCH', body: JSON.stringify(data) }),

  toggleMaintenance: (enabled: boolean, message?: string) =>
    fetchWithAuth('/admin/settings/maintenance', { method: 'POST', body: JSON.stringify({ enabled, message }) }),

  // Waitlist
  getWaitlist: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    return fetchWithAuth(`/admin/waitlist?${query}`);
  },

  approveWaitlist: (id: string, notes?: string) =>
    fetchWithAuth(`/admin/waitlist/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes }) }),

  rejectWaitlist: (id: string, notes?: string) =>
    fetchWithAuth(`/admin/waitlist/${id}/reject`, { method: 'POST', body: JSON.stringify({ notes }) }),

  // Audit Logs
  getAuditLogs: (params?: { page?: number; limit?: number; action?: string; entityType?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.action) query.set('action', params.action);
    if (params?.entityType) query.set('entityType', params.entityType);
    return fetchWithAuth(`/admin/audit-logs?${query}`);
  },
};
