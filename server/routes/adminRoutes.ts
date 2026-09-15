import { Router } from 'express';
import { db } from '../db';
import { serverSupabase } from '../supabase';
import { requireAdmin } from '../auth';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const mapProduct = (p: any) => ({
  id: p.id, name: p.name, slug: p.slug, sku: p.sku, brand: p.brand,
  categoryId: p.category_id, categoryName: p.category_name, subcategory: p.subcategory,
  description: p.description, price: Number(p.price), compareAtPrice: p.compare_at_price == null ? undefined : Number(p.compare_at_price),
  discountPercent: p.discount_percent == null ? undefined : Number(p.discount_percent),
  stockQuantity: Number(p.stock_quantity), lowStockThreshold: Number(p.low_stock_threshold), warranty: p.warranty,
  featured: Boolean(p.featured), isHotDeal: Boolean(p.hot_deal), isNew: Boolean(p.is_new), isActive: Boolean(p.is_active),
  images: Array.isArray(p.images) ? p.images : [], specifications: p.specifications || {}, rating: Number(p.rating || 0),
  reviewCount: Number(p.review_count || 0), createdAt: p.created_at, updatedAt: p.updated_at
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

adminRouter.get('/analytics', (_req, res) => res.json(db.getAnalytics()));

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
  try {
    const order = await loadOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error loading order.' }); }
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
    res.json({ message: 'Order status updated successfully.', order: await loadOrder(req.params.id) });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error updating order status.' }); }
});

// ---------------- SUPABASE-AUTHORITATIVE CATALOG ----------------
adminRouter.get('/products', async (_req, res) => {
  try {
    const { data, error } = await serverSupabase.from('products').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    res.json({ products: (data || []).map(mapProduct), total: (data || []).length });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error loading products.' }); }
});

adminRouter.post('/products', async (req, res) => {
  try {
    const { name, slug, sku, brand, categoryId, categoryName, subcategory, description, price, compareAtPrice, stockQuantity, lowStockThreshold, warranty, featured, isHotDeal, isNew, isActive, images, specifications } = req.body;
    if (!name || !sku || price === undefined || !categoryId) return res.status(400).json({ error: 'Product name, price, category, and SKU are required.' });
    const numericPrice = Number(price);
    const stock = Number(stockQuantity ?? 10);
    const threshold = Number(lowStockThreshold ?? 3);
    if (!Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(threshold) || threshold < 0) return res.status(400).json({ error: 'Invalid price or inventory values.' });
    const productSlug = String(slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cap = compareAtPrice === undefined || compareAtPrice === null || compareAtPrice === '' ? null : Number(compareAtPrice);
    if (cap !== null && (!Number.isFinite(cap) || cap < 0)) return res.status(400).json({ error: 'Invalid compare-at price.' });
    const { data, error } = await serverSupabase.from('products').insert({
      name: String(name).trim(), slug: productSlug, sku: String(sku).trim().toUpperCase(), brand: String(brand || 'Mega City').trim(),
      category_id: String(categoryId), category_name: String(categoryName || 'Electronics'), subcategory: String(subcategory || 'General'),
      description: String(description || ''), price: numericPrice, compare_at_price: cap,
      discount_percent: cap !== null && cap > numericPrice ? Math.round(((cap - numericPrice) / cap) * 100) : null,
      stock_quantity: stock, low_stock_threshold: threshold, warranty: String(warranty || '12 Months Official Warranty'),
      featured: Boolean(featured), hot_deal: Boolean(isHotDeal), is_new: Boolean(isNew), is_active: isActive !== false,
      images: Array.isArray(images) ? images : [], specifications: specifications && typeof specifications === 'object' ? specifications : {}, rating: 5, review_count: 0
    }).select('*').single();
    if (error) throw error;
    res.status(201).json({ message: 'Product created successfully.', product: mapProduct(data) });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error creating product.' }); }
});

adminRouter.put('/products/:id', async (req, res) => {
  try {
    const allowed: Record<string, string> = { name:'name', slug:'slug', sku:'sku', brand:'brand', categoryId:'category_id', categoryName:'category_name', subcategory:'subcategory', description:'description', price:'price', compareAtPrice:'compare_at_price', stockQuantity:'stock_quantity', lowStockThreshold:'low_stock_threshold', warranty:'warranty', featured:'featured', isHotDeal:'hot_deal', isNew:'is_new', isActive:'is_active', images:'images', specifications:'specifications' };
    const updates: any = {};
    for (const [key, column] of Object.entries(allowed)) if (req.body[key] !== undefined) updates[column] = req.body[key];
    if (updates.price !== undefined) { updates.price = Number(updates.price); if (!Number.isFinite(updates.price) || updates.price < 0) return res.status(400).json({ error: 'Invalid price.' }); }
    if (updates.stock_quantity !== undefined) { updates.stock_quantity = Number(updates.stock_quantity); if (!Number.isInteger(updates.stock_quantity) || updates.stock_quantity < 0) return res.status(400).json({ error: 'Invalid stock quantity.' }); }
    if (updates.low_stock_threshold !== undefined) { updates.low_stock_threshold = Number(updates.low_stock_threshold); if (!Number.isInteger(updates.low_stock_threshold) || updates.low_stock_threshold < 0) return res.status(400).json({ error: 'Invalid low-stock threshold.' }); }
    if (updates.sku !== undefined) updates.sku = String(updates.sku).trim().toUpperCase();
    updates.updated_at = new Date().toISOString();
    const { data, error } = await serverSupabase.from('products').update(updates).eq('id', req.params.id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product updated successfully.', product: mapProduct(data) });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error updating product.' }); }
});

adminRouter.delete('/products/:id', async (req, res) => {
  try {
    const { data, error } = await serverSupabase.from('products').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', req.params.id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product removed from catalog.' });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error removing product.' }); }
});

adminRouter.patch('/products/:id/quick-adjust', async (req, res) => {
  try {
    const updates: any = {};
    for (const [key, column] of [['price','price'],['compareAtPrice','compare_at_price'],['stockQuantity','stock_quantity'],['isActive','is_active'],['isHotDeal','hot_deal'],['featured','featured']] as const) if (req.body[key] !== undefined) updates[column] = req.body[key];
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.stock_quantity !== undefined) updates.stock_quantity = Number(updates.stock_quantity);
    if (updates.price !== undefined && (!Number.isFinite(updates.price) || updates.price < 0)) return res.status(400).json({ error: 'Invalid price.' });
    if (updates.stock_quantity !== undefined && (!Number.isInteger(updates.stock_quantity) || updates.stock_quantity < 0)) return res.status(400).json({ error: 'Invalid stock quantity.' });
    updates.updated_at = new Date().toISOString();
    const { data, error } = await serverSupabase.from('products').update(updates).eq('id', req.params.id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Quick update applied.', product: mapProduct(data) });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error adjusting product.' }); }
});

