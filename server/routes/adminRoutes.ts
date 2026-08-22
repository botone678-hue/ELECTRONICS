import { Router } from 'express';
import { db } from '../db';
import { serverSupabase } from '../supabase';
import { requireAdmin } from '../auth';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const mapOrder = (row: any, items: any[] = []) => ({
  id: row.id, orderNumber: row.order_number, customerId: row.customer_id || undefined,
  customerName: row.customer_name, customerPhone: row.customer_phone, customerEmail: row.customer_email || undefined,
  deliveryLocation: { county: row.county, town: row.town, estate: row.estate, landmark: row.landmark || '', instructions: row.instructions || '' },
  deliveryZoneId: row.delivery_zone_id, deliveryZoneName: row.delivery_zone_name,
  deliveryFee: Number(row.delivery_fee), subtotal: Number(row.subtotal), total: Number(row.total),
  paymentMethod: row.payment_method, paymentStatus: row.payment_status, status: row.status,
  statusHistory: row.status_history || [],
  items: items.map((i: any) => ({ productId: i.product_id, productName: i.product_name, sku: i.sku, image: i.image || '', priceSnapshot: Number(i.price_snapshot), quantity: i.quantity, subtotal: Number(i.subtotal) })),
  createdAt: row.created_at, updatedAt: row.updated_at
});

async function loadOrder(id: string) {
  const { data: row, error } = await serverSupabase.from('orders').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const { data: items, error: itemError } = await serverSupabase.from('order_items').select('*').eq('order_id', id).order('created_at', { ascending: true });
  if (itemError) throw itemError;
  return mapOrder(row, items || []);
}

// Analytics remains available; catalog/admin legacy operations are retained until their own Supabase migration.
adminRouter.get('/analytics', (_req, res) => res.json(db.getAnalytics()));

