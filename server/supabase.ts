import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const clientKey = serviceRoleKey || anonKey;

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl &&
  clientKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

// Server-side client. Uses the service role when available for trusted backend
// operations; otherwise falls back to the anon key for read-only/local setups.
export const serverSupabase: SupabaseClient = createClient(
  isServerSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isServerSupabaseConfigured ? clientKey : 'placeholder-server-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Dedicated auth client. Never use the service-role key for end-user password
// sign-in; this client uses the public anon key and never persists a session.
export const authSupabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  anonKey || clientKey || 'placeholder-auth-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export const hasServiceRole = Boolean(supabaseUrl && serviceRoleKey);
