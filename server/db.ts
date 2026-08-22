import bcrypt from 'bcryptjs';
import {
  DatabaseSchema,
  User,
  Product,
  Category,
  Order,
  DeliveryZone,
  BusinessSettings,
  Review,
  AdminNotification,
  OrderStatus
} from './types';
import {
  initialCategories,
  initialDeliveryZones,
  initialBusinessSettings,
  initialProducts
} from './seedData';
import { serverSupabase, isServerSupabaseConfigured } from './supabase';

// Event subscriber broadcast list for Realtime fallback
type EventClient = (data: { event: string; payload: any }) => void;
const eventClients: Set<EventClient> = new Set();

export function broadcastEvent(event: string, payload: any) {
  // If Supabase is configured, broadcast via Supabase Realtime channel
  if (isServerSupabaseConfigured) {
    try {
      serverSupabase.channel('megacity-realtime').send({
        type: 'broadcast',
        event,
        payload
      });
    } catch (e) {
      console.warn('Supabase Realtime broadcast exception:', e);
    }
  }

  // Also notify in-app subscribers
  eventClients.forEach((client) => {
    try {
      client({ event, payload });
    } catch (e) {
      console.error('Failed to dispatch event', e);
    }
  });
}

export function registerEventClient(client: EventClient): () => void {
  eventClients.add(client);
  return () => {
    eventClients.delete(client);
  };
}

export const registerSSEClient = registerEventClient;

class Database {
  private inMemoryData: DatabaseSchema;
  private orderSequenceCounter = 104;

  constructor() {
    this.inMemoryData = {
      users: [
        {
          id: 'usr-admin-01',
          name: 'Store Manager',
          email: 'admin@megacity.co.ke',
          phone: '0741775878',
          role: 'admin',
          passwordHash: bcrypt.hashSync('Admin@MegaCity2026!', 10),
          savedAddresses: [],
          createdAt: new Date().toISOString()
        }
      ],
      categories: [...initialCategories],
      products: [...initialProducts],
      orders: [],
      deliveryZones: [...initialDeliveryZones],
      reviews: [
        {
          id: 'rev-01',
          productId: 'prod-tv-01',
          customerName: 'Emmanuel Koech',
          rating: 5,
          comment: 'Delivered to my house in West Indies Eldoret within 2 hours. Cash on delivery was super smooth. The TV picture is very bright and Netflix is super fast!',
          verifiedPurchase: true,
          createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
        },
        {
          id: 'rev-02',
          productId: 'prod-aud-01',
          customerName: 'Dennis Wanyama',
          rating: 5,
          comment: 'Bass inarindima safi sana! The Vitron subwoofer has heavy sound and Bluetooth connects instantly. Best electronics shop along Zion Mall.',
          verifiedPurchase: true,
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
        },
        {
          id: 'rev-03',
          productId: 'prod-kit-01',
          customerName: 'Mercy Jebet',
          rating: 5,
          comment: 'Silver crest blender crushes everything even ice and dry beans. Original quality, not the fake ones. I recommend Mega City 100%.',
          verifiedPurchase: true,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        }
      ],
      wishlists: {},
      settings: { ...initialBusinessSettings },
      notifications: [
        {
          id: 'notif-01',
          title: 'System Initialized',
          message: 'Mega City Electronics production architecture active.',
          type: 'system',
          read: true,
          createdAt: new Date().toISOString()
        }
      ]
    };
  }

  // ================= USERS =================
  public getUsers(): User[] {
    return this.inMemoryData.users;
  }

  public getUserById(id: string): User | undefined {
    return this.inMemoryData.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.inMemoryData.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  }

