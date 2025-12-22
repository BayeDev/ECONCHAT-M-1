/**
 * Authentication Middleware
 * Uses Clerk for JWT verification
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { userRepository, UserWithLimits } from '../repositories/user.repository.js';

// Extend Express Request to include auth info
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId?: string;
      };
      user?: UserWithLimits;
    }
  }
}

/**
 * Verify Clerk JWT token
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);

    // Verify the token with Clerk
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      console.error('[Auth] CLERK_SECRET_KEY not configured');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication is not properly configured',
      });
    }

    try {
      const payload = await verifyToken(token, {
        secretKey,
      });

      // Debug: log full JWT payload to see what Clerk sends
      console.log('[Auth] JWT payload keys:', Object.keys(payload));
      console.log('[Auth] JWT payload.metadata:', (payload as any).metadata);
      console.log('[Auth] JWT payload.publicMetadata:', (payload as any).publicMetadata);
      console.log('[Auth] JWT payload.public_metadata:', (payload as any).public_metadata);

      req.auth = {
        userId: payload.sub,
        sessionId: payload.sid,
      };

      // Get role from Clerk metadata (set in Clerk Dashboard)
      // Clerk may use different keys depending on configuration
      const clerkMetadata = (payload as any).publicMetadata || (payload as any).public_metadata || (payload as any).metadata || {};
      const clerkRole = clerkMetadata.role?.toUpperCase() || null;
      console.log('[Auth] Clerk metadata:', clerkMetadata, 'role:', clerkRole);

      // Load user from database
      let user = await userRepository.findByClerkId(payload.sub);

      if (!user) {
        // Auto-create user from Clerk data
        console.log(`[Auth] Auto-creating user from Clerk: ${payload.sub}`);

        // Get email from token claims
        const email = (payload as any).email || (payload as any).primaryEmail || `user-${payload.sub}@clerk.local`;
        const firstName = (payload as any).firstName || '';
        const lastName = (payload as any).lastName || '';
        const name = [firstName, lastName].filter(Boolean).join(' ') || null;
        const imageUrl = (payload as any).imageUrl || (payload as any).profileImageUrl || null;

        // Use role from Clerk metadata if present, otherwise default to USER
        const roleToUse = clerkRole || 'USER';

        const newUser = await userRepository.create({
          clerkId: payload.sub,
          email,
          name,
          imageUrl,
          role: roleToUse as 'ADMIN' | 'USER' | 'BETA_TESTER',
          status: 'ACTIVE',
        });

        // Fetch the user with limits
        user = await userRepository.findByClerkId(payload.sub);
        if (!user) {
          user = { ...newUser, limits: null };
        }

        console.log(`[Auth] User created: ${email}, role: ${roleToUse}`);
      } else {
        // Update role from Clerk metadata if explicitly set and different
        if (clerkRole && user.role !== clerkRole) {
          console.log(`[Auth] Updating role from Clerk: ${user.role} -> ${clerkRole}`);
          await userRepository.update(user.id, { role: clerkRole as 'ADMIN' | 'USER' | 'BETA_TESTER' });
          user.role = clerkRole as 'ADMIN' | 'USER' | 'BETA_TESTER';
        }
      }

      if (user && user.status === 'SUSPENDED') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Your account has been suspended. Please contact support.',
        });
      }

      if (user && user.status === 'PENDING') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Your account is pending approval.',
        });
      }

      req.user = user || undefined;
      next();
    } catch (verifyError) {
      console.error('[Auth] Token verification failed:', verifyError);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    console.error('[Auth] Middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional auth - doesn't fail if no token, but populates user if present
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      return next();
    }

    try {
      const payload = await verifyToken(token, { secretKey });

      req.auth = {
        userId: payload.sub,
        sessionId: payload.sid,
      };

      const user = await userRepository.findByClerkId(payload.sub);
      if (user && user.status === 'ACTIVE') {
        req.user = user;
      }
    } catch {
      // Token invalid, continue without auth
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Require admin role
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  console.log(`[Auth] requireAdmin check - user: ${req.user?.email}, role: ${req.user?.role}`);

  if (!req.user) {
    console.log('[Auth] requireAdmin: No user found');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'ADMIN') {
    console.log(`[Auth] requireAdmin: User ${req.user.email} has role ${req.user.role}, not ADMIN`);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }

  console.log(`[Auth] requireAdmin: User ${req.user.email} is ADMIN - access granted`);
  next();
}

/**
 * Require specific roles
 */
export function requireRole(...roles: ('ADMIN' | 'USER' | 'BETA_TESTER')[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
}