adminRouter.get('/customers', async (_req, res) => {
  try {
    const { data: customers, error } = await serverSupabase.from('profiles').select('id,name,email,phone,role,created_at').eq('role','customer').order('created_at',{ ascending:false });
    if (error) throw error;
    const { data: orders, error: orderError } = await serverSupabase.from('orders').select('id,customer_id,total,status,created_at,order_number').order('created_at',{ ascending:false });
    if (orderError) throw orderError;
    const result = (customers || []).map((c: any) => {
      const mine = (orders || []).filter((o: any) => o.customer_id === c.id);
      return { id:c.id,name:c.name,email:c.email,phone:c.phone,orderCount:mine.length,totalSpent:mine.filter((o:any)=>o.status!=='CANCELLED').reduce((s:number,o:any)=>s+Number(o.total),0),createdAt:c.created_at,latestOrder:mine[0] || null };
    });
    res.json({ customers: result });
  } catch (err: any) { res.status(500).json({ error: err.message || 'Error loading customers.' }); }
});

adminRouter.get('/notifications', async (_req, res) => {
  try { const { data, error } = await serverSupabase.from('notifications').select('*').order('created_at',{ ascending:false }); if (error) throw error; res.json({ notifications:data || [] }); }
  catch (err:any) { res.status(500).json({ error:err.message || 'Error loading notifications.' }); }
});

