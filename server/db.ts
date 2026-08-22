import fs from 'fs';
import path from 'path';
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

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// SSE subscriber list
type SSEClient = (data: { event: string; payload: any }) => void;
const sseClients: Set<SSEClient> = new Set();

export function broadcastEvent(event: string, payload: any) {
  sseClients.forEach((client) => {
    try {
      client({ event, payload });
    } catch (e) {
      console.error('Failed to dispatch SSE event', e);
    }
  });
}

export function registerSSEClient(client: SSEClient): () => void {
  sseClients.add(client);
  return () => {
    sseClients.delete(client);
  };
}

class Database {
  private data: DatabaseSchema;
  private isInitialized = false;

  constructor() {
    this.data = this.loadOrInitialize();
  }

  private loadOrInitialize(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.products && parsed.users && parsed.orders) {
          this.isInitialized = true;
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading database file, reinitializing default:', err);
    }

    const defaultAdminHash = bcrypt.hashSync('Admin@MegaCity2026', 10);
    const defaultCustomerHash = bcrypt.hashSync('Customer@123', 10);

    const defaultUsers: User[] = [
      {
        id: 'user-admin-01',
        name: 'Mega City Store Manager',
        email: 'admin@megacity.co.ke',
        phone: '0741775878',
        role: 'admin',
        passwordHash: defaultAdminHash,
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-cust-01',
        name: 'James Kiprop',
        email: 'customer@megacity.co.ke',
        phone: '0712345678',
        role: 'customer',
        passwordHash: defaultCustomerHash,
        createdAt: new Date().toISOString(),
        savedAddresses: [
          {
            county: 'Uasin Gishu',
            town: 'Eldoret',
            estate: 'Pioneer Estate, Near Catholic Church',
            landmark: 'House #14 Blue Gate'
          }
        ]
      }
    ];

