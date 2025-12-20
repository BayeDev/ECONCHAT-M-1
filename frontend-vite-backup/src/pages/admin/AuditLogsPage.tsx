/**
 * Admin - Audit Logs Page
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../lib/api';
import { FileText, User, Settings, Clock } from 'lucide-react';

const actionColors: Record<string, string> = {
  USER_CREATED: 'bg-green-100 text-green-700',
  USER_UPDATED: 'bg-blue-100 text-blue-700',
  USER_DELETED: 'bg-red-100 text-red-700',
  SETTINGS_UPDATED: 'bg-purple-100 text-purple-700',
  MAINTENANCE_TOGGLED: 'bg-yellow-100 text-yellow-700',
  WAITLIST_APPROVED: 'bg-green-100 text-green-700',
  WAITLIST_REJECTED: 'bg-red-100 text-red-700',
  USAGE_RESET: 'bg-orange-100 text-orange-700',
};

const entityIcons: Record<string, any> = {
  USER: User,
  SETTINGS: Settings,
  WAITLIST: FileText,
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', { page, action: actionFilter, entityType: entityFilter }],
    queryFn: () => adminApi.getAuditLogs({
      page,
      limit: 50,
      action: actionFilter || undefined,
      entityType: entityFilter || undefined,
    }),
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500">Track all administrative actions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">All Actions</option>
            <option value="USER_CREATED">User Created</option>
            <option value="USER_UPDATED">User Updated</option>
            <option value="USER_DELETED">User Deleted</option>
            <option value="SETTINGS_UPDATED">Settings Updated</option>
            <option value="MAINTENANCE_TOGGLED">Maintenance Toggled</option>
            <option value="WAITLIST_APPROVED">Waitlist Approved</option>
            <option value="WAITLIST_REJECTED">Waitlist Rejected</option>
            <option value="USAGE_RESET">Usage Reset</option>
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">All Entities</option>
            <option value="USER">Users</option>
            <option value="SETTINGS">Settings</option>
            <option value="WAITLIST">Waitlist</option>
          </select>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Loading...
            </div>
          ) : data?.logs?.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No audit logs found
            </div>
          ) : (
            data?.logs?.map((log: any) => {
              const Icon = entityIcons[log.entityType] || FileText;
              return (
                <div key={log.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm text-gray-500">on</span>
                        <span className="text-sm font-medium text-gray-700">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-xs text-gray-400 font-mono">{log.entityId.slice(0, 8)}...</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {log.user && (
                          <span>by {log.user.email}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        {log.ipAddress && (
                          <span className="text-xs">{log.ipAddress}</span>
                        )}
                      </div>
                      {(log.oldValue || log.newValue) && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                          {log.oldValue && (
                            <div className="text-red-600">
                              - {JSON.stringify(log.oldValue).slice(0, 100)}
                            </div>
                          )}
                          {log.newValue && (
                            <div className="text-green-600">
                              + {JSON.stringify(log.newValue).slice(0, 100)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {data?.total > 50 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 50 >= data.total}
                className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
