/**
 * Admin - Waitlist Management Page
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../lib/api';
import { Check, X, Clock, Mail, Calendar } from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function WaitlistPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-waitlist', { page, status: statusFilter }],
    queryFn: () => adminApi.getWaitlist({ page, limit: 20, status: statusFilter || undefined }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveWaitlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-waitlist'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectWaitlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-waitlist'] });
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Waitlist</h1>
        <p className="text-gray-500">Review and approve new user requests</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', ''].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Waitlist Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Organization</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Submitted</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : data?.entries?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No waitlist entries found
                </td>
              </tr>
            ) : (
              data?.entries?.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{entry.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {entry.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {entry.organization || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[entry.status]}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {entry.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => approveMutation.mutate(entry.id)}
                          disabled={approveMutation.isPending}
                          className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(entry.id)}
                          disabled={rejectMutation.isPending}
                          className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {entry.status !== 'PENDING' && entry.reviewedAt && (
                      <div className="text-right text-xs text-gray-500">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(entry.reviewedAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.total > 20 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.total)} of {data.total}
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
                disabled={page * 20 >= data.total}
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