    // Seed initial realistic orders
    const defaultOrders: Order[] = [
      {
        id: 'ord-seed-01',
        orderNumber: 'MC-2026-000101',
        customerId: 'user-cust-01',
        customerName: 'James Kiprop',
        customerPhone: '0712345678',
        customerEmail: 'customer@megacity.co.ke',
        deliveryLocation: {
          county: 'Uasin Gishu',
          town: 'Eldoret',
          estate: 'Pioneer Estate',
          landmark: 'Near Catholic Church',
          instructions: 'Call upon arrival at the gate.'
        },
        deliveryZoneId: 'zone-eldoret-cbd',
        deliveryZoneName: 'Eldoret CBD & Surrounds',
        deliveryFee: 0,
        subtotal: 23499,
        total: 23499,
        paymentMethod: 'CASH_ON_DELIVERY',
        status: 'DELIVERED',
        statusHistory: [
          { status: 'ORDER_RECEIVED', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'Order placed by customer via Cash on Delivery.' },
          { status: 'CONFIRMED', timestamp: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(), note: 'Order confirmed by store manager.' },
          { status: 'PROCESSING', timestamp: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(), note: 'Packed with warranty seal.' },
          { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 86400000 * 2 + 7200000).toISOString(), note: 'Dispatched with rider John (0741775878).' },
          { status: 'DELIVERED', timestamp: new Date(Date.now() - 86400000 * 2 + 10800000).toISOString(), note: 'Delivered and cash collected.' }
        ],
        items: [
          {
            productId: 'prod-tv-02',
            productName: 'Vitron 43" Frameless 4K UHD Smart Google TV with Voice Remote',
            sku: 'MC-TV-VIT43G',
            image: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&auto=format&fit=crop&q=80',
            priceSnapshot: 23499,
            quantity: 1,
            subtotal: 23499
          }
        ],
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2 + 10800000).toISOString()
      },
      {
        id: 'ord-seed-02',
        orderNumber: 'MC-2026-000102',
        customerName: 'Faith Chebet',
        customerPhone: '0722998877',
        customerEmail: 'chebet.f@gmail.com',
        deliveryLocation: {
          county: 'Uasin Gishu',
          town: 'Eldoret',
          estate: 'Kapsoya Phase 2',
          landmark: 'Opposite Shell Kapsoya',
          instructions: 'Cash ready on delivery.'
        },
        deliveryZoneId: 'zone-eldoret-cbd',
        deliveryZoneName: 'Eldoret CBD & Surrounds',
        deliveryFee: 0,
        subtotal: 10398,
        total: 10398,
        paymentMethod: 'CASH_ON_DELIVERY',
        status: 'PROCESSING',
        statusHistory: [
          { status: 'ORDER_RECEIVED', timestamp: new Date(Date.now() - 7200000).toISOString(), note: 'Customer ordered online.' },
          { status: 'CONFIRMED', timestamp: new Date(Date.now() - 5400000).toISOString(), note: 'Store confirmed stock.' },
          { status: 'PROCESSING', timestamp: new Date(Date.now() - 3600000).toISOString(), note: 'Items being tested and packed.' }
        ],
        items: [
          {
            productId: 'prod-kit-03',
            productName: 'Sayona 6.5 Litres XXL Touchscreen Digital Air Fryer with 360 Hot Air Vortex',
            sku: 'MC-KIT-SAY-AF65',
            image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80',
            priceSnapshot: 6999,
            quantity: 1,
            subtotal: 6999
          },
          {
            productId: 'prod-kit-01',
            productName: 'Silver Crest 4500W Commercial Heavy Duty Multi-Speed Blender with Grinder Jar',
            sku: 'MC-KIT-SC4500',
            image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop&q=80',
            priceSnapshot: 3499,
            quantity: 1,
            subtotal: 3499
          }
        ],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'ord-seed-03',
        orderNumber: 'MC-2026-000103',
        customerName: 'Brian Omondi',
        customerPhone: '0799112233',
        deliveryLocation: {
          county: 'Trans Nzoia',
          town: 'Kitale',
          estate: 'Milimani Estate',
          landmark: 'Near Kitale Club',
          instructions: 'Send via parcel courier.'
        },
        deliveryZoneId: 'zone-rift-western',
        deliveryZoneName: 'Rift Valley & Western Kenya',
        deliveryFee: 450,
        subtotal: 4499,
        total: 4949,
        paymentMethod: 'CASH_ON_DELIVERY',
        status: 'ORDER_RECEIVED',
        statusHistory: [
          { status: 'ORDER_RECEIVED', timestamp: new Date(Date.now() - 1800000).toISOString(), note: 'New order waiting for store confirmation.' }
        ],
        items: [
          {
            productId: 'prod-aud-01',
            productName: 'Vitron V527 2.1CH Super Bass Bluetooth Multimedia Speaker System',
            sku: 'MC-AUD-VIT527',
            image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
            priceSnapshot: 4499,
            quantity: 1,
            subtotal: 4499
          }
        ],
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString()
      }
    ];

    const defaultReviews: Review[] = [
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
    ];

    const defaultNotifications: AdminNotification[] = [
      {
        id: 'notif-01',
        title: 'New Order Received',
        message: 'Order #MC-2026-000103 from Brian Omondi (KSh 4,949) waiting for confirmation.',
        type: 'order',
        read: false,
        orderId: 'ord-seed-03',
        createdAt: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: 'notif-02',
        title: 'Stock Alert',
        message: 'Vitron 43" 4K TV is down to 14 units.',
        type: 'stock',
        read: true,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    const initialDb: DatabaseSchema = {
      users: defaultUsers,
      categories: initialCategories,
      products: initialProducts,
      orders: defaultOrders,
      deliveryZones: initialDeliveryZones,
      reviews: defaultReviews,
      wishlists: {},
      settings: initialBusinessSettings,
      notifications: defaultNotifications
    };

    this.saveToFile(initialDb);
    this.isInitialized = true;
    return initialDb;
  }

  private saveToFile(dbData: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  private persist() {
    this.saveToFile(this.data);
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
    let list = this.data.products.filter((p) => p.isActive);

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
      // default: featured first, then hot deal, then newest
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
    return this.data.products.find((p) => p.id === id);
  }

  public getProductBySlug(slug: string): Product | undefined {
    return this.data.products.find((p) => p.slug === slug);
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

    this.data.products.unshift(newProduct);
    this.persist();
    broadcastEvent('product:created', newProduct);
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const old = this.data.products[idx];
    const updated: Product = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Calculate discount percent if prices change
    if (updated.compareAtPrice && updated.compareAtPrice > updated.price) {
      updated.discountPercent = Math.round(((updated.compareAtPrice - updated.price) / updated.compareAtPrice) * 100);
    }

    this.data.products[idx] = updated;
    this.persist();
    broadcastEvent('product:updated', updated);

    // Check low stock
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
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.data.products.splice(idx, 1);
    this.persist();
    broadcastEvent('product:deleted', { id });
    return true;
  }

  // ================= CATEGORIES =================
  public getCategories(): Category[] {
    return this.data.categories;
  }

  public getCategoryBySlug(slug: string): Category | undefined {
    return this.data.categories.find((c) => c.slug === slug);
  }

  // ================= ORDERS & CHECKOUT =================
  public getOrders(filters?: { status?: OrderStatus; customerId?: string }): Order[] {
    let orders = [...this.data.orders];
    if (filters?.status) {
      orders = orders.filter((o) => o.status === filters.status);
    }
    if (filters?.customerId) {
      orders = orders.filter((o) => o.customerId === filters.customerId);
    }
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id);
  }

  public getOrderByNumber(orderNumber: string): Order | undefined {
    return this.data.orders.find((o) => o.orderNumber.toUpperCase() === orderNumber.toUpperCase().trim());
  }

  public generateOrderNumber(): string {
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    return `MC-2026-${randomSeq}`;
  }

  /**
   * Authoritative Server-Side Checkout
   * Validates product existence, fetches authoritative prices directly from DB,
   * calculates subtotal and delivery fee, validates stock, reduces stock, and generates order.
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

    const zone = this.data.deliveryZones.find((z) => z.id === data.deliveryZoneId) || this.data.deliveryZones[0];
    
    // Authoritative Item & Price Verification
    const resolvedItems: Order['items'] = [];
    let subtotal = 0;

    for (const itemReq of data.items) {
      const product = this.getProductById(itemReq.productId);
      if (!product || !product.isActive) {
        return { success: false, error: `Product not found or currently unavailable.` };
      }

      if (product.stockQuantity < itemReq.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${product.name}". Only ${product.stockQuantity} remaining.`
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
    if (zone.freeThreshold && subtotal >= zone.freeThreshold) {
      deliveryFee = 0;
    }

    const total = subtotal + deliveryFee;
    const now = new Date().toISOString();
    const orderNumber = this.generateOrderNumber();
    const orderId = `ord-${Date.now()}`;

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

    // Deduct stock safely
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

    this.data.orders.unshift(newOrder);

    // Create Admin Notification
    this.createNotification({
      title: `🔔 New Order #${newOrder.orderNumber}`,
      message: `${newOrder.customerName} (${newOrder.customerPhone}) ordered ${newOrder.items.length} item(s) for KSh ${newOrder.total.toLocaleString()} - ${newOrder.paymentMethod}.`,
      type: 'order',
      orderId: newOrder.id
    });

    this.persist();

    // Broadcast Real-time event to Admin & Client
    broadcastEvent('order:created', newOrder);
    broadcastEvent('inventory:updated', {
      items: resolvedItems.map((it) => ({ productId: it.productId, remainingStock: this.getProductById(it.productId)?.stockQuantity }))
    });

    return { success: true, order: newOrder };
  }

  public updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Order | null {
    const order = this.data.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Order status updated to ${status.replace(/_/g, ' ')}.`
    });

    this.persist();
    broadcastEvent('order:status_updated', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      history: order.statusHistory
    });

    return order;
  }

  // ================= USERS & AUTH =================
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const id = `user-${Date.now()}`;
    const newUser: User = {
      ...userData,
      id,
      createdAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.persist();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    this.persist();
    return user;
  }

  // ================= NOTIFICATIONS =================
  public getNotifications(): AdminNotification[] {
    return this.data.notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    this.data.notifications.unshift(notif);
    if (this.data.notifications.length > 100) {
      this.data.notifications.pop();
    }
    this.persist();
    broadcastEvent('notification:created', notif);
  }

  public markNotificationRead(id: string): boolean {
    const notif = this.data.notifications.find((n) => n.id === id);
    if (!notif) return false;
    notif.read = true;
    this.persist();
    return true;
  }

  public markAllNotificationsRead(): void {
    this.data.notifications.forEach((n) => (n.read = true));
    this.persist();
  }

  // ================= WISHLIST =================
  public getWishlist(customerId: string): string[] {
    return this.data.wishlists[customerId] || [];
  }

  public toggleWishlist(customerId: string, productId: string): string[] {
    const current = this.data.wishlists[customerId] || [];
    const index = current.indexOf(productId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(productId);
    }
    this.data.wishlists[customerId] = current;
    this.persist();
    return current;
  }

  // ================= REVIEWS =================
  public getReviews(productId?: string): Review[] {
    if (productId) {
      return this.data.reviews
        .filter((r) => r.productId === productId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.data.reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Review {
    const id = `rev-${Date.now()}`;
    const newRev: Review = {
      ...reviewData,
      id,
      createdAt: new Date().toISOString()
    };
    this.data.reviews.unshift(newRev);

    // Update product average rating
    const prodReviews = this.data.reviews.filter((r) => r.productId === reviewData.productId);
    const avg = prodReviews.reduce((acc, r) => acc + r.rating, 0) / prodReviews.length;
    const prod = this.getProductById(reviewData.productId);
    if (prod) {
      prod.rating = Number(avg.toFixed(1));
      prod.reviewCount = prodReviews.length;
    }

    this.persist();
    broadcastEvent('review:created', newRev);
    return newRev;
  }

  // ================= SETTINGS & DELIVERY ZONES =================
  public getSettings(): BusinessSettings {
    return this.data.settings;
  }

  public updateSettings(settings: Partial<BusinessSettings>): BusinessSettings {
    this.data.settings = {
      ...this.data.settings,
      ...settings
    };
    this.persist();
    broadcastEvent('settings:updated', this.data.settings);
    return this.data.settings;
  }

  public getDeliveryZones(): DeliveryZone[] {
    return this.data.deliveryZones;
  }

  public updateDeliveryZones(zones: DeliveryZone[]): DeliveryZone[] {
    this.data.deliveryZones = zones;
    this.persist();
    return this.data.deliveryZones;
  }

  // ================= ANALYTICS & STATS =================
  public getAnalytics() {
    const orders = this.data.orders;
    const products = this.data.products;
    const users = this.data.users.filter((u) => u.role === 'customer');

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

    // Sales by Category
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

    // Daily Sales (Last 7 days)
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
      totalCustomers: users.length,
      categorySalesChart,
      dailySalesChart,
      lowStockProducts: lowStockProducts.slice(0, 8),
      recentOrders: orders.slice(0, 6)
    };
  }
}

export const db = new Database();
