/**
 * Waitlist Repository
 * Data access layer for waiting list management
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db, waitingList, WaitingListEntry, NewWaitingListEntry } from '../db/index.js';

export const waitlistRepository = {
  /**
   * Add to waiting list
   */
  async add(data: NewWaitingListEntry): Promise<WaitingListEntry> {
    if (!db) throw new Error('Database not connected');

    const [entry] = await db.insert(waitingList).values(data).returning();
    return entry;
  },

  /**
   * Find by email
   */
  async findByEmail(email: string): Promise<WaitingListEntry | null> {
    if (!db) return null;

    const entry = await db.query.waitingList.findFirst({
      where: eq(waitingList.email, email),
    });

    return entry || null;
  },

  /**
   * Get all entries with pagination and filters
   */
  async list(options: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  } = {}): Promise<{ entries: WaitingListEntry[]; total: number }> {
    if (!db) return { entries: [], total: 0 };

    const { page = 1, limit = 50, status } = options;
    const offset = (page - 1) * limit;

    const whereClause = status ? eq(waitingList.status, status) : undefined;

    const entries = await db.query.waitingList.findMany({
      where: whereClause,
      orderBy: [desc(waitingList.createdAt)],
      limit,
      offset,
    });

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitingList)
      .where(whereClause);

    return {
      entries,
      total: Number(countResult?.count || 0),
    };
  },

  /**
   * Update entry status
   */
  async updateStatus(
    id: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED',
    reviewedBy: string,
    notes?: string
  ): Promise<WaitingListEntry | null> {
    if (!db) return null;

    const [updated] = await db
      .update(waitingList)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date(),
        notes,
        updatedAt: new Date(),
      })
      .where(eq(waitingList.id, id))
      .returning();

    return updated || null;
  },

  /**
   * Delete entry
   */
  async delete(id: string): Promise<boolean> {
    if (!db) return false;

    await db.delete(waitingList).where(eq(waitingList.id, id));
    return true;
  },

  /**
   * Get count by status
   */
  async getCountByStatus(): Promise<Record<string, number>> {
    if (!db) return {};

    const result = await db
      .select({
        status: waitingList.status,
        count: sql<number>`count(*)`,
      })
      .from(waitingList)
      .groupBy(waitingList.status);

    return result.reduce((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);
  },

  /**
   * Get pending count
   */
  async getPendingCount(): Promise<number> {
    if (!db) return 0;

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitingList)
      .where(eq(waitingList.status, 'PENDING'));

    return Number(result?.count || 0);
  },
};
