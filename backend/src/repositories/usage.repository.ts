/**
 * Usage Repository
 * Data access layer for usage logs and analytics
 */

import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';
import { db, usageLogs, UsageLog, NewUsageLog, users } from '../db/index.js';

export interface UsageStats {
  totalQueries: number;
  totalCost: number;
  avgResponseTime: number;
  successRate: number;
  tier1Queries: number;
  tier2Queries: number;
}

export interface DailyUsage {
  date: string;
  queries: number;
  cost: number;
  tier1: number;
  tier2: number;
}

export const usageRepository = {
  /**
   * Log a query
   */
  async log(data: NewUsageLog): Promise<UsageLog> {
    if (!db) throw new Error('Database not connected');

    const [log] = await db.insert(usageLogs).values(data).returning();
    return log;
  },

  /**
   * Get usage logs with pagination and filters
   */
  async list(options: {
    page?: number;
    limit?: number;
    userId?: string;
    tier?: 'TIER1' | 'TIER2';
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{ logs: (UsageLog & { user?: { email: string; name: string | null } })[]; total: number }> {
    if (!db) return { logs: [], total: 0 };

    const { page = 1, limit = 50, userId, tier, success, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (userId) conditions.push(eq(usageLogs.userId, userId));
    if (tier) conditions.push(eq(usageLogs.tier, tier));
    if (success !== undefined) conditions.push(eq(usageLogs.success, success));
    if (startDate) conditions.push(gte(usageLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(usageLogs.createdAt, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get logs with user info
    const logs = await db
      .select({
        id: usageLogs.id,
        userId: usageLogs.userId,
        sessionId: usageLogs.sessionId,
        query: usageLogs.query,
        tier: usageLogs.tier,
        model: usageLogs.model,
        inputTokens: usageLogs.inputTokens,
        outputTokens: usageLogs.outputTokens,
        cost: usageLogs.cost,
        responseTimeMs: usageLogs.responseTimeMs,
        success: usageLogs.success,
        errorMessage: usageLogs.errorMessage,
        toolsUsed: usageLogs.toolsUsed,
        sources: usageLogs.sources,
        createdAt: usageLogs.createdAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(usageLogs)
      .leftJoin(users, eq(usageLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(usageLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(usageLogs)
      .where(whereClause);

    return {
      logs: logs.map(log => ({
        ...log,
        user: log.userEmail ? { email: log.userEmail, name: log.userName } : undefined,
      })) as any,
      total: Number(countResult?.count || 0),
    };
  },

  /**
   * Get usage stats for a time period
   */
  async getStats(options: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  } = {}): Promise<UsageStats> {
    if (!db) return {
      totalQueries: 0,
      totalCost: 0,
      avgResponseTime: 0,
      successRate: 0,
      tier1Queries: 0,
      tier2Queries: 0,
    };

    const { startDate, endDate, userId } = options;

    const conditions = [];
    if (userId) conditions.push(eq(usageLogs.userId, userId));
    if (startDate) conditions.push(gte(usageLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(usageLogs.createdAt, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [stats] = await db
      .select({
        totalQueries: sql<number>`count(*)`,
        totalCost: sql<number>`coalesce(sum(${usageLogs.cost}), 0)`,
        avgResponseTime: sql<number>`coalesce(avg(${usageLogs.responseTimeMs}), 0)`,
        successCount: sql<number>`sum(case when ${usageLogs.success} then 1 else 0 end)`,
        tier1Queries: sql<number>`sum(case when ${usageLogs.tier} = 'TIER1' then 1 else 0 end)`,
        tier2Queries: sql<number>`sum(case when ${usageLogs.tier} = 'TIER2' then 1 else 0 end)`,
      })
      .from(usageLogs)
      .where(whereClause);

    const totalQueries = Number(stats?.totalQueries || 0);

    return {
      totalQueries,
      totalCost: Number(stats?.totalCost || 0),
      avgResponseTime: Math.round(Number(stats?.avgResponseTime || 0)),
      successRate: totalQueries > 0 ? Number(stats?.successCount || 0) / totalQueries : 0,
      tier1Queries: Number(stats?.tier1Queries || 0),
      tier2Queries: Number(stats?.tier2Queries || 0),
    };
  },

  /**
   * Get daily usage for charts
   */
  async getDailyUsage(options: {
    days?: number;
    userId?: string;
  } = {}): Promise<DailyUsage[]> {
    if (!db) return [];

    const { days = 30, userId } = options;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conditions = [gte(usageLogs.createdAt, startDate)];
    if (userId) conditions.push(eq(usageLogs.userId, userId));

    const result = await db
      .select({
        date: sql<string>`date(${usageLogs.createdAt})`,
        queries: sql<number>`count(*)`,
        cost: sql<number>`coalesce(sum(${usageLogs.cost}), 0)`,
        tier1: sql<number>`sum(case when ${usageLogs.tier} = 'TIER1' then 1 else 0 end)`,
        tier2: sql<number>`sum(case when ${usageLogs.tier} = 'TIER2' then 1 else 0 end)`,
      })
      .from(usageLogs)
      .where(and(...conditions))
      .groupBy(sql`date(${usageLogs.createdAt})`)
      .orderBy(sql`date(${usageLogs.createdAt})`);

    return result.map(row => ({
      date: row.date,
      queries: Number(row.queries),
      cost: Number(row.cost),
      tier1: Number(row.tier1),
      tier2: Number(row.tier2),
    }));
  },

  /**
   * Get top users by usage
   */
  async getTopUsers(options: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{ userId: string; email: string; name: string | null; queries: number; cost: number }[]> {
    if (!db) return [];

    const { limit = 10, startDate, endDate } = options;

    const conditions = [];
    if (startDate) conditions.push(gte(usageLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(usageLogs.createdAt, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        userId: usageLogs.userId,
        email: users.email,
        name: users.name,
        queries: sql<number>`count(*)`,
        cost: sql<number>`coalesce(sum(${usageLogs.cost}), 0)`,
      })
      .from(usageLogs)
      .innerJoin(users, eq(usageLogs.userId, users.id))
      .where(whereClause)
      .groupBy(usageLogs.userId, users.email, users.name)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return result.map(row => ({
      userId: row.userId!,
      email: row.email,
      name: row.name,
      queries: Number(row.queries),
      cost: Number(row.cost),
    }));
  },

  /**
   * Get today's total cost
   */
  async getTodayCost(): Promise<number> {
    if (!db) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ cost: sql<number>`coalesce(sum(${usageLogs.cost}), 0)` })
      .from(usageLogs)
      .where(gte(usageLogs.createdAt, today));

    return Number(result?.cost || 0);
  },

  /**
   * Get this month's total cost
   */
  async getMonthCost(): Promise<number> {
    if (!db) return 0;

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ cost: sql<number>`coalesce(sum(${usageLogs.cost}), 0)` })
      .from(usageLogs)
      .where(gte(usageLogs.createdAt, firstOfMonth));

    return Number(result?.cost || 0);
  },
};
