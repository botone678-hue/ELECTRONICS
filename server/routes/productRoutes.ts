import { Router, Response } from 'express';
import { serverSupabase, isServerSupabaseConfigured } from '../supabase';
import { requireAuth, AuthRequest } from '../auth';

export const productRouter = Router();

function requireCatalogDatabase(res: Response): boolean {
  if (isServerSupabaseConfigured) return true;
  res.status(503).json({ error: 'Catalog database is not configured.' });
  return false;
}

function mapCategory(row: any) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    image: row.image_url || '',
    icon: row.icon || '',
    subcategories: row.subcategories || [],
    createdAt: row.created_at,
  };
}

function mapProduct(row: any) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    brand: row.brand,
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    subcategory: row.subcategory || '',
    description: row.description || '',
    price: Number(row.price || 0),
    compareAtPrice: row.compare_at_price == null ? undefined : Number(row.compare_at_price),
    discountPercent: row.discount_percent == null ? undefined : Number(row.discount_percent),
    stockQuantity: Number(row.stock_quantity || 0),
    lowStockThreshold: Number(row.low_stock_threshold || 0),
    warranty: row.warranty || '',
    featured: Boolean(row.featured),
    isHotDeal: Boolean(row.hot_deal),
    isNew: Boolean(row.is_new),
    isActive: Boolean(row.is_active),
    images: Array.isArray(row.images) ? row.images : [],
    specifications: row.specifications || {},
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

