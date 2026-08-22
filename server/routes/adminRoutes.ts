import { Router, Response } from 'express';
import { db } from '../db';
import { requireAdmin, AuthRequest } from '../auth';

export const adminRouter = Router();

// Protect ALL routes in this router with requireAdmin
adminRouter.use(requireAdmin);

// Analytics Dashboard Summary
adminRouter.get('/analytics', (_req, res) => {
  const analytics = db.getAnalytics();
  res.json(analytics);
});

// All Orders List (Admin View)
adminRouter.get('/orders', (req, res) => {
  const { status, customerId } = req.query;
  const orders = db.getOrders({
    status: status as any,
    customerId: customerId as string
  });
  res.json({ orders, total: orders.length });
});

// Single Order Detail (Admin View)
adminRouter.get('/orders/:id', (req, res) => {
  const order = db.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  res.json({ order });
});

// Update Order Status
adminRouter.patch('/orders/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const updated = db.updateOrderStatus(id, status, note);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({ message: 'Order status updated successfully.', order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating order status' });
  }
});

// Products List (Admin View including inactive)
adminRouter.get('/products', (_req, res) => {
  const result = db.getProducts({ limit: 500 });
  res.json(result);
});

// Create Product
adminRouter.post('/products', (req, res) => {
  try {
    const {
      name,
      slug,
      sku,
      brand,
      categoryId,
      categoryName,
      subcategory,
      description,
      price,
      compareAtPrice,
      stockQuantity,
      lowStockThreshold,
      warranty,
      featured,
      isHotDeal,
      isNew,
      isActive,
      images,
      specifications
    } = req.body;

    if (!name || !price || !categoryId || !sku) {
      return res.status(400).json({ error: 'Product name, price, category, and SKU are required.' });
    }

    const productSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const newProduct = db.createProduct({
      name: name.trim(),
      slug: productSlug,
      sku: sku.trim().toUpperCase(),
      brand: brand ? brand.trim() : 'Mega City',
      categoryId,
      categoryName: categoryName || 'Electronics',
      subcategory: subcategory || 'General',
      description: description || '',
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      discountPercent:
        compareAtPrice && compareAtPrice > price
          ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
          : undefined,
      stockQuantity: Number(stockQuantity ?? 10),
      lowStockThreshold: Number(lowStockThreshold ?? 3),
      warranty: warranty || '12 Months Official Warranty',
      featured: Boolean(featured),
      isHotDeal: Boolean(isHotDeal),
      isNew: Boolean(isNew),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80'],
      specifications: specifications || {},
      rating: 5.0,
      reviewCount: 0
    });

    res.status(201).json({ message: 'Product created successfully.', product: newProduct });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error creating product' });
  }
});

// Update Product
adminRouter.put('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = db.updateProduct(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({ message: 'Product updated successfully.', product: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating product' });
  }
});

// Delete Product
adminRouter.delete('/products/:id', (req, res) => {
  const success = db.deleteProduct(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json({ message: 'Product removed from catalog.' });
});

// Update Inventory / Quick Price Adjust
adminRouter.patch('/products/:id/quick-adjust', (req, res) => {
  try {
    const { id } = req.params;
    const { price, compareAtPrice, stockQuantity, isActive, isHotDeal, featured } = req.body;

    const updates: any = {};
    if (price !== undefined) updates.price = Number(price);
    if (compareAtPrice !== undefined) updates.compareAtPrice = compareAtPrice ? Number(compareAtPrice) : null;
    if (stockQuantity !== undefined) updates.stockQuantity = Number(stockQuantity);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (isHotDeal !== undefined) updates.isHotDeal = Boolean(isHotDeal);
    if (featured !== undefined) updates.featured = Boolean(featured);

    const updated = db.updateProduct(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({ message: 'Quick update applied.', product: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error adjusting product' });
  }
});

// Customers List
adminRouter.get('/customers', (_req, res) => {
  const customers = db.getUsers().filter((u) => u.role === 'customer');
  const customerList = customers.map((c) => {
    const customerOrders = db.getOrders({ customerId: c.id });
    const totalSpent = customerOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total, 0);

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      orderCount: customerOrders.length,
      totalSpent,
      createdAt: c.createdAt,
      latestOrder: customerOrders[0] || null
    };
  });

  res.json({ customers: customerList });
});

// Notifications
adminRouter.get('/notifications', (_req, res) => {
  res.json({ notifications: db.getNotifications() });
});

adminRouter.patch('/notifications/:id/read', (req, res) => {
  const success = db.markNotificationRead(req.params.id);
  res.json({ success });
});

adminRouter.post('/notifications/read-all', (_req, res) => {
  db.markAllNotificationsRead();
  res.json({ success: true });
});

// Delivery Zones CRUD
adminRouter.get('/delivery-zones', (_req, res) => {
  res.json({ zones: db.getDeliveryZones() });
});

adminRouter.put('/delivery-zones', (req, res) => {
  try {
    const { zones } = req.body;
    if (!Array.isArray(zones)) {
      return res.status(400).json({ error: 'Invalid zones data.' });
    }
    const updated = db.updateDeliveryZones(zones);
    res.json({ message: 'Delivery zones updated.', zones: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error saving zones' });
  }
});

// Business Settings
adminRouter.get('/settings', (_req, res) => {
  res.json({ settings: db.getSettings() });
});

adminRouter.put('/settings', (req, res) => {
  try {
    const settings = req.body;
    const updated = db.updateSettings(settings);
    res.json({ message: 'Business settings updated.', settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating settings' });
  }
});
