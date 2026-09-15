import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from './types';
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

// Retained for compatibility with any non-Supabase integrations, but never
// fabricate an unsigned session token. Production auth must be cryptographically signed.
export function generateToken(user: { id: string; email: string; role: UserRole; name: string }): string {
  if (!JWT_SECRET) throw new Error('JWT signing secret is not configured.');
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function verifyToken(token: string) {
  if (!token) return null;

  // Supabase is authoritative in production. Never derive authorization
  // roles from user_metadata because that metadata is not an authorization store.
  if (isServerSupabaseConfigured) {
    try {
      const { data: { user }, error } = await serverSupabase.auth.getUser(token);
      if (!error && user) {
        const { data: profile, error: profileError } = await serverSupabase
          .from('profiles')
          .select('id,role,name')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError || !profile) {
          console.warn('[auth][verifyToken] authenticated user has no valid application profile');
          return null;
        }

        const role = profile.role as UserRole;
        if (role !== 'customer' && role !== 'admin') {
          console.warn('[auth][verifyToken] invalid profile role');
          return null;
        }

        return {
          id: user.id,
          email: user.email || '',
          role,
          name: profile.name || user.email?.split('@')[0] || 'User'
        };
      }
      return null;
    } catch (error) {
      console.warn('[auth][verifyToken] Supabase verification failed:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  // Only permit signed JWT authentication when Supabase is not configured.
  // Unsigned/local session tokens are never accepted.
  if (JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: UserRole; name: string };
      if (decoded.role !== 'customer' && decoded.role !== 'admin') return null;
      return decoded;
    } catch {
      return null;
    }
  }

  return null;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
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
    console.warn('[auth][optionalAuth] ignored authentication error:', error instanceof Error ? error.message : error);
  }
  return next();
}

export function sanitizeUser(user: any) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
