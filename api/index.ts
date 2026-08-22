import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      res.once('finish', finish);
      res.once('close', finish);

      try {
        const result = app(req, res);
        if (result && typeof (result as any).catch === 'function') {
          (result as Promise<unknown>).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  } catch (error: any) {
    console.error('[vercel][api-handler]', error);
    if (!res.headersSent) {
      res.status(500).setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        error: error?.message || 'Internal API server error.'
      }));
    }
  }
}
