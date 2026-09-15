import { Router } from 'express';
import { registerEventClient } from '../db';
import { isServerSupabaseConfigured } from '../supabase';

export const eventRouter = Router();

eventRouter.get('/events', (req, res) => {
  // Production uses Supabase Realtime. Do not expose the legacy process-local
  // event bus, which is unauthenticated and can broadcast sensitive order data.
  if (isServerSupabaseConfigured) {
    return res.status(503).json({ error: 'Legacy event stream is disabled when Supabase Realtime is configured.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ event: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const unregister = registerEventClient((msg) => {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregister();
    res.end();
  });
});
