import { Router, Response } from 'express';
import { db } from '../db';
import { serverSupabase, isServerSupabaseConfigured } from '../supabase';
import { requireAuth, AuthRequest } from '../auth';

export const productRouter = Router();

const mapProduct = (row: any) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  sku: row.sku,
  brand: row.brand,
  categoryId: row.category_id,
  categoryName: row.category_name,
  subcategory: row.subcategory,
  description: row.description,
  price: Number(row.price),
  compareAtPrice: row.compare_at_price == null ? undefined : Number(row.compare_at_price),
  discountPercent: row.discount_percent == null ? undefined : Number(row.discount_percent),
  stockQuantity: Number(row.stock_quantity),
  lowStockThreshold: Number(row.low_stock_threshold),
  warranty: row.warranty,
  featured: Boolean(row.featured),
  isHotDeal: Boolean(row.hot_deal),
  isNew: Boolean(row.is_new),
  isActive: Boolean(row.is_active),
  images: Array.isArray(row.images) ? row.images : [],
  specifications: row.specifications || {},
  rating: Number(row.rating),
  reviewCount: Number(row.review_count),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapCategory = (row: any) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description || '',
  icon: row.icon || '',
  imageUrl: row.image_url || '',
  subcategories: Array.isArray(row.subcategories) ? row.subcategories : []
});

const mapZone = (row: any) => ({
  id: row.id,
  name: row.name,
  fee: Number(row.fee),
  estimatedTime: row.estimated_time,
  minimumOrder: Number(row.minimum_order),
  freeThreshold: row.free_threshold == null ? undefined : Number(row.free_threshold),
  active: Boolean(row.active)
});

const mapReview = (row: any) => ({
  id: row.id,
  productId: row.product_id,
  customerId: row.customer_id || undefined,
  customerName: row.customer_name,
  rating: Number(row.rating),
  comment: row.comment,
  verifiedPurchase: Boolean(row.verified_purchase),
  createdAt: row.created_at
});

// Categories
productRouter.get('/categories', async (_req, res) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase.from('categories').select('*').order('name');
      if (error) throw error;
      return res.json({ categories: (data || []).map(mapCategory) });
    }
    return res.json({ categories: db.getCategories() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching categories' });
  }
});

productRouter.get('/categories/:slug', async (req, res) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase.from('categories').select('*').eq('slug', req.params.slug).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Category not found.' });
      return res.json({ category: mapCategory(data) });
    }
    const cat = db.getCategoryBySlug(req.params.slug);
    if (!cat) return res.status(404).json({ error: 'Category not found.' });
    return res.json({ category: cat });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching category' });
  }
});

