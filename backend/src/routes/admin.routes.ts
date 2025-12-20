/**
 * Admin API Routes
 * User management, usage analytics, system settings
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { userRepository } from '../repositories/user.repository.js';
import { usageRepository } from '../repositories/usage.repository.js';
import { settingsRepository, DEFAULT_SETTINGS, SettingsKey } from '../repositories/settings.repository.js';
import { auditRepository, createAuditLog } from '../repositories/audit.repository.js';
import { waitlistRepository } from '../repositories/waitlist.repository.js';

const router = Router();

// ============ BOOTSTRAP ADMIN (No auth required) ============

/**
 * POST /api/admin/bootstrap
 * Make authenticated user an admin (only works if no admins exist OR user email in ADMIN_EMAILS)
 */
router.post('/bootstrap', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    console.log(`[Admin] Bootstrap request from user: ${user.email}, current role: ${user.role}`);

    // Check if user is already admin
    if (user.role === 'ADMIN') {
      return res.json({ success: true, message: 'Already admin', user });
    }

    // Check if admin emails are configured
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
    const userEmailLower = user.email.toLowerCase();

    // Check if no admins exist yet
    const adminCount = await userRepository.countByRole('ADMIN');
    console.log(`[Admin] Bootstrap: adminCount=${adminCount}, adminEmails=${adminEmails}, userEmail=${userEmailLower}`);

    // Allow if: (1) no admins exist, OR (2) user email is in ADMIN_EMAILS list
    if (adminCount === 0 || adminEmails.includes(userEmailLower)) {
      console.log(`[Admin] Bootstrap: Promoting ${user.email} to ADMIN`);
      await userRepository.update(user.id, { role: 'ADMIN' });
      user.role = 'ADMIN';

      await createAuditLog('ADMIN_BOOTSTRAP', 'USER', {
        userId: user.id,
        entityId: user.id,
        newValue: { role: 'ADMIN', reason: adminCount === 0 ? 'first_admin' : 'email_allowlist' },
        ipAddress: req.ip,
      });

      return res.json({ success: true, message: 'You are now an admin', user });
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Cannot bootstrap admin. Admins already exist and your email is not in the allowlist.'
    });
  } catch (error) {
    console.error('[Admin] Bootstrap error:', error);
    res.status(500).json({ error: 'Failed to bootstrap admin' });
  }
});

// All other admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// ============ USER MANAGEMENT ============

/**
 * GET /api/admin/users
 * List all users with pagination and filters
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, role, search } = req.query;

    const result = await userRepository.list({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as any,
      role: role as any,
      search: search as string,
    });

    res.json(result);
  } catch (error) {
    console.error('[Admin] Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get single user details
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await userRepository.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('[Admin] Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (role, status, limits)
 */
