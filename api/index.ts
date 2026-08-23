import type { Request, Response } from 'express';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { app } = require('../dist/server.cjs');

export default function handler(req: Request, res: Response) {
  try {
    return app(req, res);
  } catch (error: any) {
    console.error('[vercel][api-handler]', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error?.message || 'Internal API server error.'
      });
    }
  }
}
