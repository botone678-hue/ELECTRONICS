import { Router } from 'express';
import { isServerSupabaseConfigured } from '../supabase';

export const eventRouter = Router();

// Legacy SSE realtime is intentionally disabled. Production realtime is handled
// by Supabase Postgres Changes so row visibility is controlled by Auth/RLS.
eventRouter.get('/events', (_req, res) => {
  if (isServerSupabaseConfigured) {
    return res.status(410).json({
      error: 'Legacy realtime endpoint disabled',
      realtime: 'supabase-postgres-changes'
    });
  }

  return res.status(503).json({
    error: 'Realtime unavailable: Supabase is not configured'
  });
});
