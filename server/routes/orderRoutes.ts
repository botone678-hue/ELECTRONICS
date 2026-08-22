import { Router, Response } from 'express';
import { serverSupabase, isServerSupabaseConfigured } from '../supabase';
import { optionalAuth, requireAuth, AuthRequest } from '../auth';

export const orderRouter = Router();

const mapOrder = (row: any, items: any[] = []) => ({
  id: row.id,
  orderNumber: row.order_number,
  customerId: row.customer_id || undefined,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  customerEmail: row.customer_email || undefined,
  deliveryLocation: {
    county: row.county,
    town: row.town,
    estate: row.estate,
    landmark: row.landmark || '',
    instructions: row.instructions || ''
  },
  deliveryZoneId: row.delivery_zone_id,
  deliveryZoneName: row.delivery_zone_name,
  deliveryFee: Number(row.delivery_fee),
  subtotal: Number(row.subtotal),
  total: Number(row.total),
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  status: row.status,
  statusHistory: row.status_history || [],
  items: items.map((i: any) => ({
    productId: i.product_id,
    productName: i.product_name,
    sku: i.sku,
    image: i.image || '',
    priceSnapshot: Number(i.price_snapshot),
    quantity: i.quantity,
    subtotal: Number(i.subtotal)
  })),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

async function loadOrder(id: string) {
  const { data: row, error } = await serverSupabase.from('orders').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const { data: items, error: itemError } = await serverSupabase.from('order_items').select('*').eq('order_id', id).order('created_at', { ascending: true });
  if (itemError) throw itemError;
  return mapOrder(row, items || []);
}

async function loadOrderByNumber(orderNumber: string) {
  const { data: row, error } = await serverSupabase.from('orders').select('*').ilike('order_number', orderNumber).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  return loadOrder(row.id);
}

const handleCheckout = async (req: AuthRequest, res: Response) => {
  try {
    if (!isServerSupabaseConfigured) {
      return res.status(503).json({ error: 'Production database is not configured.' });
    }

    const {
      customerName, customerPhone, customerEmail, deliveryLocation,
      deliveryCounty, deliveryTown, deliveryEstate, deliveryLandmark,
      deliveryInstructions, zoneId, deliveryZoneId, paymentMethod, items
    } = req.body;

    const location = typeof deliveryLocation === 'object' && deliveryLocation !== null
      ? {
          county: deliveryLocation.county || deliveryCounty || 'Uasin Gishu',
          town: deliveryLocation.town || deliveryTown || '',
          estate: deliveryLocation.estate || deliveryEstate || '',
          landmark: deliveryLocation.landmark || deliveryLandmark || '',
          instructions: deliveryLocation.instructions || deliveryInstructions || ''
        }
      : {
          county: deliveryCounty || 'Uasin Gishu',
          town: deliveryTown || (typeof deliveryLocation === 'string' ? deliveryLocation : ''),
          estate: deliveryEstate || (typeof deliveryLocation === 'string' ? deliveryLocation : ''),
          landmark: deliveryLandmark || '',
          instructions: deliveryInstructions || ''
        };

    if (!location.town && !location.estate) {
      return res.status(400).json({ error: 'Please provide complete delivery details (Town and Estate).' });
    }
    if (!location.town) location.town = location.estate;
    if (!location.estate) location.estate = location.town;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Please add products to your cart.' });
    }

    const normalizedItems = items.map((item: any) => ({
      productId: String(item.productId),
      quantity: Number(item.quantity)
    }));

    const { data, error } = await serverSupabase.rpc('place_order', {
      p_customer_id: req.user?.id || null,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_email: customerEmail || null,
      p_county: location.county,
      p_town: location.town,
      p_estate: location.estate,
      p_landmark: location.landmark || null,
      p_instructions: location.instructions || null,
      p_delivery_zone_id: deliveryZoneId || zoneId || 'zone-eldoret-cbd',
      p_payment_method: paymentMethod === 'MPESA_ON_DELIVERY' ? 'MPESA_ON_DELIVERY' : 'CASH_ON_DELIVERY',
      p_items: normalizedItems
    });

    if (error) {
      const message = error.message || 'Failed to place order.';
      const clientError = message.replace(/^ERROR:\s*/i, '').split('\n')[0];
      return res.status(400).json({ error: clientError });
    }

    const order = await loadOrder(data.order_id);
    if (!order) return res.status(500).json({ error: 'Order was created but could not be loaded.' });

    return res.status(201).json({ message: 'Order received successfully!', order });
  } catch (err: any) {
    console.error('[checkout]', err);
    return res.status(500).json({ error: err.message || 'Error processing checkout.' });
  }
};

orderRouter.post('/checkout', optionalAuth, handleCheckout);
orderRouter.post('/', optionalAuth, handleCheckout);

orderRouter.get('/track/:query', async (req, res) => {
  try {
    const clean = req.params.query.trim();
    let order = await loadOrderByNumber(clean);

    if (!order) {
      order = await loadOrder(clean);
    }

    if (!order) {
      const normalized = clean.replace(/\s+/g, '');
      const { data: rows, error } = await serverSupabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const match = (rows || []).find((r: any) => r.customer_phone.replace(/\s+/g, '') === normalized);
      if (match) order = await loadOrder(match.id);
    }

    if (!order) return res.status(404).json({ error: `No order found for "${clean}". Please check your order number or phone number.` });
    return res.json({ order });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error tracking order.' });
  }
});

orderRouter.get('/my-orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: rows, error } = await serverSupabase.from('orders').select('*').eq('customer_id', req.user!.id).order('created_at', { ascending: false });
    if (error) throw error;
    const orders = await Promise.all((rows || []).map((r: any) => loadOrder(r.id)));
    return res.json({ orders: orders.filter(Boolean) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error loading orders.' });
  }
});

orderRouter.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const order = await loadOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (req.user && req.user.role === 'customer' && order.customerId && order.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this order.' });
    }

    return res.json({ order });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error loading order.' });
  }
});
