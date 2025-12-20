/**
 * API Client for Admin Dashboard
 */

const API_BASE = '/api';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await window.Clerk?.session?.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
}

// Dashboard
export const adminApi = {
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

  updateUser: (id: string, data: { role?: string; status?: string; limits?: any }) =>
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

  updateSettings: (data: Record<string, any>) =>
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

// Type augmentation for Clerk
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
  }
}
