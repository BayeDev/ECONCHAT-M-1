/**
 * Rate Limiting & Usage Control Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../repositories/user.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';

/**
 * Check user query limits
 */
export async function checkUserLimits(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip if no authenticated user (handled by auth middleware)
    if (!req.user) {
      return next();
    }

    const limits = req.user.limits;

    if (!limits) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'User limits not configured',
      });
    }

    // Check daily limit
    if (limits.dailyQueriesUsed >= limits.dailyQueryLimit) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Daily query limit reached. Please try again tomorrow.',
        limits: {
          daily: { used: limits.dailyQueriesUsed, limit: limits.dailyQueryLimit },
        },
      });
    }

    // Check monthly limit
    if (limits.monthlyQueriesUsed >= limits.monthlyQueryLimit) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Monthly query limit reached. Please try again next month.',
        limits: {
          monthly: { used: limits.monthlyQueriesUsed, limit: limits.monthlyQueryLimit },
        },
      });
    }

    next();
  } catch (error) {
    console.error('[RateLimit] Error checking user limits:', error);
    next();
  }
}

/**
 * Check global budget limits
 */
export async function checkBudgetLimits(req: Request, res: Response, next: NextFunction) {
  try {
    const budget = await settingsRepository.isWithinBudget();

    if (!budget.daily) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Daily API budget exceeded. Please try again tomorrow.',
      });
    }

    if (!budget.monthly) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Monthly API budget exceeded. Please try again next month.',
      });
    }

    next();
  } catch (error) {
    console.error('[RateLimit] Error checking budget:', error);
    next();
  }
}

/**
 * Check tier access
 */
export function checkTierAccess(tier: 'TIER1' | 'TIER2') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check global tier settings
      const settings = await settingsRepository.getAll();

      if (tier === 'TIER1' && !settings.tier1Enabled) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          message: 'Claude Opus (Tier 1) is currently disabled.',
        });
      }

      if (tier === 'TIER2' && !settings.tier2Enabled) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          message: 'Gemini Flash (Tier 2) is currently disabled.',
        });
      }

      // Check user tier access
      if (req.user && req.user.limits) {
        if (tier === 'TIER1' && !req.user.limits.tier1Access) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to Claude Opus (Tier 1). Please upgrade your plan.',
          });
        }

        if (tier === 'TIER2' && !req.user.limits.tier2Access) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to Gemini Flash (Tier 2).',
          });
        }
      }

      next();
    } catch (error) {
      console.error('[RateLimit] Error checking tier access:', error);
      next();
    }
  };
}

/**
 * Check maintenance mode
 */
export async function checkMaintenanceMode(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await settingsRepository.getAll();

    // Allow admin access during maintenance
    if (settings.maintenanceMode && (!req.user || req.user.role !== 'ADMIN')) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: settings.maintenanceMessage,
      });
    }

    next();
  } catch (error) {
    console.error('[RateLimit] Error checking maintenance mode:', error);
    next();
  }
}

/**
 * Increment user usage after successful request
 * (Call this in the response handler, not middleware)
 */
export async function incrementUserUsage(userId: string): Promise<void> {
  try {
    await userRepository.incrementUsage(userId);
  } catch (error) {
    console.error('[RateLimit] Error incrementing usage:', error);
  }
}
