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
  if (!JWT_SECRET) {
    // If no secret configured, generate a random temporary session token
    return `session_${Buffer.from(JSON.stringify({ id: user.id, email: user.email, role: user.role, name: user.name, ts: Date.now() })).toString('base64url')}`;
  }
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function verifyToken(token: string) {
  if (!token) return null;

  // 1. If Supabase is configured, verify via Supabase Auth
  if (isServerSupabaseConfigured) {
    try {
      const { data: { user }, error } = await serverSupabase.auth.getUser(token);
      if (!error && user) {
        // Fetch role from profiles
        const { data: profile } = await serverSupabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        return {
          id: user.id,
          email: user.email || '',
          role: (profile?.role as UserRole) || (user.user_metadata?.role as UserRole) || 'customer',
          name: profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        };
      }
    } catch {
      // Fallback
    }
  }

  // 2. Fallback token decode
  if (token.startsWith('session_')) {
    try {
      const jsonStr = Buffer.from(token.replace('session_', ''), 'base64url').toString('utf-8');
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  if (JWT_SECRET) {
    try {
      return jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        role: UserRole;
        name: string;
      };
    } catch {
      return null;
    }
  }

  return null;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = await verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  req.user = decoded;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    next();
  });
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

export function sanitizeUser(user: any) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
