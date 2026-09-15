import { Router } from 'express';
import { serverSupabase } from '../supabase';
import { requireAdmin } from '../auth';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const ORDER_STATUS_FLOW: Record<string, string[]> = {
  ORDER_RECEIVED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const mapProduct = (p: any) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  sku: p.sku,
  brand: p.brand,
  categoryId: p.category_id,
  categoryName: p.category_name,
  subcategory: p.subcategory,
  description: p.description,
  price: Number(p.price),
  compareAtPrice: p.compare_at_price == null ? undefined : Number(p.compare_at_price),
  discountPercent: p.discount_percent == null ? undefined : Number(p.discount_percent),
  stockQuantity: Number(p.stock_quantity),
  lowStockThreshold: Number(p.low_stock_threshold),
  warranty: p.warranty,
  featured: Boolean(p.featured),
  isHotDeal: Boolean(p.hot_deal),
  isNew: Boolean(p.is_new),
  isActive: Boolean(p.is_active),
  images: Array.isArray(p.images) ? p.images : [],
  specifications: p.specifications || {},
  rating: Number(p.rating),
  reviewCount: Number(p.review_count),
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

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

adminRouter.get('/analytics', async (_req, res) => {
  try {
    const [{ data: orders, error: orderError }, { data: products, error: productError }, { count: customerCount, error: customerError }] = await Promise.all([
      serverSupabase.from('orders').select('status,total,payment_status,created_at'),
      serverSupabase.from('products').select('stock_quantity,low_stock_threshold,is_active'),
      serverSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    ]);
    if (orderError) throw orderError;
    if (productError) throw productError;
    if (customerError) throw customerError;
    const orderRows = orders || [];
    const completed = orderRows.filter((o: any) => o.status === 'DELIVERED');
    const nonCancelled = orderRows.filter((o: any) => o.status !== 'CANCELLED');
    const revenue = nonCancelled.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const paidRevenue = nonCancelled.filter((o: any) => o.payment_status === 'PAID').reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    res.json({
      totalOrders: orderRows.length,
      pendingOrders: orderRows.filter((o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
      completedOrders: completed.length,
      totalRevenue: revenue,
      paidRevenue,
      averageOrderValue: nonCancelled.length ? revenue / nonCancelled.length : 0,
      totalCustomers: customerCount || 0,
      totalProducts: (products || []).filter((p: any) => p.is_active).length,
      lowStockProducts: (products || []).filter((p: any) => p.is_active && Number(p.stock_quantity) <= Number(p.low_stock_threshold)).length,
      recentOrders: orderRows.slice().sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 10),
    });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error loading analytics.' }); }
});

adminRouter.get('/orders', async (req, res) => {
  try {
    let query = serverSupabase.from('orders').select('*').order('created_at', { ascending: false });
    if (req.query.status) query = query.eq('status', String(req.query.status));
    if (req.query.customerId) query = query.eq('customer_id', String(req.query.customerId));
    const { data: rows, error } = await query;
    if (error) throw error;
    const orders = await Promise.all((rows || []).map((r: any) => loadOrder(r.id)));
    res.json({ orders: orders.filter(Boolean), total: orders.filter(Boolean).length });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error loading orders.' }); }
});

adminRouter.get('/orders/:id', async (req, res) => {
  try { const order = await loadOrder(req.params.id); if (!order) return res.status(404).json({ error: 'Order not found.' }); res.json({ order }); }
  catch (err: any) { res.status(500).json({ error: err.message || 'Error loading order.' }); }
});

adminRouter.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body || {};
    if (typeof status !== 'string' || !Object.prototype.hasOwnProperty.call(ORDER_STATUS_FLOW, status)) return res.status(400).json({ error: 'Invalid order status.' });
    const { data: current, error: currentError } = await serverSupabase.from('orders').select('status,status_history').eq('id', req.params.id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return res.status(404).json({ error: 'Order not found.' });
    const currentStatus = String(current.status);
    const allowedNext = ORDER_STATUS_FLOW[currentStatus] || [];
    if (!allowedNext.includes(status)) return res.status(409).json({ error: `Invalid order status transition from ${currentStatus} to ${status}.`, currentStatus, allowedNext });
    const history = Array.isArray(current.status_history) ? current.status_history : [];
    const updatedHistory = [...history, { status, timestamp: new Date().toISOString(), note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : `Order status changed to ${status}.` }];
    const { data: updatedRows, error } = await serverSupabase.from('orders').update({ status, status_history: updatedHistory, updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('status', currentStatus).select('id');
    if (error) throw error;
    if (!updatedRows?.length) return res.status(409).json({ error: 'Order changed before this update completed. Reload and try again.' });
    res.json({ message: 'Order status updated successfully.', order: await loadOrder(req.params.id) });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error updating order status.' }); }
});

adminRouter.get('/products', async (_req, res) => {
  try { const { data, error } = await serverSupabase.from('products').select('*').order('created_at', { ascending: false }).limit(500); if (error) throw error; res.json({ products: (data || []).map(mapProduct), total: data?.length || 0 }); }
  catch (err: any) { res.status(500).json({ error: err.message || 'Error loading products.' }); }
});

adminRouter.post('/products', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name || b.price === undefined || !b.categoryId || !b.sku) return res.status(400).json({ error: 'Product name, price, category, and SKU are required.' });
    const price = Number(b.price);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Invalid product price.' });
    const { data: category, error: categoryError } = await serverSupabase.from('categories').select('id,name').eq('id', String(b.categoryId)).maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) return res.status(400).json({ error: 'Selected category does not exist.' });
    const slug = String(b.slug || b.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await serverSupabase.from('products').insert({
      id: String(b.id || `prod-${Date.now()}`), name: String(b.name).trim(), slug, sku: String(b.sku).trim().toUpperCase(), brand: String(b.brand || 'Mega City').trim(),
      category_id: category.id, category_name: category.name, subcategory: String(b.subcategory || 'General'), description: String(b.description || ''), price,
      compare_at_price: b.compareAtPrice == null || b.compareAtPrice === '' ? null : Number(b.compareAtPrice),
      discount_percent: b.compareAtPrice && Number(b.compareAtPrice) > price ? Math.round(((Number(b.compareAtPrice) - price) / Number(b.compareAtPrice)) * 100) : null,
      stock_quantity: Number.isFinite(Number(b.stockQuantity)) ? Math.max(0, Math.floor(Number(b.stockQuantity))) : 0,
      low_stock_threshold: Number.isFinite(Number(b.lowStockThreshold)) ? Math.max(0, Math.floor(Number(b.lowStockThreshold))) : 3,
      warranty: String(b.warranty || '12 Months Official Warranty'), featured: Boolean(b.featured), hot_deal: Boolean(b.isHotDeal), is_new: Boolean(b.isNew), is_active: b.isActive !== undefined ? Boolean(b.isActive) : true,
      images: Array.isArray(b.images) ? b.images.filter((x: any) => typeof x === 'string' && x.trim()) : [], specifications: b.specifications || {}, rating: 5, review_count: 0,
    }).select('*').single();
    if (error) throw error;
    res.status(201).json({ message: 'Product created successfully.', product: mapProduct(data) });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error creating product.' }); }
});

adminRouter.put('/products/:id', async (req, res) => {
  try {
    const b = req.body || {}; const updates: any = {};
    const map: Record<string, string> = { name: 'name', slug: 'slug', sku: 'sku', brand: 'brand', subcategory: 'subcategory', description: 'description', warranty: 'warranty', featured: 'featured', isHotDeal: 'hot_deal', isNew: 'is_new', isActive: 'is_active', specifications: 'specifications', images: 'images' };
    for (const [key, column] of Object.entries(map)) if (b[key] !== undefined) updates[column] = b[key];
    for (const [key, column] of [['price','price'],['compareAtPrice','compare_at_price'],['stockQuantity','stock_quantity'],['lowStockThreshold','low_stock_threshold']] as const) if (b[key] !== undefined) updates[column] = b[key] === null || b[key] === '' ? null : Number(b[key]);
    if (b.categoryId !== undefined) { const { data: category, error } = await serverSupabase.from('categories').select('id,name').eq('id', String(b.categoryId)).maybeSingle(); if (error) throw error; if (!category) return res.status(400).json({ error: 'Selected category does not exist.' }); updates.category_id = category.id; updates.category_name = category.name; }
    if (updates.price !== undefined && (!Number.isFinite(updates.price) || updates.price < 0)) return res.status(400).json({ error: 'Invalid product price.' });
    updates.updated_at = new Date().toISOString();
    const { data, error } = await serverSupabase.from('products').update(updates).eq('id', req.params.id).select('*').maybeSingle();
    if (error) throw error; if (!data) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product updated successfully.', product: mapProduct(data) });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error updating product.' }); }
});

adminRouter.delete('/products/:id', async (req, res) => {
  try { const { data, error } = await serverSupabase.from('products').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', req.params.id).select('id').maybeSingle(); if (error) throw error; if (!data) return res.status(404).json({ error: 'Product not found.' }); res.json({ message: 'Product removed from catalog.' }); }
  catch (err: any) { res.status(500).json({ error: err.message || 'Error removing product.' }); }
});

adminRouter.patch('/products/:id/quick-adjust', async (req, res) => {
  try { const b = req.body || {}; const updates: any = {}; if (b.price !== undefined) updates.price = Number(b.price); if (b.compareAtPrice !== undefined) updates.compare_at_price = b.compareAtPrice === null || b.compareAtPrice === '' ? null : Number(b.compareAtPrice); if (b.stockQuantity !== undefined) updates.stock_quantity = Math.max(0, Math.floor(Number(b.stockQuantity))); if (b.isActive !== undefined) updates.is_active = Boolean(b.isActive); if (b.isHotDeal !== undefined) updates.hot_deal = Boolean(b.isHotDeal); if (b.featured !== undefined) updates.featured = Boolean(b.featured); updates.updated_at = new Date().toISOString(); const { data, error } = await serverSupabase.from('products').update(updates).eq('id', req.params.id).select('*').maybeSingle(); if (error) throw error; if (!data) return res.status(404).json({ error: 'Product not found.' }); res.json({ message: 'Quick update applied.', product: mapProduct(data) }); }
  catch (err: any) { res.status(500).json({ error: err.message || 'Error adjusting product.' }); }
});

adminRouter.get('/customers', async (_req, res) => {
  try { const { data: customers, error } = await serverSupabase.from('profiles').select('id,name,email,phone,created_at').eq('role','customer').order('created_at',{ascending:false}); if (error) throw error; const { data: orders, error: orderError } = await serverSupabase.from('orders').select('id,customer_id,total,status,created_at').not('customer_id','is',null).order('created_at',{ascending:false}); if (orderError) throw orderError; const grouped = new Map<string, any[]>(); for (const o of orders || []) { const list = grouped.get(o.customer_id) || []; list.push(o); grouped.set(o.customer_id, list); } res.json({ customers: (customers || []).map((c: any) => { const os = grouped.get(c.id) || []; return { id:c.id,name:c.name,email:c.email,phone:c.phone,orderCount:os.length,totalSpent:os.filter(o=>o.status!=='CANCELLED').reduce((s,o)=>s+Number(o.total||0),0),createdAt:c.created_at,latestOrder:os[0]||null }; }) }); }
  catch (err: any) { res.status(500).json({ error: err.message || 'Error loading customers.' }); }
});

adminRouter.get('/notifications', async (_req, res) => { try { const { data, error } = await serverSupabase.from('notifications').select('*').order('created_at',{ascending:false}); if(error) throw error; res.json({notifications:data||[]}); } catch(err:any){res.status(500).json({error:err.message||'Error loading notifications.'});} });
adminRouter.patch('/notifications/:id/read', async (req,res)=>{try{const {data,error}=await serverSupabase.from('notifications').update({read:true}).eq('id',req.params.id).select('id').maybeSingle();if(error)throw error;if(!data)return res.status(404).json({error:'Notification not found.'});res.json({success:true});}catch(err:any){res.status(500).json({error:err.message||'Error updating notification.'});}});
adminRouter.post('/notifications/read-all', async (_req,res)=>{try{const {error}=await serverSupabase.from('notifications').update({read:true}).eq('read',false);if(error)throw error;res.json({success:true});}catch(err:any){res.status(500).json({error:err.message||'Error updating notifications.'});}});

adminRouter.get('/delivery-zones', async (_req,res)=>{try{const {data,error}=await serverSupabase.from('delivery_zones').select('*').order('created_at',{ascending:true});if(error)throw error;res.json({zones:data||[]});}catch(err:any){res.status(500).json({error:err.message||'Error loading delivery zones.'});}});
adminRouter.put('/delivery-zones', async (req,res)=>{try{if(!Array.isArray(req.body?.zones))return res.status(400).json({error:'Invalid zones data.'});for(const zone of req.body.zones){if(!zone.id)continue;const {error}=await serverSupabase.from('delivery_zones').update({name:zone.name,fee:Number(zone.fee||0),estimated_time:String(zone.estimatedTime||zone.estimated_time||''),minimum_order:Number(zone.minimumOrder||zone.minimum_order||0),free_threshold:zone.freeThreshold==null&&zone.free_threshold==null?null:Number(zone.freeThreshold??zone.free_threshold),active:zone.active!==false}).eq('id',zone.id);if(error)throw error;}const {data,error}=await serverSupabase.from('delivery_zones').select('*').order('created_at',{ascending:true});if(error)throw error;res.json({message:'Delivery zones updated.',zones:data||[]});}catch(err:any){res.status(500).json({error:err.message||'Error saving delivery zones.'});}});

adminRouter.get('/settings', async (_req,res)=>{try{const {data,error}=await serverSupabase.from('business_settings').select('*').eq('id','default').maybeSingle();if(error)throw error;if(!data)return res.status(404).json({error:'Business settings not configured.'});res.json({settings:data});}catch(err:any){res.status(500).json({error:err.message||'Error loading settings.'});}});
adminRouter.put('/settings', async (req,res)=>{try{const allowed=['store_name','tagline','phone','whatsapp','email','location','business_hours','announcement','delivery_promise','free_delivery_banner','is_accepting_orders'];const updates:any={updated_at:new Date().toISOString()};for(const key of allowed)if(req.body?.[key]!==undefined)updates[key]=req.body[key];const {data,error}=await serverSupabase.from('business_settings').upsert({id:'default',...updates}).select('*').single();if(error)throw error;res.json({message:'Business settings updated.',settings:data});}catch(err:any){res.status(500).json({error:err.message||'Error updating settings.'});}});