router.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const { role, status, limits } = req.body;
    const userId = req.params.id;

    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldValue = {
      role: existingUser.role,
      status: existingUser.status,
      limits: existingUser.limits,
    };

    // Update user
    const updates: any = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    const updatedUser = await userRepository.update(userId, updates);

    // Update limits if provided
    if (limits && updatedUser) {
      await userRepository.updateLimits(userId, limits);
    }

    // Create audit log
    await createAuditLog('USER_UPDATED', 'USER', {
      userId: req.user!.id,
      entityId: userId,
      oldValue,
      newValue: { role, status, limits },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Fetch updated user with limits
    const finalUser = await userRepository.findById(userId);
    res.json(finalUser);
  } catch (error) {
    console.error('[Admin] Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * POST /api/admin/users/:id/reset-usage
 * Reset user's daily/monthly usage
 */
router.post('/users/:id/reset-usage', async (req: Request, res: Response) => {
  try {
    const { type = 'daily' } = req.body;
    const userId = req.params.id;

    if (type === 'daily') {
      await userRepository.resetDailyUsage(userId);
    } else if (type === 'monthly') {
      await userRepository.resetMonthlyUsage(userId);
    } else if (type === 'all') {
      await userRepository.resetDailyUsage(userId);
      await userRepository.resetMonthlyUsage(userId);
    } else {
      return res.status(400).json({ error: 'Invalid reset type. Use: daily, monthly, or all' });
    }

    await createAuditLog('USAGE_RESET', 'USER', {
      userId: req.user!.id,
      entityId: userId,
      newValue: { resetType: type },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `${type} usage reset` });
  } catch (error) {
    console.error('[Admin] Error resetting usage:', error);
    res.status(500).json({ error: 'Failed to reset usage' });
  }
});

// ============ USAGE ANALYTICS ============

/**
 * GET /api/admin/usage/stats
 * Get aggregate usage statistics
 */
router.get('/usage/stats', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await usageRepository.getStats({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    // Add budget info
    const budget = await settingsRepository.isWithinBudget();
    const settings = await settingsRepository.getAll();
    const todayCost = await usageRepository.getTodayCost();
    const monthCost = await usageRepository.getMonthCost();

    res.json({
      ...stats,
      budget: {
        daily: { used: todayCost, limit: settings.dailyBudget, remaining: settings.dailyBudget - todayCost },
        monthly: { used: monthCost, limit: settings.monthlyBudget, remaining: settings.monthlyBudget - monthCost },
        withinLimits: budget,
      },
    });
  } catch (error) {
    console.error('[Admin] Error getting usage stats:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

/**
 * GET /api/admin/usage/daily
 * Get daily usage for charts
 */
router.get('/usage/daily', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const dailyUsage = await usageRepository.getDailyUsage({ days: parseInt(days as string) });
    res.json(dailyUsage);
  } catch (error) {
    console.error('[Admin] Error getting daily usage:', error);
    res.status(500).json({ error: 'Failed to get daily usage' });
  }
});

/**
 * GET /api/admin/usage/top-users
 * Get top users by query count
 */
router.get('/usage/top-users', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const topUsers = await usageRepository.getTopUsers({ limit: parseInt(limit as string) });
    res.json(topUsers);
  } catch (error) {
    console.error('[Admin] Error getting top users:', error);
    res.status(500).json({ error: 'Failed to get top users' });
  }
});

/**
 * GET /api/admin/usage/logs
 * Get usage logs with filters
 */
router.get('/usage/logs', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', userId, tier, success } = req.query;

    const result = await usageRepository.list({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      userId: userId as string,
      tier: tier as 'TIER1' | 'TIER2' | undefined,
      success: success === 'true' ? true : success === 'false' ? false : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('[Admin] Error getting usage logs:', error);
    res.status(500).json({ error: 'Failed to get usage logs' });
  }
});

// ============ SYSTEM SETTINGS ============

/**
 * GET /api/admin/settings
 * Get all system settings
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const settings = await settingsRepository.getAll();
    res.json(settings);
  } catch (error) {
    console.error('[Admin] Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * PATCH /api/admin/settings
 * Update system settings
 */
router.patch('/settings', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const oldSettings = await settingsRepository.getAll();

    // Update each setting (only valid keys)
    for (const [key, value] of Object.entries(updates)) {
      if (key in DEFAULT_SETTINGS) {
        await settingsRepository.set(key as SettingsKey, value as any);
      }
    }

    const newSettings = await settingsRepository.getAll();

    // Create audit log
    await createAuditLog('SETTINGS_UPDATED', 'SETTINGS', {
      userId: req.user!.id,
      oldValue: oldSettings,
      newValue: newSettings,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(newSettings);
  } catch (error) {
    console.error('[Admin] Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/admin/settings/maintenance
 * Toggle maintenance mode
 */
router.post('/settings/maintenance', async (req: Request, res: Response) => {
  try {
    const { enabled, message } = req.body;

    await settingsRepository.set('maintenanceMode', enabled);
    if (message) {
      await settingsRepository.set('maintenanceMessage', message);
    }

    await createAuditLog('MAINTENANCE_TOGGLED', 'SETTINGS', {
      userId: req.user!.id,
      newValue: { enabled, message },
      ipAddress: req.ip,
    });

    res.json({ success: true, maintenanceMode: enabled });
  } catch (error) {
    console.error('[Admin] Error toggling maintenance:', error);
    res.status(500).json({ error: 'Failed to toggle maintenance mode' });
  }
});

// ============ WAITLIST MANAGEMENT ============

/**
 * GET /api/admin/waitlist
 * List waitlist entries
 */
router.get('/waitlist', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query;

    const result = await waitlistRepository.list({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as any,
    });

    res.json(result);
  } catch (error) {
    console.error('[Admin] Error listing waitlist:', error);
    res.status(500).json({ error: 'Failed to list waitlist' });
  }
});

/**
 * POST /api/admin/waitlist/:id/approve
 * Approve waitlist entry
 */
router.post('/waitlist/:id/approve', async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;

    const entry = await waitlistRepository.updateStatus(
      req.params.id,
      'APPROVED',
      req.user!.id,
      notes
    );

    if (!entry) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    await createAuditLog('WAITLIST_APPROVED', 'WAITLIST', {
      userId: req.user!.id,
      entityId: req.params.id,
      newValue: { status: 'APPROVED', notes },
      ipAddress: req.ip,
    });

    res.json(entry);
  } catch (error) {
    console.error('[Admin] Error approving waitlist:', error);
    res.status(500).json({ error: 'Failed to approve waitlist entry' });
  }
});

/**
 * POST /api/admin/waitlist/:id/reject
 * Reject waitlist entry
 */
router.post('/waitlist/:id/reject', async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;

    const entry = await waitlistRepository.updateStatus(
      req.params.id,
      'REJECTED',
      req.user!.id,
      notes
    );

    if (!entry) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    await createAuditLog('WAITLIST_REJECTED', 'WAITLIST', {
      userId: req.user!.id,
      entityId: req.params.id,
      newValue: { status: 'REJECTED', notes },
      ipAddress: req.ip,
    });

    res.json(entry);
  } catch (error) {
    console.error('[Admin] Error rejecting waitlist:', error);
    res.status(500).json({ error: 'Failed to reject waitlist entry' });
  }
});

// ============ AUDIT LOGS ============

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', userId, action, entityType, startDate, endDate } = req.query;

    const result = await auditRepository.list({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      userId: userId as string,
      action: action as string,
      entityType: entityType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('[Admin] Error getting audit logs:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// ============ DASHBOARD SUMMARY ============

/**
 * GET /api/admin/dashboard
 * Get dashboard summary data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Get user counts
    const userCounts = await userRepository.getCountByStatus();
    const totalUsers = Object.values(userCounts).reduce((a, b) => a + b, 0);

    // Get usage stats
    const stats = await usageRepository.getStats();
    const todayCost = await usageRepository.getTodayCost();
    const monthCost = await usageRepository.getMonthCost();

    // Get settings
    const settings = await settingsRepository.getAll();

    // Get waitlist counts
    const waitlistCounts = await waitlistRepository.getCountByStatus();

    // Get recent activity (last 7 days usage)
    const recentUsage = await usageRepository.getDailyUsage({ days: 7 });

    res.json({
      users: {
        total: totalUsers,
        byStatus: userCounts,
        maxAllowed: settings.maxUsers,
        capacityUsed: Math.round((totalUsers / settings.maxUsers) * 100),
      },
      usage: {
        today: {
          queries: stats.totalQueries,
          cost: todayCost,
          budget: settings.dailyBudget,
          percentUsed: Math.round((todayCost / settings.dailyBudget) * 100),
        },
        month: {
          cost: monthCost,
          budget: settings.monthlyBudget,
          percentUsed: Math.round((monthCost / settings.monthlyBudget) * 100),
        },
        byTier: {
          1: { count: stats.tier1Queries, cost: 0 },
          2: { count: stats.tier2Queries, cost: 0 },
        },
        successRate: stats.successRate,
        avgLatency: stats.avgResponseTime,
      },
      waitlist: {
        pending: waitlistCounts.PENDING || 0,
        total: Object.values(waitlistCounts).reduce((a, b) => a + b, 0),
      },
      recentActivity: recentUsage,
      settings: {
        signupsEnabled: settings.signupsEnabled,
        tier1Enabled: settings.tier1Enabled,
        tier2Enabled: settings.tier2Enabled,
        maintenanceMode: settings.maintenanceMode,
      },
    });
  } catch (error) {
    console.error('[Admin] Error getting dashboard:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

export default router;
