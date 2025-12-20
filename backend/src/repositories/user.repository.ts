/**
 * User Repository
 * Data access layer for user operations
 */

import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import { db, users, userLimits, User, NewUser, UserLimits, NewUserLimits } from '../db/index.js';

export interface UserWithLimits extends User {
  limits: UserLimits | null;
}

export const userRepository = {
  /**
   * Find user by Clerk ID
   */
  async findByClerkId(clerkId: string): Promise<UserWithLimits | null> {
    if (!db) return null;

    const result = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      with: { limits: true },
    });

    return result || null;
  },

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserWithLimits | null> {
    if (!db) return null;

    const result = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: { limits: true },
    });

    return result || null;
  },

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserWithLimits | null> {
    if (!db) return null;

    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: { limits: true },
    });

    return result || null;
  },

  /**
   * Create a new user (from Clerk webhook)
   */
  async create(data: NewUser): Promise<User> {
    if (!db) throw new Error('Database not connected');

    const [user] = await db.insert(users).values(data).returning();

    // Create default limits for the user
    await db.insert(userLimits).values({
      userId: user.id,
      dailyQueryLimit: 50,
      monthlyQueryLimit: 1000,
      tier1Access: false,
      tier2Access: true,
    });

    return user;
  },

  /**
   * Update user
   */
  async update(id: string, data: Partial<NewUser>): Promise<User | null> {
    if (!db) return null;

    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return updated || null;
  },

  /**
   * Update user by Clerk ID
   */
  async updateByClerkId(clerkId: string, data: Partial<NewUser>): Promise<User | null> {
    if (!db) return null;

    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.clerkId, clerkId))
      .returning();

    return updated || null;
  },

  /**
   * Delete user by Clerk ID
   */
  async deleteByClerkId(clerkId: string): Promise<boolean> {
    if (!db) return false;

    const result = await db.delete(users).where(eq(users.clerkId, clerkId));
    return true;
  },

  /**
   * List all users with pagination and filters
   */
  async list(options: {
    page?: number;
    limit?: number;
    role?: 'ADMIN' | 'USER' | 'BETA_TESTER';
    status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
    search?: string;
  } = {}): Promise<{ users: UserWithLimits[]; total: number }> {
    if (!db) return { users: [], total: 0 };

    const { page = 1, limit = 20, role, status, search } = options;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (role) conditions.push(eq(users.role, role));
    if (status) conditions.push(eq(users.status, status));
    if (search) {
      conditions.push(
        or(
          like(users.email, `%${search}%`),
          like(users.name, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get users with limits
    const result = await db.query.users.findMany({
      where: whereClause,
      with: { limits: true },
      orderBy: [desc(users.createdAt)],
      limit,
      offset,
    });

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    return {
      users: result,
      total: Number(countResult?.count || 0),
    };
  },

  /**
   * Update user limits
   */
  async updateLimits(userId: string, data: Partial<NewUserLimits>): Promise<UserLimits | null> {
    if (!db) return null;

    const [updated] = await db
      .update(userLimits)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userLimits.userId, userId))
      .returning();

    return updated || null;
  },

  /**
   * Increment usage counters
   */
  async incrementUsage(userId: string): Promise<void> {
    if (!db) return;

    await db
      .update(userLimits)
      .set({
        dailyQueriesUsed: sql`${userLimits.dailyQueriesUsed} + 1`,
        monthlyQueriesUsed: sql`${userLimits.monthlyQueriesUsed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(userLimits.userId, userId));
  },

  /**
   * Reset daily usage counters for a specific user
   */
  async resetDailyUsage(userId?: string): Promise<void> {
    if (!db) return;

    const query = db
      .update(userLimits)
      .set({
        dailyQueriesUsed: 0,
        lastResetDaily: new Date(),
        updatedAt: new Date(),
      });

    if (userId) {
      await query.where(eq(userLimits.userId, userId));
    } else {
      await query;
    }
  },

  /**
   * Reset monthly usage counters for a specific user
   */
  async resetMonthlyUsage(userId?: string): Promise<void> {
    if (!db) return;

    const query = db
      .update(userLimits)
      .set({
        monthlyQueriesUsed: 0,
        lastResetMonthly: new Date(),
        updatedAt: new Date(),
      });

    if (userId) {
      await query.where(eq(userLimits.userId, userId));
    } else {
      await query;
    }
  },

  /**
   * Get user count by status
   */
  async getCountByStatus(): Promise<Record<string, number>> {
    if (!db) return {};

    const result = await db
      .select({
        status: users.status,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.status);

    return result.reduce((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);
  },

  /**
   * Get total user count
   */
  async getTotalCount(): Promise<number> {
    if (!db) return 0;

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    return Number(result?.count || 0);
  },

  /**
   * Count users by role
   */
  async countByRole(role: 'ADMIN' | 'USER' | 'BETA_TESTER'): Promise<number> {
    if (!db) return 0;

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, role));

    return Number(result?.count || 0);
  },
};
