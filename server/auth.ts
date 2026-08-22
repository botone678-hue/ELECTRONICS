import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from './types';
import { db } from './db';
import { serverSupabase, isServerSupabaseConfigured } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || '';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

export function generateToken(user: { id: string; email: string; role: UserRole; name: string }): string {
  if (!JWT_SECRET) return `session_${Buffer.from(JSON.stringify({ id: user.id, email: user.email, role: user.role, name: user.name, ts: Date.now() })).toString('base64url')}`;
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
}

export async function verifyToken(token: string) {
  if (!token) return null;

  if (isServerSupabaseConfigured) {
    try {
      const { data: { user }, error } = await serverSupabase.auth.getUser(token);
      if (!error && user) {
        // A missing profile is valid for a newly-created customer. Do not use
        // .single(), which turns that normal case into a 406 response.
        const { data: profile } = await serverSupabase
          .from('profiles')
          .select('id,role,name')
          .eq('id', user.id)
          .maybeSingle();

        return {
          id: user.id,
          email: user.email || '',
          role: (profile?.role as UserRole) || (user.user_metadata?.role as UserRole) || 'customer',
          name: profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        };
      }
    } catch (error) {
      console.warn('[auth][verifyToken] Supabase verification failed; continuing with fallback:', error instanceof Error ? error.message : error);
    }
  }

  if (token.startsWith('session_')) {
    try {
      return JSON.parse(Buffer.from(token.replace('session_', ''), 'base64url').toString('utf-8'));
    } catch {
      return null;
    }
  }

  if (JWT_SECRET) {
    try {
      return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: UserRole; name: string };
    } catch {
      return null;
    }
  }

  return null;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    const decoded = await verifyToken(authHeader.slice(7));
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    req.user = decoded;
    return next();
  } catch (error) {
    console.error('[auth][requireAuth]', error);
    return res.status(401).json({ error: 'Authentication could not be verified. Please sign in again.' });
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await requireAuth(req, res, () => {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
      return next();
    });
  } catch (error) {
    console.error('[auth][requireAdmin]', error);
    return res.status(401).json({ error: 'Authentication could not be verified.' });
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const decoded = await verifyToken(authHeader.slice(7));
      if (decoded) req.user = decoded;
    }
  } catch (error) {
    // Optional authentication must never prevent checkout from reaching the order route.
    console.warn('[auth][optionalAuth] ignored authentication error:', error instanceof Error ? error.message : error);
  }
  return next();
}

export function sanitizeUser(user: any) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
