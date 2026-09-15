import { Router, Response } from 'express';
import { authSupabase, hasServiceRole, isServerSupabaseConfigured, serverSupabase } from '../supabase';
import { requireAuth, sanitizeUser, AuthRequest } from '../auth';

export const authRouter = Router();

function mapAuthUser(user: any, profile?: any) {
  return sanitizeUser({
    id: user.id,
    email: user.email || profile?.email || '',
    name: profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    phone: profile?.phone || user.user_metadata?.phone || '',
    role: profile?.role || user.user_metadata?.role || 'customer',
    savedAddresses: profile?.saved_addresses || []
  });
}

async function loadProfile(id: string) {
  const { data, error } = await serverSupabase
    .from('profiles')
    .select('id,name,email,phone,role,saved_addresses,created_at,updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Customer registration is backed by Supabase Auth so accounts survive
// serverless instances and use the same UUIDs as public.profiles/orders.
authRouter.post('/register', async (req, res) => {
  try {
    if (!isServerSupabaseConfigured || !hasServiceRole) {
      return res.status(503).json({ error: 'Production authentication is not configured.' });
    }

    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields (name, email, phone, password) are required.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();
    const normalizedPhone = String(phone).trim();
    if (!normalizedName || !normalizedPhone || !normalizedEmail) {
      return res.status(400).json({ error: 'Please provide valid registration details.' });
    }

    const { data, error } = await serverSupabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: normalizedName, phone: normalizedPhone, role: 'customer' }
    });
    if (error) {
      const message = error.message || 'Unable to create account.';
      const duplicate = /already|exists|registered/i.test(message);
      return res.status(duplicate ? 400 : 500).json({ error: duplicate ? 'An account with this email address already exists.' : message });
    }

    const user = data.user;
    if (!user) return res.status(500).json({ error: 'Account creation returned no user.' });

    // The database trigger normally creates this profile. The fallback upsert
    // makes registration resilient if the trigger is absent in a fresh project.
    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        role: 'customer',
        saved_addresses: []
      }, { onConflict: 'id' })
      .select('id,name,email,phone,role,saved_addresses,created_at,updated_at')
      .single();
    if (profileError) {
      console.error('[auth][register][profile]', profileError);
      // Do not leave an auth account with an unusable application profile.
      await serverSupabase.auth.admin.deleteUser(user.id);
      return res.status(500).json({ error: 'Account profile could not be created. Please try again.' });
    }

    // Sign in through the public auth client to issue a real Supabase access token.
    const { data: session, error: signInError } = await authSupabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });
    if (signInError || !session.session) {
      console.error('[auth][register][signin]', signInError);
      return res.status(500).json({ error: 'Account created, but automatic sign-in failed. Please sign in.' });
    }

    return res.status(201).json({
      message: 'Account registered successfully.',
      token: session.session.access_token,
      user: mapAuthUser(user, profile)
    });
  } catch (err: any) {
    console.error('[auth][register]', err);
    return res.status(500).json({ error: err.message || 'Internal registration error' });
  }
});

// Customer & Admin sign in. Role is read from the protected profile and the
// client cannot request elevation by sending requireRole in the body.
authRouter.post('/login', async (req, res) => {
  try {
    if (!isServerSupabaseConfigured) {
      return res.status(503).json({ error: 'Production authentication is not configured.' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data, error } = await authSupabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password: String(password)
    });
    if (error || !data.user || !data.session) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const profile = await loadProfile(data.user.id);
    if (!profile) {
      return res.status(403).json({ error: 'Your account profile is not ready. Please contact support.' });
    }

    return res.json({
      message: 'Sign in successful.',
      token: data.session.access_token,
      user: mapAuthUser(data.user, profile)
    });
  } catch (err: any) {
    console.error('[auth][login]', err);
    return res.status(500).json({ error: err.message || 'Login error' });
  }
});

// Current User Profile
// requireAuth verifies the bearer token against Supabase Auth when configured.
authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await loadProfile(req.user!.id);
    if (!profile) return res.status(404).json({ error: 'User profile not found.' });

    return res.json({
      user: mapAuthUser({ id: req.user!.id, email: req.user!.email, user_metadata: { name: req.user!.name } }, profile)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to load profile.' });
  }
});

// Update profile/address data. Email, role, and password are intentionally not
// writable through this endpoint.
authRouter.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, savedAddresses } = req.body;
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Name cannot be empty.' });
      updates.name = name.trim();
    }
    if (phone !== undefined) {
      if (typeof phone !== 'string' || !phone.trim()) return res.status(400).json({ error: 'Phone cannot be empty.' });
      updates.phone = phone.trim();
    }
    if (savedAddresses !== undefined) {
      if (!Array.isArray(savedAddresses)) return res.status(400).json({ error: 'Saved addresses must be an array.' });
      updates.saved_addresses = savedAddresses;
    }

    const { data: updated, error } = await serverSupabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user!.id)
      .select('id,name,email,phone,role,saved_addresses,created_at,updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!updated) return res.status(404).json({ error: 'User profile not found.' });

    return res.json({
      message: 'Profile updated.',
      user: mapAuthUser({ id: req.user!.id, email: req.user!.email }, updated)
    });
  } catch (err: any) {
    console.error('[auth][profile]', err);
    return res.status(500).json({ error: err.message || 'Profile update error' });
  }
});