  public createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const id = `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newUser: User = {
      ...userData,
      id,
      createdAt: new Date().toISOString()
    };
    this.inMemoryData.users.push(newUser);
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const user = this.inMemoryData.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    return user;
  }

  // ================= PRODUCTS =================
  public getProducts(params?: {
    categoryId?: string;
    subcategory?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    featured?: boolean;
    isHotDeal?: boolean;
    inStockOnly?: boolean;
    search?: string;
    sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating';
    limit?: number;
    offset?: number;
  }): { products: Product[]; total: number } {
    let list = this.inMemoryData.products.filter((p) => p.isActive);

    if (params?.categoryId) {
      list = list.filter((p) => p.categoryId === params.categoryId);
    }

    if (params?.subcategory) {
      list = list.filter((p) => p.subcategory.toLowerCase() === params.subcategory!.toLowerCase());
    }

    if (params?.brand) {
      list = list.filter((p) => p.brand.toLowerCase() === params.brand!.toLowerCase());
    }

    if (params?.minPrice !== undefined) {
      list = list.filter((p) => p.price >= params.minPrice!);
    }

    if (params?.maxPrice !== undefined) {
      list = list.filter((p) => p.price <= params.maxPrice!);
    }

    if (params?.featured !== undefined) {
      list = list.filter((p) => p.featured === params.featured);
    }

    if (params?.isHotDeal !== undefined) {
      list = list.filter((p) => p.isHotDeal === params.isHotDeal);
    }

    if (params?.inStockOnly) {
      list = list.filter((p) => p.stockQuantity > 0);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      });
    }

    // Sorting
    if (params?.sort === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (params?.sort === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (params?.sort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (params?.sort === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else {
      list.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        if (a.isHotDeal && !b.isHotDeal) return -1;
        if (!a.isHotDeal && b.isHotDeal) return 1;
        return 0;
      });
    }

    const total = list.length;
    const offset = params?.offset || 0;
    const limit = params?.limit || 100;
    const paginated = list.slice(offset, offset + limit);

    return { products: paginated, total };
  }

  public getProductById(id: string): Product | undefined {
    return this.inMemoryData.products.find((p) => p.id === id);
  }

  public getProductBySlug(slug: string): Product | undefined {
    return this.inMemoryData.products.find((p) => p.slug === slug);
  }

  public createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.inMemoryData.products.unshift(newProduct);
    broadcastEvent('product:created', newProduct);
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const idx = this.inMemoryData.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const old = this.inMemoryData.products[idx];
    const updated: Product = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updated.compareAtPrice && updated.compareAtPrice > updated.price) {
      updated.discountPercent = Math.round(((updated.compareAtPrice - updated.price) / updated.compareAtPrice) * 100);
    }

    this.inMemoryData.products[idx] = updated;
    broadcastEvent('product:updated', updated);

    if (updated.stockQuantity <= updated.lowStockThreshold) {
      this.createNotification({
        title: 'Low Stock Alert',
        message: `${updated.name} has only ${updated.stockQuantity} units left in stock!`,
        type: 'stock'
      });
    }

    return updated;
  }

  public deleteProduct(id: string): boolean {
    const idx = this.inMemoryData.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.inMemoryData.products.splice(idx, 1);
    broadcastEvent('product:deleted', { id });
    return true;
  }

  // ================= CATEGORIES =================
  public getCategories(): Category[] {
    return this.inMemoryData.categories;
  }

  public getCategoryBySlug(slug: string): Category | undefined {
    return this.inMemoryData.categories.find((c) => c.slug === slug);
  }

  // ================= ORDERS & CHECKOUT =================
  public getOrders(filters?: { status?: OrderStatus; customerId?: string }): Order[] {
    let orders = [...this.inMemoryData.orders];
    if (filters?.status) {
      orders = orders.filter((o) => o.status === filters.status);
    }
    if (filters?.customerId) {
      orders = orders.filter((o) => o.customerId === filters.customerId);
    }
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderById(id: string): Order | undefined {
    return this.inMemoryData.orders.find((o) => o.id === id);
  }

  public getOrderByNumber(orderNumber: string): Order | undefined {
    return this.inMemoryData.orders.find((o) => o.orderNumber.toUpperCase() === orderNumber.toUpperCase().trim());
  }

  public generateOrderNumber(): string {
    this.orderSequenceCounter += 1;
    const seqStr = String(this.orderSequenceCounter).padStart(6, '0');
    return `MC-2026-${seqStr}`;
  }

  /**
   * Authoritative Server-Side Checkout
   * Validates product existence, fetches authoritative prices directly from DB,
   * calculates subtotal and delivery fee, validates stock, reduces stock atomically, and generates order.
   */
  public createOrder(data: {
    customerId?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    deliveryLocation: {
      county: string;
      town: string;
      estate: string;
      landmark?: string;
      instructions?: string;
    };
    deliveryZoneId: string;
    paymentMethod: 'CASH_ON_DELIVERY' | 'MPESA_ON_DELIVERY';
    items: { productId: string; quantity: number }[];
  }): { success: boolean; order?: Order; error?: string } {
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Cannot checkout with an empty cart.' };
    }

    if (!data.customerName || !data.customerPhone || !data.deliveryLocation.town || !data.deliveryLocation.estate) {
      return { success: false, error: 'Please provide complete name, phone number, and delivery address.' };
    }

    const zone = this.inMemoryData.deliveryZones.find((z) => z.id === data.deliveryZoneId) || this.inMemoryData.deliveryZones[0];
    
    // Authoritative Item & Price Verification directly from DB
    const resolvedItems: Order['items'] = [];
    let subtotal = 0;

    for (const itemReq of data.items) {
      const product = this.getProductById(itemReq.productId);
      if (!product || !product.isActive) {
        return { success: false, error: `Product is unavailable or no longer in catalog.` };
      }

      if (product.stockQuantity < itemReq.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${product.name}". Only ${product.stockQuantity} unit(s) remaining.`
        };
      }

      const itemPrice = product.price; // authoritative price directly from database
      const itemSubtotal = itemPrice * itemReq.quantity;
      subtotal += itemSubtotal;

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        image: product.images[0] || '',
        priceSnapshot: itemPrice,
        quantity: itemReq.quantity,
        subtotal: itemSubtotal
      });
    }

    // Delivery fee computation
    let deliveryFee = zone.fee;
    if (zone.freeThreshold !== undefined && zone.freeThreshold !== null && subtotal >= zone.freeThreshold) {
      deliveryFee = 0;
    }

    const total = subtotal + deliveryFee;
    const now = new Date().toISOString();
    const orderNumber = this.generateOrderNumber();
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId: data.customerId,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      customerEmail: data.customerEmail?.trim(),
      deliveryLocation: data.deliveryLocation,
      deliveryZoneId: zone.id,
      deliveryZoneName: zone.name,
      deliveryFee,
      subtotal,
      total,
      paymentMethod: data.paymentMethod,
      status: 'ORDER_RECEIVED',
      statusHistory: [
        {
          status: 'ORDER_RECEIVED',
          timestamp: now,
          note: `Order placed successfully via ${data.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : 'M-Pesa on Delivery'}.`
        }
      ],
      items: resolvedItems,
      createdAt: now,
      updatedAt: now
    };

    // Deduct stock safely (atomic in-memory / db operation)
    for (const it of resolvedItems) {
      const prod = this.getProductById(it.productId);
      if (prod) {
        prod.stockQuantity = Math.max(0, prod.stockQuantity - it.quantity);
        if (prod.stockQuantity <= prod.lowStockThreshold) {
          this.createNotification({
            title: 'Low Stock Alert',
            message: `${prod.name} has only ${prod.stockQuantity} items remaining.`,
            type: 'stock'
          });
        }
      }
    }

    this.inMemoryData.orders.unshift(newOrder);

    // Create Admin Notification
    this.createNotification({
      title: `🔔 New Order #${newOrder.orderNumber}`,
      message: `${newOrder.customerName} (${newOrder.customerPhone}) ordered ${newOrder.items.length} item(s) for KSh ${newOrder.total.toLocaleString()} - ${newOrder.paymentMethod}.`,
      type: 'order',
      orderId: newOrder.id
    });

    // Broadcast Realtime events
    broadcastEvent('order:created', newOrder);
    broadcastEvent('inventory:updated', {
      items: resolvedItems.map((it) => ({ productId: it.productId, remainingStock: this.getProductById(it.productId)?.stockQuantity }))
    });

    return { success: true, order: newOrder };
  }

  public updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Order | null {
    const order = this.inMemoryData.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Order status updated to ${status.replace(/_/g, ' ')}.`
    });

    broadcastEvent('order:status_updated', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      history: order.statusHistory
    });

    return order;
  }

  // ================= NOTIFICATIONS =================
  public getNotifications(): AdminNotification[] {
    return this.inMemoryData.notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(data: { title: string; message: string; type: AdminNotification['type']; orderId?: string }) {
    const notif: AdminNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: data.title,
      message: data.message,
      type: data.type,
      read: false,
      orderId: data.orderId,
      createdAt: new Date().toISOString()
    };
    this.inMemoryData.notifications.unshift(notif);
    if (this.inMemoryData.notifications.length > 100) {
      this.inMemoryData.notifications.pop();
    }
    broadcastEvent('notification:created', notif);
  }

  public markNotificationRead(id: string): boolean {
    const notif = this.inMemoryData.notifications.find((n) => n.id === id);
    if (!notif) return false;
    notif.read = true;
    return true;
  }

  public markAllNotificationsRead(): void {
    this.inMemoryData.notifications.forEach((n) => (n.read = true));
  }

  // ================= REVIEWS =================
  public getReviews(productId?: string): Review[] {
    if (productId) {
      return this.inMemoryData.reviews
        .filter((r) => r.productId === productId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.inMemoryData.reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addReview(reviewData: { productId: string; customerId?: string; customerName: string; rating: number; comment: string }): Review {
    // Only mark verified if customer has an actual delivered order containing this product
    let verifiedPurchase = false;
    if (reviewData.customerId) {
      const customerOrders = this.inMemoryData.orders.filter((o) => o.customerId === reviewData.customerId && o.status === 'DELIVERED');
      verifiedPurchase = customerOrders.some((o) => o.items.some((it) => it.productId === reviewData.productId));
    }

    const id = `rev-${Date.now()}`;
    const newRev: Review = {
      ...reviewData,
      id,
      verifiedPurchase,
      createdAt: new Date().toISOString()
    };
    this.inMemoryData.reviews.unshift(newRev);

    // Recalculate product average rating
    const prodReviews = this.inMemoryData.reviews.filter((r) => r.productId === reviewData.productId);
    const avg = prodReviews.reduce((acc, r) => acc + r.rating, 0) / prodReviews.length;
    const prod = this.getProductById(reviewData.productId);
    if (prod) {
      prod.rating = Number(avg.toFixed(1));
      prod.reviewCount = prodReviews.length;
    }

    broadcastEvent('review:created', newRev);
    return newRev;
  }

  // ================= SETTINGS & DELIVERY ZONES =================
  public getSettings(): BusinessSettings {
    return this.inMemoryData.settings;
  }

  public updateSettings(settings: Partial<BusinessSettings>): BusinessSettings {
    this.inMemoryData.settings = {
      ...this.inMemoryData.settings,
      ...settings
    };
    broadcastEvent('settings:updated', this.inMemoryData.settings);
    return this.inMemoryData.settings;
  }

  public getDeliveryZones(): DeliveryZone[] {
    return this.inMemoryData.deliveryZones;
  }

  public updateDeliveryZones(zones: DeliveryZone[]): DeliveryZone[] {
    this.inMemoryData.deliveryZones = zones;
    return this.inMemoryData.deliveryZones;
  }

  // ================= ANALYTICS & STATS =================
  public getAnalytics() {
    const orders = this.inMemoryData.orders;
    const products = this.inMemoryData.products;

    const totalRevenue = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total, 0);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayOrders = orders.filter((o) => o.createdAt.startsWith(todayStr));
    const todayRevenue = todayOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total, 0);

    const pendingOrders = orders.filter((o) => o.status === 'ORDER_RECEIVED' || o.status === 'CONFIRMED').length;
    const processingOrders = orders.filter((o) => o.status === 'PROCESSING' || o.status === 'READY_FOR_DELIVERY' || o.status === 'OUT_FOR_DELIVERY').length;
    const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length;

    const lowStockProducts = products.filter((p) => p.stockQuantity <= p.lowStockThreshold);
    const outOfStockProducts = products.filter((p) => p.stockQuantity === 0);

    const categorySales: Record<string, number> = {};
    orders
      .filter((o) => o.status !== 'CANCELLED')
      .forEach((o) => {
        o.items.forEach((it) => {
          const prod = this.getProductById(it.productId);
          const cat = prod?.categoryName || 'Other';
          categorySales[cat] = (categorySales[cat] || 0) + it.subtotal;
        });
      });

    const categorySalesChart = Object.entries(categorySales).map(([name, value]) => ({
      name,
      value
    }));

    const dailySalesMap: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
      dailySalesMap[key] = { date: dayName, revenue: 0, orders: 0 };
    }

    orders.forEach((o) => {
      const key = o.createdAt.split('T')[0];
      if (dailySalesMap[key]) {
        dailySalesMap[key].orders += 1;
        if (o.status !== 'CANCELLED') {
          dailySalesMap[key].revenue += o.total;
        }
      }
    });

    const dailySalesChart = Object.values(dailySalesMap);

    return {
      totalRevenue,
      todayRevenue,
      totalOrders: orders.length,
      todayOrdersCount: todayOrders.length,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      totalCustomers: new Set(orders.map((o) => o.customerPhone)).size,
      categorySalesChart,
      dailySalesChart,
      lowStockProducts: lowStockProducts.slice(0, 8),
      recentOrders: orders.slice(0, 6)
    };
  }
}

export const db = new Database();
