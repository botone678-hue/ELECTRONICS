export type UserRole = 'customer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  savedAddresses?: {
    county: string;
    town: string;
    estate: string;
    landmark?: string;
  }[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  imageUrl: string;
  subcategories: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  warranty: string;
  featured: boolean;
  isHotDeal: boolean;
  isNew: boolean;
  isActive: boolean;
  images: string[];
  specifications: Record<string, string>;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'ORDER_RECEIVED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  image: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
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
  deliveryZoneName: string;
  deliveryFee: number;
  subtotal: number;
  total: number;
  paymentMethod: 'CASH_ON_DELIVERY' | 'MPESA_ON_DELIVERY';
  status: OrderStatus;
  statusHistory: OrderStatusHistoryItem[];
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  estimatedTime: string;
  minimumOrder: number;
  freeThreshold?: number;
  active: boolean;
}

export interface Review {
  id: string;
  productId: string;
  customerId?: string;
  customerName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  phone: string;
  whatsapp: string;
  location: string;
  businessHours: string;
  announcementText: string;
  freeDeliveryThreshold: number;
  acceptOrders: boolean;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'stock' | 'customer' | 'review' | 'system';
  read: boolean;
  orderId?: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  deliveryZones: DeliveryZone[];
  reviews: Review[];
  wishlists: Record<string, string[]>; // customerId -> productIds
  settings: BusinessSettings;
  notifications: AdminNotification[];
}
