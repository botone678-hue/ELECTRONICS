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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('megacity_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Session
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      // 1. If Supabase is configured, use Supabase Auth session
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            setToken(session.access_token);
            localStorage.setItem('megacity_token', session.access_token);

            // Fetch profile for role & saved addresses
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const appUser: User = {
              id: session.user.id,
              name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              phone: profile?.phone || session.user.user_metadata?.phone || '',
              role: (profile?.role as UserRole) || (session.user.user_metadata?.role as UserRole) || 'customer',
              createdAt: profile?.created_at || session.user.created_at,
              savedAddresses: profile?.saved_addresses || []
            };

            setUser(appUser);
          }
        } catch (err) {
          console.error('Supabase session initialization error:', err);
        } finally {
          if (isMounted) setIsLoading(false);
        }

        // Listen for Supabase auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            setToken(session.access_token);
            localStorage.setItem('megacity_token', session.access_token);

            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            setUser({
              id: session.user.id,
              name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              phone: profile?.phone || session.user.user_metadata?.phone || '',
              role: (profile?.role as UserRole) || (session.user.user_metadata?.role as UserRole) || 'customer',
              createdAt: profile?.created_at || session.user.created_at,
              savedAddresses: profile?.saved_addresses || []
            });
          } else {
            setToken(null);
            setUser(null);
            localStorage.removeItem('megacity_token');
          }
        });

        return () => {
          isMounted = false;
          subscription.unsubscribe();
        };
      }

      // 2. Server API fallback for local container development
      if (token) {
        try {
          const { user } = await api.getMe();
          if (isMounted) setUser(user);
        } catch {
          if (isMounted) {
            localStorage.removeItem('megacity_token');
            setToken(null);
            setUser(null);
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (email: string, password: string, requireRole?: string): Promise<User> => {
    // 1. Supabase Auth Login
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        throw new Error(error.message || 'Invalid email or password.');
      }

      if (!data.user || !data.session) {
        throw new Error('Sign in failed. Could not obtain user session.');
      }

      // Check role in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const userRole = (profile?.role as UserRole) || (data.user.user_metadata?.role as UserRole) || 'customer';

      if (requireRole && userRole !== requireRole) {
        await supabase.auth.signOut();
        throw new Error(`Access denied. ${requireRole.toUpperCase()} authorization required.`);
      }

      const loggedUser: User = {
        id: data.user.id,
        name: profile?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
        email: data.user.email || '',
        phone: profile?.phone || data.user.user_metadata?.phone || '',
        role: userRole,
        createdAt: profile?.created_at || data.user.created_at,
        savedAddresses: profile?.saved_addresses || []
      };

      setToken(data.session.access_token);
      localStorage.setItem('megacity_token', data.session.access_token);
      setUser(loggedUser);
      return loggedUser;
    }

    // 2. API Fallback Login
    const res = await api.login({ email: email.trim(), password, requireRole });
    localStorage.setItem('megacity_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (name: string, email: string, phone: string, password: string): Promise<User> => {
    // 1. Supabase Auth Register
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim(),
            role: 'customer'
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Registration failed.');
      }

      if (!data.user) {
        throw new Error('Registration failed.');
      }

      // Insert profile record if trigger didn't handle
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        role: 'customer',
        saved_addresses: []
      });

      const newUser: User = {
        id: data.user.id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        role: 'customer',
        createdAt: new Date().toISOString(),
        savedAddresses: []
      };

      if (data.session) {
        setToken(data.session.access_token);
        localStorage.setItem('megacity_token', data.session.access_token);
        setUser(newUser);
      }

      return newUser;
    }

    // 2. API Fallback Register
    const res = await api.register({ name, email, phone, password });
    localStorage.setItem('megacity_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    localStorage.removeItem('megacity_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    if (isSupabaseConfigured && user) {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.phone ? { phone: updates.phone } : {}),
          ...(updates.savedAddresses ? { saved_addresses: updates.savedAddresses } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw new Error(error.message || 'Failed to update profile.');
      }

      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      return updatedUser;
    }

    const res = await api.updateProfile(updates);
    setUser(res.user);
    return res.user;
  };

  const resetPassword = async (email: string): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      if (error) {
        throw new Error(error.message || 'Could not send password reset email.');
      }
    } else {
      throw new Error('Password reset is managed securely via Supabase Auth.');
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        login,
        register,
        logout,
        updateProfile,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
