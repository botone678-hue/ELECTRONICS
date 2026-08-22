import {
  Product,
  Category,
  Order,
  DeliveryZone,
  BusinessSettings,
  Review,
  User,
  AdminNotification,
  OrderStatus
} from '../types';
import { supabase } from './supabase';

const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('megacity_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(`API returned a non-JSON response (${res.status}).`); }
  if (!res.ok) throw new Error(data.error || 'An error occurred with the request.');
  return data;
}

function mapCategory(row: any): Category {
  return {
    id: row.id, name: row.name, slug: row.slug, description: row.description || '',
    icon: row.icon || 'Package', imageUrl: row.image_url || '', subcategories: row.subcategories || []
  };
}

function mapProduct(row: any): Product {
  return {
    id: row.id, name: row.name, slug: row.slug, sku: row.sku, brand: row.brand,
    categoryId: row.category_id, categoryName: row.category_name, subcategory: row.subcategory,
    description: row.description, price: Number(row.price), compareAtPrice: row.compare_at_price == null ? undefined : Number(row.compare_at_price),
    discountPercent: row.discount_percent == null ? undefined : Number(row.discount_percent),
    stockQuantity: Number(row.stock_quantity), lowStockThreshold: Number(row.low_stock_threshold), warranty: row.warranty,
    featured: Boolean(row.featured), isHotDeal: Boolean(row.hot_deal), isNew: Boolean(row.is_new), isActive: Boolean(row.is_active),
    images: Array.isArray(row.images) ? row.images : [], specifications: row.specifications || {},
    rating: Number(row.rating || 5), reviewCount: Number(row.review_count || 0),
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}

export const api = {
  // Production catalog reads come directly from Supabase. This avoids depending on an Express server
  // that is not part of the Vercel static/Vite deployment.
  async getProducts(params?: {
    categoryId?: string; subcategory?: string; brand?: string; minPrice?: number; maxPrice?: number;
    featured?: boolean; isHotDeal?: boolean; inStockOnly?: boolean; search?: string; sort?: string; limit?: number; offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    let query = supabase.from('products').select('*', { count: 'exact' }).eq('is_active', true);
    if (params?.categoryId) query = query.eq('category_id', params.categoryId);
    if (params?.subcategory) query = query.ilike('subcategory', params.subcategory);
    if (params?.brand) query = query.ilike('brand', params.brand);
    if (params?.minPrice !== undefined) query = query.gte('price', params.minPrice);
    if (params?.maxPrice !== undefined) query = query.lte('price', params.maxPrice);
    if (params?.featured !== undefined) query = query.eq('featured', params.featured);
    if (params?.isHotDeal !== undefined) query = query.eq('hot_deal', params.isHotDeal);
    if (params?.inStockOnly) query = query.gt('stock_quantity', 0);
    if (params?.search) {
      const q = params.search.replace(/[%(),]/g, ' ').trim();
      if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,sku.ilike.%${q}%,category_name.ilike.%${q}%,subcategory.ilike.%${q}%`);
    }
    const ascending = params?.sort === 'price-asc';
    if (params?.sort === 'price-asc' || params?.sort === 'price-desc') query = query.order('price', { ascending });
    else if (params?.sort === 'newest') query = query.order('created_at', { ascending: false });
    else if (params?.sort === 'rating') query = query.order('rating', { ascending: false });
    else query = query.order('featured', { ascending: false }).order('hot_deal', { ascending: false }).order('created_at', { ascending: false });
    const offset = params?.offset || 0;
    const limit = Math.min(params?.limit || 100, 1000);
    query = query.range(offset, offset + limit - 1);
    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { products: (data || []).map(mapProduct), total: count || 0 };
  },

  async getProduct(identifier: string): Promise<{ product: Product; related: Product[]; reviews: Review[] }> {
    let q = supabase.from('products').select('*').eq('is_active', true);
    q = identifier.includes('-') ? q.or(`id.eq.${identifier},slug.eq.${identifier}`) : q.eq('slug', identifier);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Product not found.');
    const product = mapProduct(data);
    const { data: relatedRows } = await supabase.from('products').select('*').eq('is_active', true).eq('category_id', product.categoryId).neq('id', product.id).limit(6);
    const { data: reviewRows } = await supabase.from('reviews').select('*').eq('product_id', product.id).order('created_at', { ascending: false });
    const reviews: Review[] = (reviewRows || []).map((r: any) => ({ id: r.id, productId: r.product_id, customerId: r.customer_id, customerName: r.customer_name, rating: r.rating, comment: r.comment, verifiedPurchase: r.verified_purchase, createdAt: r.created_at }));
    return { product, related: (relatedRows || []).map(mapProduct), reviews };
  },

  async getCategories(): Promise<{ categories: Category[] }> {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw new Error(error.message);
    return { categories: (data || []).map(mapCategory) };
  },

  async submitReview(productId: string, data: { customerName?: string; rating: number; comment: string }): Promise<{ message: string; review: Review }> {
    const res = await fetch(`${API_BASE}/products/${productId}/reviews`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },

  async getDeliveryZones(): Promise<{ zones: DeliveryZone[] }> {
    const { data, error } = await supabase.from('delivery_zones').select('*').eq('active', true).order('name');
    if (error) throw new Error(error.message);
    return { zones: (data || []).map((z: any) => ({ id: z.id, name: z.name, fee: Number(z.fee), estimatedTime: z.estimated_time, minimumOrder: Number(z.minimum_order), freeThreshold: z.free_threshold == null ? undefined : Number(z.free_threshold), active: z.active })) };
  },

  async getSettings(): Promise<{ settings: BusinessSettings }> {
    const res = await fetch(`${API_BASE}/settings`);
    return handleResponse(res);
  },

  async checkout(orderData: { customerName: string; customerPhone: string; customerEmail?: string; deliveryLocation: { county: string; town: string; estate: string; landmark?: string; instructions?: string }; deliveryZoneId: string; paymentMethod: 'CASH_ON_DELIVERY' | 'MPESA_ON_DELIVERY'; items: { productId: string; quantity: number }[] }): Promise<{ message: string; order: Order }> {
    const res = await fetch(`${API_BASE}/orders/checkout`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(orderData) });
    return handleResponse(res);
  },
  async trackOrder(query: string): Promise<{ order: Order }> { const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(query)}`); return handleResponse(res); },
  async getMyOrders(): Promise<{ orders: Order[] }> { const res = await fetch(`${API_BASE}/orders/my-orders`, { headers: getAuthHeaders() }); return handleResponse(res); },
  async login(credentials: { email: string; password: string; requireRole?: string }): Promise<{ token: string; user: User }> { const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) }); return handleResponse(res); },
  async register(data: { name: string; email: string; phone: string; password: string }): Promise<{ token: string; user: User }> { const res = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return handleResponse(res); },
  async getMe(): Promise<{ user: User }> { const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() }); return handleResponse(res); },
  async updateProfile(updates: Partial<User>): Promise<{ user: User }> { const res = await fetch(`${API_BASE}/auth/profile`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(updates) }); return handleResponse(res); },
  async getAdminAnalytics(): Promise<any> { const res = await fetch(`${API_BASE}/admin/analytics`, { headers: getAuthHeaders() }); return handleResponse(res); },
  async getAdminOrders(status?: string): Promise<{ orders: Order[]; total: number }> { const q = status ? `?status=${encodeURIComponent(status)}` : ''; const res = await fetch(`${API_BASE}/admin/orders${q}`, { headers: getAuthHeaders() }); return handleResponse(res); },
  async updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<{ order: Order }> { const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ status, note }) }); return handleResponse(res); },
  async createProduct(productData: Partial<Product>): Promise<{ product: Product }> { const res = await fetch(`${API_BASE}/admin/products`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(productData) }); return handleResponse(res); },
  async updateProduct(id: string, updates: Partial<Product>): Promise<{ product: Product }> { const res = await fetch(`${API_BASE}/admin/products/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(updates) }); return handleResponse(res); },
  async quickAdjustProduct(id: string, updates: { price?: number; compareAtPrice?: number; stockQuantity?: number; isActive?: boolean; isHotDeal?: boolean; featured?: boolean }): Promise<{ product: Product }> { const res = await fetch(`${API_BASE}/admin/products/${id}/quick-adjust`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(updates) }); return handleResponse(res); },
  async deleteProduct(id: string): Promise<{ message: string }> { const res = await fetch(`${API_BASE}/admin/products/${id}`, { method: 'DELETE', headers: getAuthHeaders() }); return handleResponse(res); },
  async getAdminCustomers(): Promise<{ customers: any[] }> { const res = await fetch(`${API_BASE}/admin/customers`, { headers: getAuthHeaders() }); return handleResponse(res); },
  async getAdminNotifications(): Promise<{ notifications: AdminNotification[] }> { const res = await fetch(`${API_BASE}/admin/notifications`, { headers: getAuthHeaders() }); return handleResponse(res); },
  async markNotificationRead(id: string): Promise<void> { await fetch(`${API_BASE}/admin/notifications/${id}/read`, { method: 'PATCH', headers: getAuthHeaders() }); },
  async markAllNotificationsRead(): Promise<void> { await fetch(`${API_BASE}/admin/notifications/read-all`, { method: 'POST', headers: getAuthHeaders() }); },
  async updateAdminSettings(settings: Partial<BusinessSettings>): Promise<{ settings: BusinessSettings }> { const res = await fetch(`${API_BASE}/admin/settings`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(settings) }); return handleResponse(res); },
  async updateDeliveryZones(zones: DeliveryZone[]): Promise<{ zones: DeliveryZone[] }> { const res = await fetch(`${API_BASE}/admin/delivery-zones`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ zones }) }); return handleResponse(res); }
};
