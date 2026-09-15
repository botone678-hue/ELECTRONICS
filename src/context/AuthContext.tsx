import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, requireRole?: string) => Promise<User>;
  register: (name: string, email: string, phone: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(authUser: any, profile: any): User {
  if (!profile || (profile.role !== 'customer' && profile.role !== 'admin')) {
    throw new Error('Your account profile could not be verified. Please contact support.');
  }
  return {
    id: authUser.id,
    name: profile.name || authUser.email?.split('@')[0] || 'User',
    email: authUser.email || '',
    phone: profile.phone || '',
    role: profile.role as UserRole,
    createdAt: profile.created_at || authUser.created_at,
    savedAddresses: profile.saved_addresses || []
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('megacity_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            if (profileError || !profile) {
              await supabase.auth.signOut();
              if (isMounted) { setToken(null); setUser(null); localStorage.removeItem('megacity_token'); }
            } else {
              const appUser = mapSupabaseUser(session.user, profile);
              setToken(session.access_token);
              localStorage.setItem('megacity_token', session.access_token);
              setUser(appUser);
            }
          }
        } catch (err) {
          console.error('Supabase session initialization error:', err);
          if (isMounted) { setToken(null); setUser(null); localStorage.removeItem('megacity_token'); }
        } finally { if (isMounted) setIsLoading(false); }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!session?.user) { setToken(null); setUser(null); localStorage.removeItem('megacity_token'); return; }
          const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (profileError || !profile || (profile.role !== 'customer' && profile.role !== 'admin')) {
            await supabase.auth.signOut(); setToken(null); setUser(null); localStorage.removeItem('megacity_token'); return;
          }
          setToken(session.access_token); localStorage.setItem('megacity_token', session.access_token); setUser(mapSupabaseUser(session.user, profile));
        });
        return () => { isMounted = false; subscription.unsubscribe(); };
      }
      if (token) {
        try { const { user } = await api.getMe(); if (isMounted) setUser(user); }
        catch { if (isMounted) { localStorage.removeItem('megacity_token'); setToken(null); setUser(null); } }
        finally { if (isMounted) setIsLoading(false); }
      } else if (isMounted) setIsLoading(false);
    }
    initAuth();
    return () => { isMounted = false; };
  }, [token]);

  const login = async (email: string, password: string, requireRole?: string): Promise<User> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message || 'Invalid email or password.');
      if (!data.user || !data.session) throw new Error('Sign in failed. Could not obtain user session.');
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      if (profileError || !profile) { await supabase.auth.signOut(); throw new Error('Your account profile could not be verified. Please contact support.'); }
      const loggedUser = mapSupabaseUser(data.user, profile);
      if (requireRole && loggedUser.role !== requireRole) { await supabase.auth.signOut(); throw new Error(`Access denied. ${requireRole.toUpperCase()} authorization required.`); }
      setToken(data.session.access_token); localStorage.setItem('megacity_token', data.session.access_token); setUser(loggedUser); return loggedUser;
    }
    const res = await api.login({ email: email.trim(), password, requireRole });
    localStorage.setItem('megacity_token', res.token); setToken(res.token); setUser(res.user); return res.user;
  };

  const register = async (name: string, email: string, phone: string, password: string): Promise<User> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim(), phone: phone.trim() } } });
      if (error) throw new Error(error.message || 'Registration failed.');
      if (!data.user) throw new Error('Registration failed.');
      const { error: profileError } = await supabase.from('profiles').upsert({ id: data.user.id, name: name.trim(), email: email.toLowerCase().trim(), phone: phone.trim(), role: 'customer', saved_addresses: [] });
      if (profileError) { if (data.session) await supabase.auth.signOut(); throw new Error(profileError.message || 'Could not create your customer profile.'); }
      const { data: profile, error: readError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (readError || !profile) throw new Error('Customer profile could not be verified after registration.');
      const newUser = mapSupabaseUser(data.user, profile);
      if (data.session) { setToken(data.session.access_token); localStorage.setItem('megacity_token', data.session.access_token); setUser(newUser); }
      return newUser;
    }
    const res = await api.register({ name, email, phone, password });
    localStorage.setItem('megacity_token', res.token); setToken(res.token); setUser(res.user); return res.user;
  };

  const logout = async (): Promise<void> => {
    if (isSupabaseConfigured) { try { await supabase.auth.signOut(); } catch (err) { console.warn('Supabase signOut error:', err); } }
    localStorage.removeItem('megacity_token'); setToken(null); setUser(null);
  };

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    if (isSupabaseConfigured && user) {
      const { data: updatedProfile, error } = await supabase.from('profiles').update({ ...(updates.name ? { name: updates.name } : {}), ...(updates.phone ? { phone: updates.phone } : {}), ...(updates.savedAddresses ? { saved_addresses: updates.savedAddresses } : {}), updated_at: new Date().toISOString() }).eq('id', user.id).select('*').single();
      if (error || !updatedProfile) throw new Error(error?.message || 'Failed to update profile.');
      const updatedUser = mapSupabaseUser({ id: user.id, email: user.email, created_at: user.createdAt }, updatedProfile);
      setUser(updatedUser); return updatedUser;
    }
    const res = await api.updateProfile(updates); setUser(res.user); return res.user;
  };

  const resetPassword = async (email: string): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (error) throw new Error(error.message || 'Could not send password reset email.');
    } else throw new Error('Password reset is managed securely via Supabase Auth.');
  };

  const isAdmin = user?.role === 'admin';
  return <AuthContext.Provider value={{ user, token, isLoading, isAdmin, login, register, logout, updateProfile, resetPassword }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
