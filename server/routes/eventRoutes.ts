import { Router } from 'express';
import { registerSSEClient } from '../db';

export const eventRouter = Router();

eventRouter.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ event: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const unregister = registerSSEClient((msg) => {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  });

  // Keep-alive heartbeat every 25 seconds
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregister();
    res.end();
  });
});
