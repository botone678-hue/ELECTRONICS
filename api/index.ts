import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return app(req, res);
  } catch (error: any) {
    console.error('[vercel][api-handler]', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error?.message || 'Internal API server error.'
      });
    }
  }
}
