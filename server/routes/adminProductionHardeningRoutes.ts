import { Router } from 'express';
import { requireAdmin } from '../auth';
import { serverSupabase } from '../supabase';

export const adminProductionHardeningRouter = Router();
adminProductionHardeningRouter.use(requireAdmin);

const ORDER_STATUS_FLOW: Record<string, string[]> = {
  ORDER_RECEIVED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

adminProductionHardeningRouter.get('/analytics', async (_req, res) => {
  try {
    const [{ data: orders, error: ordersError }, { data: products, error: productsError }] = await Promise.all([
      serverSupabase.from('orders').select('id,total,status,payment_status,created_at'),
      serverSupabase.from('products').select('id,stock_quantity,low_stock_threshold,is_active')
    ]);
    if (ordersError) throw ordersError;
    if (productsError) throw productsError;

    const rows = orders || [];
    const activeProducts = (products || []).filter((p: any) => p.is_active);
    const lowStockProducts = activeProducts.filter((p: any) => Number(p.stock_quantity) <= Number(p.low_stock_threshold));
    const revenue = rows.filter((o: any) => o.status !== 'CANCELLED' && o.payment_status !== 'REFUNDED')
      .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);

    res.json({
      totalOrders: rows.length,
      totalRevenue: revenue,
      pendingOrders: rows.filter((o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
      deliveredOrders: rows.filter((o: any) => o.status === 'DELIVERED').length,
      cancelledOrders: rows.filter((o: any) => o.status === 'CANCELLED').length,
      activeProducts: activeProducts.length,
      lowStockProducts: lowStockProducts.length,
      generatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error loading analytics.' });
  }
});

adminProductionHardeningRouter.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    if (typeof status !== 'string' || !Object.prototype.hasOwnProperty.call(ORDER_STATUS_FLOW, status)) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }

    const { data: current, error: currentError } = await serverSupabase
      .from('orders').select('id,status,status_history').eq('id', req.params.id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return res.status(404).json({ error: 'Order not found.' });

    const allowedNext = ORDER_STATUS_FLOW[current.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(409).json({ error: `Invalid order status transition from ${current.status} to ${status}.` });
    }

    const history = Array.isArray(current.status_history) ? current.status_history : [];
    const updatedHistory = [...history, {
      status,
      timestamp: new Date().toISOString(),
      note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : `Order status changed to ${status}.`
    }];

    const { data: updated, error: updateError } = await serverSupabase.from('orders').update({
      status,
      status_history: updatedHistory,
      updated_at: new Date().toISOString()
    }).eq('id', req.params.id).eq('status', current.status).select('id,status');

    if (updateError) throw updateError;
    if (!updated || updated.length !== 1) {
      return res.status(409).json({ error: 'The order changed while you were updating it. Reload the order and try again.' });
    }

    res.json({ message: 'Order status updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating order status.' });
  }
});
