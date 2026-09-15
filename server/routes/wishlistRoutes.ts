import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../auth';
import { serverSupabase, isServerSupabaseConfigured, hasServiceRole } from '../supabase';

export const wishlistRouter = Router();

wishlistRouter.use(requireAuth);

function unavailable(res: Response) {
  return res.status(503).json({ error: 'Wishlist service is not configured.' });
}

wishlistRouter.get('/wishlist', async (req: AuthRequest, res: Response) => {
  if (!isServerSupabaseConfigured || !hasServiceRole) return unavailable(res);

  const { data, error } = await serverSupabase
    .from('wishlists')
    .select('product_id')
    .eq('customer_id', req.user!.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[wishlist][list]', error);
    return res.status(500).json({ error: 'Unable to load wishlist.' });
  }

  return res.json({ wishlistIds: (data || []).map((row) => row.product_id) });
});

wishlistRouter.post('/wishlist/:productId', async (req: AuthRequest, res: Response) => {
  if (!isServerSupabaseConfigured || !hasServiceRole) return unavailable(res);

  const productId = String(req.params.productId || '').trim();
  if (!productId) return res.status(400).json({ error: 'Product ID is required.' });

  const { data: product, error: productError } = await serverSupabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('is_active', true)
    .maybeSingle();

  if (productError) {
    console.error('[wishlist][product-check]', productError);
    return res.status(500).json({ error: 'Unable to validate product.' });
  }
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const { error } = await serverSupabase
    .from('wishlists')
    .upsert(
      { customer_id: req.user!.id, product_id: productId },
      { onConflict: 'customer_id,product_id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('[wishlist][add]', error);
    return res.status(500).json({ error: 'Unable to save wishlist item.' });
  }

  return res.status(201).json({ productId });
});

wishlistRouter.delete('/wishlist/:productId', async (req: AuthRequest, res: Response) => {
  if (!isServerSupabaseConfigured || !hasServiceRole) return unavailable(res);

  const productId = String(req.params.productId || '').trim();
  if (!productId) return res.status(400).json({ error: 'Product ID is required.' });

  const { error } = await serverSupabase
    .from('wishlists')
    .delete()
    .eq('customer_id', req.user!.id)
    .eq('product_id', productId);

  if (error) {
    console.error('[wishlist][remove]', error);
    return res.status(500).json({ error: 'Unable to remove wishlist item.' });
  }

  return res.json({ productId });
});