productRouter.get('/categories', async (_req, res) => {
  if (!requireCatalogDatabase(res)) return;
  try {
    const { data, error } = await serverSupabase.from('categories').select('*').order('name', { ascending: true });
    if (error) throw error;
    res.json({ categories: (data || []).map(mapCategory) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching categories.' });
  }
});

productRouter.get('/categories/:slug', async (req, res) => {
  if (!requireCatalogDatabase(res)) return;
  try {
    const { data, error } = await serverSupabase.from('categories').select('*').eq('slug', req.params.slug).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Category not found.' });
    res.json({ category: mapCategory(data) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching category.' });
  }
});

productRouter.get('/products', async (req, res) => {
  if (!requireCatalogDatabase(res)) return;
  try {
    const { categoryId, subcategory, brand, minPrice, maxPrice, featured, isHotDeal, inStockOnly, search, sort, limit, offset } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit || 100), 1), 100);
    const safeOffset = Math.max(Number(offset || 0), 0);

    let query = serverSupabase.from('products').select('*', { count: 'exact' }).eq('is_active', true);
    if (categoryId) query = query.eq('category_id', String(categoryId));
    if (subcategory) query = query.ilike('subcategory', String(subcategory));
    if (brand) query = query.ilike('brand', String(brand));
    if (minPrice) query = query.gte('price', Number(minPrice));
    if (maxPrice) query = query.lte('price', Number(maxPrice));
    if (featured === 'true') query = query.eq('featured', true);
    if (isHotDeal === 'true') query = query.eq('hot_deal', true);
    if (inStockOnly === 'true') query = query.gt('stock_quantity', 0);
    if (search) {
      const q = String(search).trim();
      if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,sku.ilike.%${q}%,description.ilike.%${q}%`);
    }

    if (sort === 'price-asc') query = query.order('price', { ascending: true });
    else if (sort === 'price-desc') query = query.order('price', { ascending: false });
    else if (sort === 'rating') query = query.order('rating', { ascending: false });
    else if (sort === 'newest') query = query.order('created_at', { ascending: false });
    else query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });

    const { data, error, count } = await query.range(safeOffset, safeOffset + safeLimit - 1);
    if (error) throw error;
    res.json({ products: (data || []).map(mapProduct), total: count || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching products.' });
  }
});

productRouter.get('/products/:identifier', async (req, res) => {
  if (!requireCatalogDatabase(res)) return;
  try {
    const { identifier } = req.params;
    const { data: bySlug, error: slugError } = await serverSupabase.from('products').select('*').eq('slug', identifier).maybeSingle();
    if (slugError) throw slugError;
    let productRow = bySlug;
    if (!productRow) {
      const { data: byId, error: idError } = await serverSupabase.from('products').select('*').eq('id', identifier).maybeSingle();
      if (idError) throw idError;
      productRow = byId;
    }
    if (!productRow || !productRow.is_active) return res.status(404).json({ error: 'Product not found.' });

    const product = mapProduct(productRow);
    const { data: relatedRows, error: relatedError } = await serverSupabase
      .from('products').select('*').eq('is_active', true).eq('category_id', productRow.category_id).neq('id', productRow.id).limit(6);
    if (relatedError) throw relatedError;
    const related = (relatedRows || []).map(mapProduct);

    const { data: reviews, error: reviewError } = await serverSupabase.from('reviews').select('*').eq('product_id', productRow.id).order('created_at', { ascending: false });
    if (reviewError) throw reviewError;

    res.json({ product, related, reviews: reviews || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching product.' });
  }
});

// Only authenticated customers with a delivered purchase of this exact product may review it.
// The server derives customer identity from the verified session and never trusts customer_id,
// customer_name, or verified_purchase from the request body.
productRouter.post('/products/:id/reviews', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!requireCatalogDatabase(res)) return;
  try {
    const productId = req.params.id.trim();
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';

    if (!productId) return res.status(400).json({ error: 'Product is required.' });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer from 1 to 5.' });
    }
    if (comment.length > 2000) return res.status(400).json({ error: 'Review comment is too long.' });

    const customerId = req.user!.id;
    const { data: product, error: productError } = await serverSupabase
      .from('products')
      .select('id,is_active')
      .eq('id', productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product || !product.is_active) return res.status(404).json({ error: 'Product not found.' });

    const { data: deliveredOrders, error: ordersError } = await serverSupabase
      .from('orders')
      .select('id')
      .eq('customer_id', customerId)
      .eq('status', 'DELIVERED')
      .limit(100);
    if (ordersError) throw ordersError;
    const orderIds = (deliveredOrders || []).map((order: any) => order.id);
    if (orderIds.length === 0) {
      return res.status(403).json({ error: 'You can review this product only after a delivered purchase.' });
    }

    const { data: purchasedItem, error: itemError } = await serverSupabase
      .from('order_items')
      .select('id')
      .in('order_id', orderIds)
      .eq('product_id', productId)
      .limit(1)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!purchasedItem) {
      return res.status(403).json({ error: 'You can review this product only after a delivered purchase.' });
    }

    const { data: existingReview, error: existingError } = await serverSupabase
      .from('reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('customer_id', customerId)
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingReview) return res.status(409).json({ error: 'You have already reviewed this product.' });

    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .select('name')
      .eq('id', customerId)
      .maybeSingle();
    if (profileError) throw profileError;

    const { data: review, error: insertError } = await serverSupabase
      .from('reviews')
      .insert({
        product_id: productId,
        customer_id: customerId,
        customer_name: profile?.name || req.user!.name || 'Customer',
        rating,
        comment,
        verified_purchase: true,
      })
      .select('*')
      .single();
    if (insertError) throw insertError;

    res.status(201).json({ message: 'Review submitted successfully.', review });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error submitting review.' });
  }
});

productRouter.get('/delivery-zones', async (_req, res) => {
  if (!requireCatalogDatabase(res)) return;
  try {
    const { data, error } = await serverSupabase.from('delivery_zones').select('*').eq('active', true).order('name', { ascending: true });
    if (error) throw error;
    res.json({ zones: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching delivery zones.' });
  }
});

productRouter.get('/settings', async (_req, res) => {
  if (!requireCatalogDatabase(res)) return;
  try {
    const { data, error } = await serverSupabase.from('business_settings').select('*').eq('id', 'default').maybeSingle();
    if (error) throw error;
    res.json({ settings: data || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching settings.' });
  }
});
