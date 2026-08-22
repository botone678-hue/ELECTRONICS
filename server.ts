import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './server/routes/authRoutes';
import { productRouter } from './server/routes/productRoutes';
import { orderRouter } from './server/routes/orderRoutes';
import { adminRouter } from './server/routes/adminRoutes';
import { eventRouter } from './server/routes/eventRoutes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic Middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request Logging
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api') && req.path !== '/api/events') {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      store: 'MEGA CITY ELECTRONICS',
      location: 'Along Zion Mall, Kenya',
      phone: '0741775878',
      time: new Date().toISOString()
    });
  });

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api', productRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', eventRouter);

  // Vite middleware for development or Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 404 handler for unmatched API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MEGA CITY ELECTRONICS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
