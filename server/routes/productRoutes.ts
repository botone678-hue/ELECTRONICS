import { Router, Response } from 'express';
import { serverSupabase, isServerSupabaseConfigured } from '../supabase';
import { optionalAuth, AuthRequest } from '../auth';

export const productRouter = Router();

function requireCatalogDatabase(res: Response): boolean {
  if (isServerSupabaseConfigured) return true;
  res.status(503).json({ error: 'Catalog database is not configured.', code: 'CATALOG_NOT_CONFIGURED' });
  return false;
}

function logCatalogError(operation: string, err: any) {
  console.error(`[CATALOG] ${operation} failed`, {
    message: err?.message || 'Unknown database error',
    code: err?.code || null,
    details: err?.details || null,
    hint: err?.hint || null,
    status: err?.status || null,
  });
}

function mapCategory(row: any) {
  return { id: row.id, name: row.name, slug: row.slug, description: row.description || '', image: row.image_url || '', icon: row.icon || '', subcategories: row.subcategories || [], createdAt: row.created_at };
}

function mapProduct(row: any) {
  return {
    id: row.id, name: row.name, slug: row.slug, sku: row.sku, brand: row.brand, categoryId: row.category_id,
    categoryName: row.category_name || '', subcategory: row.subcategory || '', description: row.description || '',
    price: Number(row.price || 0), compareAtPrice: row.compare_at_price == null ? undefined : Number(row.compare_at_price),
    discountPercent: row.discount_percent == null ? undefined : Number(row.discount_percent), stockQuantity: Number(row.stock_quantity || 0),
    lowStockThreshold: Number(row.low_stock_threshold || 0), warranty: row.warranty || '', featured: Boolean(row.featured),
    isHotDeal: Boolean(row.hot_deal), isNew: Boolean(row.is_new), isActive: Boolean(row.is_active),
    images: Array.isArray(row.images) ? row.images : [], specifications: row.specifications || {}, rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0), createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

productRouter.get('/categories', async (_req, res) => {
  if (!requireCatalogDatabase(res)) return;
  try {
    const { data, error } = await serverSupabase.from('categories').select('*').order('name', { ascending: true });
    if (error) throw error;
    res.json({ categories: (data || []).map(mapCategory) });
  } catch (err: any) {
    logCatalogError('GET /categories', err);
    res.status(503).json({ error: 'Catalog service unavailable.', code: 'CATALOG_DATABASE_ERROR' });
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
    logCatalogError('GET /categories/:slug', err);
    res.status(503).json({ error: 'Catalog service unavailable.', code: 'CATALOG_DATABASE_ERROR' });
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
    logCatalogError('GET /products', err);
    res.status(503).json({ error: 'Catalog service unavailable.', code: 'CATALOG_DATABASE_ERROR' });
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
    const { data: relatedRows, error: relatedError } = await serverSupabase.from('products').select('*').eq('is_active', true).eq('category_id', productRow.category_id).neq('id', productRow.id).limit(6);
    if (relatedError) throw relatedError;
    const related = (relatedRows || []).map(mapProduct);
    const { data: reviews, error: reviewError } = await serverSupabase.from('reviews').select('*').eq('product_id', productRow.id).order('created_at', { ascending: false });
    if (reviewError) throw reviewError;
    res.json({ product, related, reviews: reviews || [] });
  } catch (err: any) {
    logCatalogError('GET /products/:identifier', err);
    res.status(503).json({ error: 'Catalog service unavailable.', code: 'CATALOG_DATABASE_ERROR' });
  }
});

productRouter.post('/products/:id/reviews', optionalAuth, (_req: AuthRequest, res: Response) => {
  res.status(503).json({ error: 'Review submission is temporarily unavailable while the production review service is being migrated.' });
});

productRouter.get('/delivery-zones', async (_req, res) => {
  if (!requireCatalogDatabase(res)) return;
  try {
    const { data, error } = await serverSupabase.from('delivery_zones').select('*').eq('active', true).order('name', { ascending: true });
    if (error) throw error;
    res.json({ zones: data || [] });
  } catch (err: any) {
    logCatalogError('GET /delivery-zones', err);
    res.status(503).json({ error: 'Catalog service unavailable.', code: 'CATALOG_DATABASE_ERROR' });
  }
});

productRouter.get('/settings', async (_req, res) => {
  if (!requireCatalogDatabase(res)) return;
  try {
    const { data, error } = await serverSupabase.from('business_settings').select('*').eq('id', 'default').maybeSingle();
    if (error) throw error;
    res.json({ settings: data || null });
  } catch (err: any) {
    logCatalogError('GET /settings', err);
    res.status(503).json({ error: 'Catalog service unavailable.', code: 'CATALOG_DATABASE_ERROR' });
  }
});
