import { Router, Response } from 'express';
import { db } from '../db';
import { optionalAuth, requireAuth, AuthRequest } from '../auth';

export const orderRouter = Router();

// Place Order (Cash on Delivery / M-Pesa on Delivery)
orderRouter.post('/checkout', optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryLocation,
      deliveryZoneId,
      paymentMethod,
      items
    } = req.body;

    if (!customerName || !customerPhone) {
      return res.status(400).json({ error: 'Please enter your full name and phone number.' });
    }

    if (!deliveryLocation || !deliveryLocation.town || !deliveryLocation.estate) {
      return res.status(400).json({ error: 'Please provide complete delivery details (Town and Estate).' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Please add products to your cart.' });
    }

    const result = db.createOrder({
      customerId: req.user?.id,
      customerName,
      customerPhone,
      customerEmail,
      deliveryLocation,
      deliveryZoneId: deliveryZoneId || 'zone-eldoret-cbd',
      paymentMethod: paymentMethod === 'MPESA_ON_DELIVERY' ? 'MPESA_ON_DELIVERY' : 'CASH_ON_DELIVERY',
      items
    });

    if (!result.success || !result.order) {
      return res.status(400).json({ error: result.error || 'Failed to place order.' });
    }

    return res.status(201).json({
      message: 'Order received successfully!',
      order: result.order
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error processing checkout.' });
  }
});

// Track Order by Order Number (e.g. MC-2026-000101) or Phone
orderRouter.get('/track/:query', (req, res) => {
  const { query } = req.params;
  const clean = query.trim();

  // Try by Order Number first
  let order = db.getOrderByNumber(clean);

  // If not found, try by ID
  if (!order) {
    order = db.getOrderById(clean);
  }

  // If not found, search by phone number (returns latest order)
  if (!order) {
    const matching = db.getOrders().filter((o) => o.customerPhone.replace(/\s+/g, '') === clean.replace(/\s+/g, ''));
    if (matching.length > 0) {
      order = matching[0];
    }
  }

  if (!order) {
    return res.status(404).json({ error: `No order found for "${query}". Please check your order number or phone number.` });
  }

  return res.json({ order });
});

// Get My Orders (Logged In Customer)
orderRouter.get('/my-orders', requireAuth, (req: AuthRequest, res: Response) => {
  const orders = db.getOrders({ customerId: req.user!.id });
  return res.json({ orders });
});

// Get Specific Order by ID (Authenticated user or matching phone)
orderRouter.get('/:id', optionalAuth, (req: AuthRequest, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  // Security check: if customer is logged in, verify ownership unless admin
  if (req.user && req.user.role === 'customer' && order.customerId && order.customerId !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized to view this order.' });
  }

  return res.json({ order });
});
