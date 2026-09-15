import { Router, Response } from 'express';
import { serverSupabase, isServerSupabaseConfigured } from '../supabase';
import { optionalAuth, AuthRequest } from '../auth';

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
    image: row.image || row.image_url || '',
    createdAt: row.created_at,
  };
}

function mapProduct(row: any, images: any[] = []) {
  const imageUrls = images
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((image) => image.image_url || image.url)
    .filter(Boolean);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    brand: row.brand,
    categoryId: row.category_id,
    categoryName: row.category_name || row.category?.name || '',
    subcategory: row.subcategory || '',
    description: row.description || '',
    price: Number(row.price || 0),
    compareAtPrice: row.compare_at_price == null ? undefined : Number(row.compare_at_price),
    discountPercent: row.discount_percent == null ? undefined : Number(row.discount_percent),
    stockQuantity: Number(row.stock_quantity || 0),
    lowStockThreshold: Number(row.low_stock_threshold || 0),
    warranty: row.warranty || '',
    featured: Boolean(row.featured),
    isHotDeal: Boolean(row.is_hot_deal),
    isNew: Boolean(row.is_new),
    isActive: Boolean(row.is_active),
    images: imageUrls,
    specifications: row.specifications || {},
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadProductImages(productIds: string[]) {
  if (!productIds.length) return new Map<string, any[]>();
  const { data, error } = await serverSupabase
    .from('product_images')
    .select('*')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true });
  if (error) throw error;

  const grouped = new Map<string, any[]>();
  for (const image of data || []) {
    const list = grouped.get(image.product_id) || [];
    list.push(image);
    grouped.set(image.product_id, list);
  }
  return grouped;
}

// Get Categories — production source is Supabase, never process-local seed data.
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
    if (isHotDeal === 'true') query = query.eq('is_hot_deal', true);
    if (inStockOnly === 'true') query = query.gt('stock_quantity', 0);
    if (search) {
      const q = String(search).trim().replace(/,/g, ' ');
      if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,sku.ilike.%${q}%,description.ilike.%${q}%`);
    }

    if (sort === 'price-asc') query = query.order('price', { ascending: true });
    else if (sort === 'price-desc') query = query.order('price', { ascending: false });
    else if (sort === 'rating') query = query.order('rating', { ascending: false });
    else if (sort === 'newest') query = query.order('created_at', { ascending: false });
    else query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });

    const { data, error, count } = await query.range(safeOffset, safeOffset + safeLimit - 1);
    if (error) throw error;
    const rows = data || [];
    const imageMap = await loadProductImages(rows.map((p: any) => p.id));
    const products = rows.map((row: any) => mapProduct(row, imageMap.get(row.id) || []));
    res.json({ products, total: count || 0 });
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

    const imageMap = await loadProductImages([productRow.id]);
    const product = mapProduct(productRow, imageMap.get(productRow.id) || []);

    const { data: relatedRows, error: relatedError } = await serverSupabase
      .from('products').select('*').eq('is_active', true).eq('category_id', productRow.category_id).neq('id', productRow.id).limit(6);
    if (relatedError) throw relatedError;
    const relatedMap = await loadProductImages((relatedRows || []).map((p: any) => p.id));
    const related = (relatedRows || []).map((p: any) => mapProduct(p, relatedMap.get(p.id) || []));

    const { data: reviews, error: reviewError } = await serverSupabase.from('reviews').select('*').eq('product_id', productRow.id).eq('is_approved', true).order('created_at', { ascending: false });
    if (reviewError) throw reviewError;

    res.json({ product, related, reviews: reviews || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching product.' });
  }
});

// Review creation remains behind the authenticated Supabase identity. Review persistence is migrated separately.
productRouter.post('/products/:id/reviews', optionalAuth, (req: AuthRequest, res: Response) => {
  return res.status(503).json({ error: 'Review submission is temporarily unavailable while the production review service is being migrated.' });
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
    const { data, error } = await serverSupabase.from('business_settings').select('*');
    if (error) throw error;
    const settings = (data || []).reduce((acc: Record<string, any>, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching settings.' });
  }
});
