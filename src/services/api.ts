import {
  Product,
  Category,
  Order,
  DeliveryZone,
  BusinessSettings,
  Review,
  User,
  AdminNotification,
  OrderStatus
} from '../types';

const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('megacity_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'An error occurred with the request.');
  }
  return data;
}

export const api = {
  // Products & Catalog
  async getProducts(params?: {
    categoryId?: string;
    subcategory?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    featured?: boolean;
    isHotDeal?: boolean;
    inStockOnly?: boolean;
    search?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const res = await fetch(`${API_BASE}/products?${query.toString()}`);
    return handleResponse(res);
  },

  async getProduct(identifier: string): Promise<{ product: Product; related: Product[]; reviews: Review[] }> {
    const res = await fetch(`${API_BASE}/products/${encodeURIComponent(identifier)}`);
    return handleResponse(res);
  },

  async getCategories(): Promise<{ categories: Category[] }> {
    const res = await fetch(`${API_BASE}/categories`);
    return handleResponse(res);
  },

  async submitReview(productId: string, data: { customerName?: string; rating: number; comment: string }): Promise<{ message: string; review: Review }> {
    const res = await fetch(`${API_BASE}/products/${productId}/reviews`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getDeliveryZones(): Promise<{ zones: DeliveryZone[] }> {
    const res = await fetch(`${API_BASE}/delivery-zones`);
    return handleResponse(res);
  },

  async getSettings(): Promise<{ settings: BusinessSettings }> {
    const res = await fetch(`${API_BASE}/settings`);
    return handleResponse(res);
  },

  // Orders
  async checkout(orderData: {
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
  }): Promise<{ message: string; order: Order }> {
    const res = await fetch(`${API_BASE}/orders/checkout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData)
    });
    return handleResponse(res);
  },

  async trackOrder(query: string): Promise<{ order: Order }> {
    const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(query)}`);
    return handleResponse(res);
  },

  async getMyOrders(): Promise<{ orders: Order[] }> {
    const res = await fetch(`${API_BASE}/orders/my-orders`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Auth
  async login(credentials: { email: string; password: string; requireRole?: string }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(res);
  },

  async register(data: { name: string; email: string; phone: string; password: string }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateProfile(updates: Partial<User>): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },

  // Admin Endpoints
  async getAdminAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/analytics`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminOrders(status?: string): Promise<{ orders: Order[]; total: number }> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${API_BASE}/admin/orders${q}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<{ order: Order }> {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, note })
    });
    return handleResponse(res);
  },

  async createProduct(productData: Partial<Product>): Promise<{ product: Product }> {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });
    return handleResponse(res);
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<{ product: Product }> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },

  async quickAdjustProduct(id: string, updates: { price?: number; compareAtPrice?: number; stockQuantity?: number; isActive?: boolean; isHotDeal?: boolean; featured?: boolean }): Promise<{ product: Product }> {
    const res = await fetch(`${API_BASE}/admin/products/${id}/quick-adjust`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },

  async deleteProduct(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminCustomers(): Promise<{ customers: any[] }> {
    const res = await fetch(`${API_BASE}/admin/customers`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminNotifications(): Promise<{ notifications: AdminNotification[] }> {
    const res = await fetch(`${API_BASE}/admin/notifications`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`${API_BASE}/admin/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    await fetch(`${API_BASE}/admin/notifications/read-all`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  },

  async updateAdminSettings(settings: Partial<BusinessSettings>): Promise<{ settings: BusinessSettings }> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    });
    return handleResponse(res);
  },

  async updateDeliveryZones(zones: DeliveryZone[]): Promise<{ zones: DeliveryZone[] }> {
    const res = await fetch(`${API_BASE}/admin/delivery-zones`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ zones })
    });
    return handleResponse(res);
  }
};
