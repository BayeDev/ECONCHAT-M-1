/**
 * Settings Repository
 * Data access layer for system settings
 */

import { eq } from 'drizzle-orm';
import { db, systemSettings, SystemSetting, NewSystemSetting } from '../db/index.js';

// Default settings
export const DEFAULT_SETTINGS = {
  maxUsers: 50,
  dailyBudget: 10, // $10/day
  monthlyBudget: 200, // $200/month
  signupsEnabled: true,
  tier1Enabled: true,
  tier2Enabled: true,
  defaultDailyQueryLimit: 50,
  defaultMonthlyQueryLimit: 1000,
  maintenanceMode: false,
  maintenanceMessage: 'EconChat is currently under maintenance. Please try again later.',
};

export type SettingsKey = keyof typeof DEFAULT_SETTINGS;

export const settingsRepository = {
  /**
   * Get a setting value
   */
  async get<K extends SettingsKey>(key: K): Promise<typeof DEFAULT_SETTINGS[K]> {
    if (!db) return DEFAULT_SETTINGS[key];

    const setting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key),
    });

    if (!setting) return DEFAULT_SETTINGS[key];

    return setting.value as typeof DEFAULT_SETTINGS[K];
  },

  /**
   * Get all settings
   */
  async getAll(): Promise<typeof DEFAULT_SETTINGS> {
    if (!db) return DEFAULT_SETTINGS;

    const settings = await db.select().from(systemSettings);

    const result = { ...DEFAULT_SETTINGS };

    for (const setting of settings) {
      if (setting.key in DEFAULT_SETTINGS) {
        (result as any)[setting.key] = setting.value;
      }
    }

    return result;
  },

  /**
   * Set a setting value
   */
  async set<K extends SettingsKey>(
    key: K,
    value: typeof DEFAULT_SETTINGS[K],
    updatedBy?: string
  ): Promise<SystemSetting> {
    if (!db) throw new Error('Database not connected');

    const existing = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key),
    });

    if (existing) {
      const [updated] = await db
        .update(systemSettings)
        .set({
          value: value as any,
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, key))
        .returning();

      return updated;
    } else {
      const [created] = await db
        .insert(systemSettings)
        .values({
          key,
          value: value as any,
          updatedBy,
          description: getSettingDescription(key),
        })
        .returning();

      return created;
    }
  },

  /**
   * Set multiple settings at once
   */
  async setMany(
    settings: Partial<typeof DEFAULT_SETTINGS>,
    updatedBy?: string
  ): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      if (key in DEFAULT_SETTINGS) {
        await this.set(key as SettingsKey, value as any, updatedBy);
      }
    }
  },

  /**
   * Initialize default settings if not present
   */
  async initializeDefaults(): Promise<void> {
    if (!db) return;

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, key),
      });

      if (!existing) {
        await db.insert(systemSettings).values({
          key,
          value: value as any,
          description: getSettingDescription(key as SettingsKey),
        });
      }
    }
  },

  /**
   * Check if within budget
   */
  async isWithinBudget(): Promise<{ daily: boolean; monthly: boolean; dailyCost: number; monthlyCost: number }> {
    const settings = await this.getAll();

    // Import usage repository dynamically to avoid circular dependency
    const { usageRepository } = await import('./usage.repository.js');

    const dailyCost = await usageRepository.getTodayCost();
    const monthlyCost = await usageRepository.getMonthCost();

    return {
      daily: dailyCost < settings.dailyBudget,
      monthly: monthlyCost < settings.monthlyBudget,
      dailyCost,
      monthlyCost,
    };
  },

  /**
   * Check if signups are allowed
   */
  async canSignup(): Promise<{ allowed: boolean; reason?: string }> {
    const settings = await this.getAll();

    if (!settings.signupsEnabled) {
      return { allowed: false, reason: 'Signups are currently disabled' };
    }

    if (settings.maintenanceMode) {
      return { allowed: false, reason: settings.maintenanceMessage };
    }

    // Import user repository dynamically to avoid circular dependency
    const { userRepository } = await import('./user.repository.js');
    const userCount = await userRepository.getTotalCount();

    if (userCount >= settings.maxUsers) {
      return { allowed: false, reason: 'Maximum user limit reached. Please join the waiting list.' };
    }

    return { allowed: true };
  },
};

function getSettingDescription(key: SettingsKey): string {
  const descriptions: Record<SettingsKey, string> = {
    maxUsers: 'Maximum number of users allowed',
    dailyBudget: 'Maximum daily API spending in USD',
    monthlyBudget: 'Maximum monthly API spending in USD',
    signupsEnabled: 'Whether new user signups are allowed',
    tier1Enabled: 'Whether Claude Opus (Tier 1) is enabled',
    tier2Enabled: 'Whether Gemini Flash (Tier 2) is enabled',
    defaultDailyQueryLimit: 'Default daily query limit for new users',
    defaultMonthlyQueryLimit: 'Default monthly query limit for new users',
    maintenanceMode: 'Whether the system is in maintenance mode',
    maintenanceMessage: 'Message to display during maintenance',
  };

  return descriptions[key];
}
