import type { Request, Response } from 'express';
import app from '../server';

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