// List products. Supabase is authoritative in production; the in-memory database is retained only as a local fallback.
productRouter.get('/products', async (req, res) => {
  try {
    if (!isServerSupabaseConfigured) {
      const { categoryId, subcategory, brand, minPrice, maxPrice, featured, isHotDeal, inStockOnly, search, sort, limit, offset } = req.query;
      return res.json(db.getProducts({
        categoryId: categoryId as string,
        subcategory: subcategory as string,
        brand: brand as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        featured: featured === 'true' ? true : undefined,
        isHotDeal: isHotDeal === 'true' ? true : undefined,
        inStockOnly: inStockOnly === 'true' ? true : undefined,
        search: search as string,
        sort: sort as any,
        limit: limit ? Number(limit) : 100,
        offset: offset ? Number(offset) : 0
      }));
    }

    const { categoryId, subcategory, brand, minPrice, maxPrice, featured, isHotDeal, inStockOnly, search, sort, limit, offset } = req.query;
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
      const q = String(search).replace(/[%_]/g, '');
      if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,sku.ilike.%${q}%,category_name.ilike.%${q}%,subcategory.ilike.%${q}%`);
    }

    switch (sort) {
      case 'price-asc': query = query.order('price', { ascending: true }); break;
      case 'price-desc': query = query.order('price', { ascending: false }); break;
      case 'newest': query = query.order('created_at', { ascending: false }); break;
      case 'rating': query = query.order('rating', { ascending: false }); break;
      default: query = query.order('featured', { ascending: false }).order('hot_deal', { ascending: false }).order('created_at', { ascending: false });
    }

    const safeLimit = Math.min(Math.max(Number(limit || 100), 1), 100);
    const safeOffset = Math.max(Number(offset || 0), 0);
    query = query.range(safeOffset, safeOffset + safeLimit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return res.json({ products: (data || []).map(mapProduct), total: count || 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching products' });
  }
});

// Get single product by slug or ID, with related products and reviews.
productRouter.get('/products/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    if (!isServerSupabaseConfigured) {
      let product = db.getProductBySlug(identifier) || db.getProductById(identifier);
      if (!product) return res.status(404).json({ error: 'Product not found.' });
      const related = db.getProducts({ categoryId: product.categoryId, limit: 6 }).products.filter((p) => p.id !== product!.id);
      return res.json({ product, related, reviews: db.getReviews(product.id) });
    }

    let productQuery = serverSupabase.from('products').select('*').eq('is_active', true);
    productQuery = identifier.includes('-') ? productQuery.or(`id.eq.${identifier},slug.eq.${identifier}`) : productQuery.eq('id', identifier);
    const { data: productRow, error: productError } = await productQuery.maybeSingle();
    if (productError) throw productError;
    if (!productRow) return res.status(404).json({ error: 'Product not found.' });

    const product = mapProduct(productRow);
    const [{ data: relatedRows, error: relatedError }, { data: reviewRows, error: reviewError }] = await Promise.all([
      serverSupabase.from('products').select('*').eq('is_active', true).eq('category_id', productRow.category_id).neq('id', productRow.id).order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(6),
      serverSupabase.from('reviews').select('*').eq('product_id', productRow.id).order('created_at', { ascending: false })
    ]);
    if (relatedError) throw relatedError;
    if (reviewError) throw reviewError;

    return res.json({ product, related: (relatedRows || []).map(mapProduct), reviews: (reviewRows || []).map(mapReview) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching product' });
  }
});

// Customer reviews are persisted in Supabase in production and require an authenticated customer.
productRouter.post('/products/:id/reviews', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    if (comment.length < 5 || comment.length > 2000) return res.status(400).json({ error: 'Review comment must be between 5 and 2000 characters.' });

    if (!isServerSupabaseConfigured) {
      const product = db.getProductById(id);
      if (!product) return res.status(404).json({ error: 'Product not found.' });
      const review = db.addReview({ productId: id, customerId: req.user!.id, customerName: req.user!.name, rating, comment });
      return res.status(201).json({ message: 'Thank you! Review submitted successfully.', review });
    }

    const { data: product, error: productError } = await serverSupabase.from('products').select('id').eq('id', id).eq('is_active', true).maybeSingle();
    if (productError) throw productError;
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const { data: purchase } = await serverSupabase
      .from('order_items')
      .select('order_id, orders!inner(customer_id,status)')
      .eq('product_id', id)
      .eq('orders.customer_id', req.user!.id)
      .eq('orders.status', 'DELIVERED')
      .limit(1)
      .maybeSingle();

    const { data: review, error } = await serverSupabase.from('reviews').insert({
      id: crypto.randomUUID(),
      product_id: id,
      customer_id: req.user!.id,
      customer_name: req.user!.name,
      rating,
      comment,
      verified_purchase: Boolean(purchase)
    }).select('*').single();
    if (error) throw error;

    return res.status(201).json({ message: 'Thank you! Review submitted successfully.', review: mapReview(review) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Review error' });
  }
});

// Delivery zones
productRouter.get('/delivery-zones', async (_req, res) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase.from('delivery_zones').select('*').eq('active', true).order('name');
      if (error) throw error;
      return res.json({ zones: (data || []).map(mapZone) });
    }
    return res.json({ zones: db.getDeliveryZones().filter((z) => z.active) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching delivery zones' });
  }
});

// Store settings
productRouter.get('/settings', async (_req, res) => {
  try {
    if (isServerSupabaseConfigured) {
      const { data, error } = await serverSupabase.from('business_settings').select('*').eq('id', 'default').maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Store settings not found.' });
      return res.json({ settings: {
        businessName: data.store_name,
        phone: data.phone,
        whatsapp: data.whatsapp,
        location: data.location,
        businessHours: data.business_hours,
        announcementText: data.announcement || '',
        freeDeliveryThreshold: Number(data.free_delivery_banner?.match?.(/KSh\s*([\d,]+)/i)?.[1]?.replace(/,/g, '') || 0),
        acceptOrders: Boolean(data.is_accepting_orders)
      } });
    }
    return res.json({ settings: db.getSettings() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching settings' });
  }
});
