/**
 * Admin - System Settings Page
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../lib/api';
import {
  Save,
  AlertCircle,
  DollarSign,
  Users,
  Zap,
  Shield,
  Bell,
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.getSettings,
  });

  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) => adminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setHasChanges(false);
    },
  });

  const maintenanceMutation = useMutation({
    mutationFn: ({ enabled, message }: { enabled: boolean; message?: string }) =>
      adminApi.toggleMaintenance(enabled, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Configure your EconChat instance</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Maintenance Mode Banner */}
      {settings.maintenanceMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">Maintenance mode is enabled. Only admins can access the service.</p>
          </div>
          <button
            onClick={() => maintenanceMutation.mutate({ enabled: false })}
            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
          >
            Disable
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* User Capacity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">User Capacity</h2>
              <p className="text-sm text-gray-500">Control user registration</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
              <input
                type="number"
                value={settings.maxUsers || 50}
                onChange={(e) => handleChange('maxUsers', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum number of users allowed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Signups</label>
              <select
                value={settings.signupsEnabled ? 'true' : 'false'}
                onChange={(e) => handleChange('signupsEnabled', e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Allow new user registrations</p>
            </div>
          </div>
        </div>

        {/* Budget Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Budget Controls</h2>
              <p className="text-sm text-gray-500">Set spending limits for API usage</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Budget ($)</label>
              <input
                type="number"
                step="0.01"
                value={settings.dailyBudget || 10}
                onChange={(e) => handleChange('dailyBudget', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum daily API spend</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Budget ($)</label>
              <input
                type="number"
                step="0.01"
                value={settings.monthlyBudget || 200}
                onChange={(e) => handleChange('monthlyBudget', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum monthly API spend</p>
            </div>
          </div>
        </div>

        {/* LLM Tiers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">LLM Tiers</h2>
              <p className="text-sm text-gray-500">Enable/disable model tiers</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Tier 1: Claude Opus 4.5</p>
                <p className="text-sm text-gray-500">Premium tier for complex analysis ($15/$75 per M tokens)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.tier1Enabled ?? true}
                  onChange={(e) => handleChange('tier1Enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Tier 2: Gemini 2.5 Flash</p>
                <p className="text-sm text-gray-500">Standard tier for general queries ($0.30/$2.50 per M tokens)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.tier2Enabled ?? true}
                  onChange={(e) => handleChange('tier2Enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Default User Limits */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Default User Limits</h2>
              <p className="text-sm text-gray-500">Default limits for new users</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Query Limit</label>
              <input
                type="number"
                value={settings.defaultDailyLimit || 50}
                onChange={(e) => handleChange('defaultDailyLimit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Query Limit</label>
              <input
                type="number"
                value={settings.defaultMonthlyLimit || 1000}
                onChange={(e) => handleChange('defaultMonthlyLimit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Maintenance Mode</h2>
              <p className="text-sm text-gray-500">Temporarily disable service for non-admins</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Message</label>
              <textarea
                value={settings.maintenanceMessage || 'EconChat is temporarily unavailable for maintenance. Please try again later.'}
                onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <button
              onClick={() => maintenanceMutation.mutate({
                enabled: !settings.maintenanceMode,
                message: settings.maintenanceMessage
              })}
              disabled={maintenanceMutation.isPending}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                settings.maintenanceMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              } disabled:opacity-50`}
            >
              {maintenanceMutation.isPending ? 'Processing...' : settings.maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