adminRouter.patch('/notifications/:id/read', async (req,res) => {
  try { const { data,error }=await serverSupabase.from('notifications').update({read:true}).eq('id',req.params.id).select('id').maybeSingle(); if(error)throw error; res.json({success:Boolean(data)}); }
  catch(err:any){res.status(500).json({error:err.message||'Error updating notification.'});}
});

adminRouter.post('/notifications/read-all', async (_req,res) => {
  try { const {error}=await serverSupabase.from('notifications').update({read:true}).eq('read',false); if(error)throw error; res.json({success:true}); }
  catch(err:any){res.status(500).json({error:err.message||'Error updating notifications.'});}
});

adminRouter.get('/delivery-zones', async (_req,res) => {
  try { const {data,error}=await serverSupabase.from('delivery_zones').select('*').order('name'); if(error)throw error; res.json({zones:(data||[]).map((z:any)=>({id:z.id,name:z.name,fee:Number(z.fee),estimatedTime:z.estimated_time,minimumOrder:Number(z.minimum_order),freeThreshold:z.free_threshold==null?undefined:Number(z.free_threshold),active:Boolean(z.active)}))}); }
  catch(err:any){res.status(500).json({error:err.message||'Error loading delivery zones.'});}
});

adminRouter.put('/delivery-zones', async (req,res) => {
  try {
    if(!Array.isArray(req.body.zones)) return res.status(400).json({error:'Invalid zones data.'});
    const rows=req.body.zones.map((z:any)=>({id:String(z.id),name:String(z.name),fee:Number(z.fee),estimated_time:String(z.estimatedTime||''),minimum_order:Number(z.minimumOrder||0),free_threshold:z.freeThreshold==null?null:Number(z.freeThreshold),active:z.active!==false}));
    const {data,error}=await serverSupabase.from('delivery_zones').upsert(rows,{onConflict:'id'}).select('*'); if(error)throw error;
    res.json({message:'Delivery zones updated.',zones:data||[]});
  } catch(err:any){res.status(500).json({error:err.message||'Error saving zones.'});}
});

adminRouter.get('/settings', async (_req,res) => {
  try { const {data,error}=await serverSupabase.from('business_settings').select('*').eq('id','default').maybeSingle(); if(error)throw error; if(!data)return res.status(404).json({error:'Business settings not configured.'}); res.json({settings:{businessName:data.store_name,phone:data.phone,whatsapp:data.whatsapp,location:data.location,businessHours:data.business_hours,announcementText:data.announcement,freeDeliveryThreshold:0,acceptOrders:Boolean(data.is_accepting_orders)}}); }
  catch(err:any){res.status(500).json({error:err.message||'Error loading settings.'});}
});

adminRouter.put('/settings', async (req,res) => {
  try {
    const updates:any={};
    if(req.body.businessName!==undefined)updates.store_name=String(req.body.businessName);
    if(req.body.phone!==undefined)updates.phone=String(req.body.phone);
    if(req.body.whatsapp!==undefined)updates.whatsapp=String(req.body.whatsapp);
    if(req.body.location!==undefined)updates.location=String(req.body.location);
    if(req.body.businessHours!==undefined)updates.business_hours=String(req.body.businessHours);
    if(req.body.announcementText!==undefined)updates.announcement=String(req.body.announcementText);
    if(req.body.acceptOrders!==undefined)updates.is_accepting_orders=Boolean(req.body.acceptOrders);
    updates.updated_at=new Date().toISOString();
    const {data,error}=await serverSupabase.from('business_settings').upsert({id:'default',...updates},{onConflict:'id'}).select('*').single(); if(error)throw error;
    res.json({message:'Business settings updated.',settings:{businessName:data.store_name,phone:data.phone,whatsapp:data.whatsapp,location:data.location,businessHours:data.business_hours,announcementText:data.announcement,freeDeliveryThreshold:0,acceptOrders:Boolean(data.is_accepting_orders)}});
  } catch(err:any){res.status(500).json({error:err.message||'Error updating settings.'});}
});
