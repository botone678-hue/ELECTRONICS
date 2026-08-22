import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { generateToken, requireAuth, sanitizeUser, AuthRequest } from '../auth';

export const authRouter = Router();

// Customer Register
authRouter.post('/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields (name, email, phone, password) are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = db.createUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      role: 'customer',
      passwordHash,
      savedAddresses: []
    });

    const token = generateToken(newUser);
    return res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: sanitizeUser(newUser)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal registration error' });
  }
});

// Customer & Admin Sign In
authRouter.post('/login', (req, res) => {
  try {
    const { email, password, requireRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (requireRole && user.role !== requireRole) {
      return res.status(403).json({ error: `Access denied. ${requireRole} privileges required.` });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Sign in successful.',
      token,
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login error' });
  }
});

// Current User Profile
authRouter.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = db.getUserById(req.user!.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json({ user: sanitizeUser(user) });
});

// Update Profile / Address
authRouter.put('/profile', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, savedAddresses } = req.body;
    const updated = db.updateUser(req.user!.id, {
      ...(name ? { name: name.trim() } : {}),
      ...(phone ? { phone: phone.trim() } : {}),
      ...(savedAddresses ? { savedAddresses } : {})
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ message: 'Profile updated.', user: sanitizeUser(updated) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Profile update error' });
  }
});
