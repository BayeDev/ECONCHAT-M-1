/**
 * Clerk Webhook Routes
 * Handles user sync from Clerk authentication
 */

import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { userRepository } from '../repositories/user.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { createAuditLog } from '../repositories/audit.repository.js';

const router = Router();

// Clerk webhook types
interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: number;
  updated_at: number;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData;
}

/**
 * POST /api/webhooks/clerk
 * Handles Clerk webhook events for user sync
 */
router.post('/clerk', async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('[Webhook] CLERK_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Get Svix headers
  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing Svix headers' });
  }

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(JSON.stringify(req.body), {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Process event
  const { type, data } = event;
  console.log(`[Webhook] Received event: ${type}`);

  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;

      case 'user.updated':
        await handleUserUpdated(data);
        break;

      case 'user.deleted':
        await handleUserDeleted(data);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * Handle user.created event
 */
async function handleUserCreated(data: ClerkUserData): Promise<void> {
  const email = data.email_addresses[0]?.email_address;
  if (!email) {
    console.error('[Webhook] User created without email');
    return;
  }

  // Check if user already exists
  const existingUser = await userRepository.findByClerkId(data.id);
  if (existingUser) {
    console.log(`[Webhook] User already exists: ${data.id}`);
    return;
  }

  // Check if signups are enabled and within capacity
  const canSignup = await settingsRepository.canSignup();
  const settings = await settingsRepository.getAll();

  // Determine initial status
  let status: 'ACTIVE' | 'PENDING' = 'PENDING';

  // First user becomes admin and is auto-approved
  const userCount = await userRepository.getTotalCount();
  const isFirstUser = userCount === 0;

  if (isFirstUser || canSignup) {
    status = 'ACTIVE';
  }

  // Create user
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

  const newUser = await userRepository.create({
    clerkId: data.id,
    email,
    name,
    imageUrl: data.image_url,
    role: isFirstUser ? 'ADMIN' : 'USER',
    status,
  });

  console.log(`[Webhook] User created: ${email} (${status}), isFirstUser: ${isFirstUser}`);

  // Create audit log
  await createAuditLog('USER_CREATED', 'USER', {
    entityId: newUser.id,
    newValue: { email, status, role: newUser.role },
  });
}

/**
 * Handle user.updated event
 */
async function handleUserUpdated(data: ClerkUserData): Promise<void> {
  const existingUser = await userRepository.findByClerkId(data.id);

  if (!existingUser) {
    // User doesn't exist locally, create them
    await handleUserCreated(data);
    return;
  }

  const email = data.email_addresses[0]?.email_address;
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

  // Update user
  const oldValue = { email: existingUser.email, name: existingUser.name };

  await userRepository.update(existingUser.id, {
    email: email || existingUser.email,
    name,
    imageUrl: data.image_url,
  });

  console.log(`[Webhook] User updated: ${existingUser.email}`);

  // Create audit log
  await createAuditLog('USER_UPDATED', 'USER', {
    entityId: existingUser.id,
    oldValue,
    newValue: { email, name },
  });
}

/**
 * Handle user.deleted event
 */
async function handleUserDeleted(data: ClerkUserData): Promise<void> {
  const existingUser = await userRepository.findByClerkId(data.id);

  if (!existingUser) {
    console.log(`[Webhook] User not found for deletion: ${data.id}`);
    return;
  }

  // Soft delete - update status to SUSPENDED
  await userRepository.update(existingUser.id, {
    status: 'SUSPENDED',
  });

  console.log(`[Webhook] User suspended (soft delete): ${existingUser.email}`);

  // Create audit log
  await createAuditLog('USER_DELETED', 'USER', {
    entityId: existingUser.id,
    oldValue: { status: existingUser.status },
    newValue: { status: 'SUSPENDED' },
  });
}

export default router;