// Orders are authoritative Supabase records in production.
adminRouter.get('/orders', async (req, res) => {
  try {
    let query = serverSupabase.from('orders').select('*').order('created_at', { ascending: false });
    if (req.query.status) query = query.eq('status', String(req.query.status));
    if (req.query.customerId) query = query.eq('customer_id', String(req.query.customerId));
    const { data: rows, error } = await query;
    if (error) throw error;
    const orders = await Promise.all((rows || []).map((r: any) => loadOrder(r.id)));
    res.json({ orders: orders.filter(Boolean), total: orders.filter(Boolean).length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error loading orders.' });
  }
});

adminRouter.get('/orders/:id', async (req, res) => {
  try {
    const order = await loadOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error loading order.' });
  }
});

adminRouter.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    const allowed = ['ORDER_RECEIVED','CONFIRMED','PROCESSING','READY_FOR_DELIVERY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid order status.' });

    const { data: current, error: currentError } = await serverSupabase.from('orders').select('status,status_history').eq('id', req.params.id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return res.status(404).json({ error: 'Order not found.' });

    const history = Array.isArray(current.status_history) ? current.status_history : [];
    const updatedHistory = [...history, { status, timestamp: new Date().toISOString(), note: note || `Order status changed to ${status}.` }];
    const { error } = await serverSupabase.from('orders').update({ status, status_history: updatedHistory, updated_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw error;

    const order = await loadOrder(req.params.id);
    res.json({ message: 'Order status updated successfully.', order });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating order status.' });
  }
});

// Existing admin catalog/customer/settings operations remain protected.
adminRouter.get('/products', (_req, res) => res.json(db.getProducts({ limit: 500 })));
adminRouter.post('/products', (req, res) => {
  try {
    const { name, slug, sku, brand, categoryId, categoryName, subcategory, description, price, compareAtPrice, stockQuantity, lowStockThreshold, warranty, featured, isHotDeal, isNew, isActive, images, specifications } = req.body;
    if (!name || price === undefined || !categoryId || !sku) return res.status(400).json({ error: 'Product name, price, category, and SKU are required.' });
    const productSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const newProduct = db.createProduct({ name: name.trim(), slug: productSlug, sku: sku.trim().toUpperCase(), brand: brand ? brand.trim() : 'Mega City', categoryId, categoryName: categoryName || 'Electronics', subcategory: subcategory || 'General', description: description || '', price: Number(price), compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined, discountPercent: compareAtPrice && compareAtPrice > price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : undefined, stockQuantity: Number(stockQuantity ?? 10), lowStockThreshold: Number(lowStockThreshold ?? 3), warranty: warranty || '12 Months Official Warranty', featured: Boolean(featured), isHotDeal: Boolean(isHotDeal), isNew: Boolean(isNew), isActive: isActive !== undefined ? Boolean(isActive) : true, images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80'], specifications: specifications || {}, rating: 5.0, reviewCount: 0 });
    res.status(201).json({ message: 'Product created successfully.', product: newProduct });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error creating product' }); }
});
adminRouter.put('/products/:id', (req, res) => { try { const updated = db.updateProduct(req.params.id, req.body); if (!updated) return res.status(404).json({ error: 'Product not found.' }); res.json({ message: 'Product updated successfully.', product: updated }); } catch (err: any) { res.status(500).json({ error: err.message || 'Error updating product' }); } });
adminRouter.delete('/products/:id', (req, res) => { const success = db.deleteProduct(req.params.id); if (!success) return res.status(404).json({ error: 'Product not found.' }); res.json({ message: 'Product removed from catalog.' }); });
adminRouter.patch('/products/:id/quick-adjust', (req, res) => { try { const { price, compareAtPrice, stockQuantity, isActive, isHotDeal, featured } = req.body; const updates: any = {}; if (price !== undefined) updates.price = Number(price); if (compareAtPrice !== undefined) updates.compareAtPrice = compareAtPrice ? Number(compareAtPrice) : null; if (stockQuantity !== undefined) updates.stockQuantity = Number(stockQuantity); if (isActive !== undefined) updates.isActive = Boolean(isActive); if (isHotDeal !== undefined) updates.isHotDeal = Boolean(isHotDeal); if (featured !== undefined) updates.featured = Boolean(featured); const updated = db.updateProduct(req.params.id, updates); if (!updated) return res.status(404).json({ error: 'Product not found.' }); res.json({ message: 'Quick update applied.', product: updated }); } catch (err: any) { res.status(500).json({ error: err.message || 'Error adjusting product' }); } });

adminRouter.get('/customers', (_req, res) => {
  const customers = db.getUsers().filter((u) => u.role === 'customer').map((c) => { const customerOrders = db.getOrders({ customerId: c.id }); const totalSpent = customerOrders.filter((o) => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.total, 0); return { id: c.id, name: c.name, email: c.email, phone: c.phone, orderCount: customerOrders.length, totalSpent, createdAt: c.createdAt, latestOrder: customerOrders[0] || null }; });
  res.json({ customers });
});
adminRouter.get('/notifications', (_req, res) => res.json({ notifications: db.getNotifications() }));
adminRouter.patch('/notifications/:id/read', (req, res) => res.json({ success: db.markNotificationRead(req.params.id) }));
adminRouter.post('/notifications/read-all', (_req, res) => { db.markAllNotificationsRead(); res.json({ success: true }); });
adminRouter.get('/delivery-zones', (_req, res) => res.json({ zones: db.getDeliveryZones() }));
adminRouter.put('/delivery-zones', (req, res) => { try { if (!Array.isArray(req.body.zones)) return res.status(400).json({ error: 'Invalid zones data.' }); const updated = db.updateDeliveryZones(req.body.zones); res.json({ message: 'Delivery zones updated.', zones: updated }); } catch (err: any) { res.status(500).json({ error: err.message || 'Error saving zones' }); } });
adminRouter.get('/settings', (_req, res) => res.json({ settings: db.getSettings() }));
adminRouter.put('/settings', (req, res) => { try { const updated = db.updateSettings(req.body); res.json({ message: 'Business settings updated.', settings: updated }); } catch (err: any) { res.status(500).json({ error: err.message || 'Error updating settings' }); } });
