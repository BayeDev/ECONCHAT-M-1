/**
 * Database Connection
 * Using Drizzle ORM with PostgreSQL
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[Database] DATABASE_URL not set - database features disabled');
}

// Create postgres connection (with connection pooling)
const client = connectionString
  ? postgres(connectionString, {
      max: 10, // Maximum connections in pool
      idle_timeout: 20,
      connect_timeout: 10,
    })
  : null;

// Create drizzle instance
export const db = client ? drizzle(client, { schema }) : null;

// Export schema for use elsewhere
export * from './schema.js';

// Connect to database (logs connection status)
export async function connectDatabase(): Promise<boolean> {
  if (!db || !client) {
    console.log('[Database] No DATABASE_URL configured - running without database');
    return false;
  }

  try {
    await client`SELECT 1`;
    console.log('[Database] Connected successfully');
    return true;
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    return false;
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!db || !client) {
    return false;
  }

  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[Database] Health check failed:', error);
    return false;
  }
}

// Close connection (for graceful shutdown)
export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.end();
  }
}
