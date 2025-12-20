/**
 * Audit Repository
 * Data access layer for audit logs
 */

import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { db, auditLogs, AuditLog, NewAuditLog, users } from '../db/index.js';

export const auditRepository = {
  /**
   * Create an audit log entry
   */
  async log(data: NewAuditLog): Promise<AuditLog> {
    if (!db) throw new Error('Database not connected');

    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  },

  /**
   * Get audit logs with pagination and filters
   */
  async list(options: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{ logs: (AuditLog & { user?: { email: string; name: string | null } })[]; total: number }> {
    if (!db) return { logs: [], total: 0 };

    const { page = 1, limit = 50, userId, action, entityType, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
    if (startDate) conditions.push(gte(auditLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(auditLogs.createdAt, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get logs with user info
    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        oldValue: auditLogs.oldValue,
        newValue: auditLogs.newValue,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
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
   * Get recent actions for a specific entity
   */
  async getEntityHistory(entityType: string, entityId: string, limit = 20): Promise<AuditLog[]> {
    if (!db) return [];

    return db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      ),
      orderBy: [desc(auditLogs.createdAt)],
      limit,
    });
  },

  /**
   * Get unique action types
   */
  async getActionTypes(): Promise<string[]> {
    if (!db) return [];

    const result = await db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs);

    return result.map(r => r.action);
  },

  /**
   * Get unique entity types
   */
  async getEntityTypes(): Promise<string[]> {
    if (!db) return [];

    const result = await db
      .selectDistinct({ entityType: auditLogs.entityType })
      .from(auditLogs);

    return result.map(r => r.entityType);
  },
};

// Helper function to create audit log entries
export async function createAuditLog(
  action: string,
  entityType: string,
  data: {
    userId?: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  try {
    await auditRepository.log({
      action,
      entityType,
      userId: data.userId,
      entityId: data.entityId,
      oldValue: data.oldValue as any,
      newValue: data.newValue as any,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  } catch (error) {
    console.error('[Audit] Failed to create audit log:', error);
  }
}
