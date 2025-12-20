/**
 * Admin - Usage Analytics Page
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Calendar, TrendingUp, DollarSign, Zap } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function UsagePage() {
  const [days, setDays] = useState(30);

  const { data: stats } = useQuery({
    queryKey: ['admin-usage-stats'],
    queryFn: () => adminApi.getUsageStats(),
  });

  const { data: dailyUsage } = useQuery({
    queryKey: ['admin-daily-usage', days],
    queryFn: () => adminApi.getDailyUsage(days),
  });

  const { data: topUsers } = useQuery({
    queryKey: ['admin-top-users'],
    queryFn: () => adminApi.getTopUsers(10),
  });

  const tierData = [
    { name: 'Tier 1 (Opus)', value: stats?.byTier?.[1]?.count || 0, cost: stats?.byTier?.[1]?.cost || 0 },
    { name: 'Tier 2 (Gemini)', value: stats?.byTier?.[2]?.count || 0, cost: stats?.byTier?.[2]?.cost || 0 },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
        <p className="text-gray-500">Monitor API usage and costs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total Queries</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalQueries || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Total Cost</span>
          </div>
          <p className="text-2xl font-bold">${(stats?.totalCost || 0).toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Success Rate</span>
          </div>
          <p className="text-2xl font-bold">{((stats?.successRate || 0) * 100).toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">Avg Latency</span>
          </div>
          <p className="text-2xl font-bold">{(stats?.avgLatency || 0).toFixed(0)}ms</p>
        </div>
      </div>

      {/* Budget Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Budget</h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Used</span>
                <span className="font-medium">
                  ${(stats?.budget?.daily?.used || 0).toFixed(2)} / ${stats?.budget?.daily?.limit || 10}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (stats?.budget?.daily?.used / stats?.budget?.daily?.limit) > 0.8
                      ? 'bg-red-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((stats?.budget?.daily?.used / stats?.budget?.daily?.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Budget</h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Used</span>
                <span className="font-medium">
                  ${(stats?.budget?.monthly?.used || 0).toFixed(2)} / ${stats?.budget?.monthly?.limit || 200}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (stats?.budget?.monthly?.used / stats?.budget?.monthly?.limit) > 0.8
                      ? 'bg-red-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((stats?.budget?.monthly?.used / stats?.budget?.monthly?.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Usage Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Daily Usage</h3>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-200 rounded-lg text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyUsage || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="queries"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Queries"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Cost ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">Usage by Tier</h3>
          <div className="h-72 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={tierData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {tierData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-4">
              {tierData.map((tier, i) => (
                <div key={tier.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <div>
                    <p className="text-sm font-medium">{tier.name}</p>
                    <p className="text-xs text-gray-500">
                      {tier.value} queries · ${tier.cost.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">Top Users</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topUsers || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="email"
                tick={{ fontSize: 11 }}
                width={150}
                tickFormatter={(v) => v.length > 20 ? v.substring(0, 20) + '...' : v}
              />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Bar dataKey="queryCount" fill="#3b82f6" name="Queries" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
