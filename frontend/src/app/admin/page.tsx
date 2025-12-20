"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Users, DollarSign, Activity, AlertCircle, TrendingUp } from "lucide-react";
import { useEffect } from "react";

// Debug: log when component mounts
if (typeof window !== 'undefined') {
  console.log("[AdminPage] Component loaded");
}
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
} from "recharts";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  progress,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  progress?: number;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Used</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                progress > 80
                  ? "bg-red-500"
                  : progress > 60
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      console.log("[AdminPage] Fetching dashboard data...");
      try {
        const result = await adminApi.getDashboard();
        console.log("[AdminPage] Dashboard data received:", result);
        return result;
      } catch (err) {
        console.error("[AdminPage] Dashboard fetch error:", err);
        throw err;
      }
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">
            Failed to load dashboard data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Monitor your EconChat instance</p>
      </div>

      {/* Alert banners */}
      {data?.settings?.maintenanceMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <p className="text-yellow-800">
            Maintenance mode is enabled. Only admins can access the service.
          </p>
        </div>
      )}

      {data?.usage?.today?.percentUsed > 80 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <p className="text-orange-800">
            Daily budget is {data.usage.today.percentUsed}% used. Consider
            adjusting limits.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={data?.users?.total || 0}
          subtitle={`Max: ${data?.users?.maxAllowed || 50}`}
          icon={Users}
          color="bg-blue-500"
          progress={data?.users?.capacityUsed}
        />
        <StatCard
          title="Today's Cost"
          value={`$${(data?.usage?.today?.cost || 0).toFixed(2)}`}
          subtitle={`Budget: $${data?.usage?.today?.budget || 10}`}
          icon={DollarSign}
          color="bg-green-500"
          progress={data?.usage?.today?.percentUsed}
        />
        <StatCard
          title="Monthly Cost"
          value={`$${(data?.usage?.month?.cost || 0).toFixed(2)}`}
          subtitle={`Budget: $${data?.usage?.month?.budget || 200}`}
          icon={TrendingUp}
          color="bg-purple-500"
          progress={data?.usage?.month?.percentUsed}
        />
        <StatCard
          title="Pending Waitlist"
          value={data?.waitlist?.pending || 0}
          subtitle={`Total: ${data?.waitlist?.total || 0}`}
          icon={Activity}
          color="bg-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Usage Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Usage (Last 7 Days)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.recentActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="queries"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                  name="Queries"
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981" }}
                  name="Cost ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Usage Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Usage by Tier
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: "Tier 1 (Opus)",
                    queries: data?.usage?.byTier?.[1]?.count || 0,
                    cost: data?.usage?.byTier?.[1]?.cost || 0,
                  },
                  {
                    name: "Tier 2 (Gemini)",
                    queries: data?.usage?.byTier?.[2]?.count || 0,
                    cost: data?.usage?.byTier?.[2]?.cost || 0,
                  },
                ]}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar
                  dataKey="queries"
                  fill="#3b82f6"
                  name="Queries"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-3">User Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Active</span>
              <span className="font-semibold text-green-600">
                {data?.users?.byStatus?.ACTIVE || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending</span>
              <span className="font-semibold text-yellow-600">
                {data?.users?.byStatus?.PENDING || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Suspended</span>
              <span className="font-semibold text-red-600">
                {data?.users?.byStatus?.SUSPENDED || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            System Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tier 1 (Opus)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  data?.settings?.tier1Enabled
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {data?.settings?.tier1Enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tier 2 (Gemini)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  data?.settings?.tier2Enabled
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {data?.settings?.tier2Enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Signups</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  data?.settings?.signupsEnabled
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {data?.settings?.signupsEnabled ? "Open" : "Closed"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Success Rate</span>
              <span className="font-semibold">
                {((data?.usage?.successRate || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Latency</span>
              <span className="font-semibold">
                {(data?.usage?.avgLatency || 0).toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Queries</span>
              <span className="font-semibold">
                {data?.usage?.today?.queries || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
