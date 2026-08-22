import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  Users,
  Settings as SettingsIcon,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Truck,
  Phone,
  MessageCircle,
  Clock,
  Search,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Eye
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Order, Product, Category, DeliveryZone, OrderStatus, AdminNotification } from '../../types';
import { api } from '../../services/api';
import { useRealtime } from '../../hooks/useRealtime';

interface AdminDashboardProps {
  categories: Category[];
  onExitAdmin: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ categories, onExitAdmin }) => {
  const { user, isAdmin, login, logout } = useAuth();
  const { settings, refreshSettings } = useSettings();

  // Admin login form states (if not logged in as admin)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'products' | 'inventory' | 'customers' | 'zones' | 'settings'>('analytics');

  // Analytics & Data State
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Order Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusUpdateNote, setStatusUpdateNote] = useState('');

  // Product Modals
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');

  // Real-time SSE listener
  useRealtime({
    onOrderCreated: (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
      refreshAnalytics();
    },
    onOrderStatusUpdated: (updated) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.orderId ? { ...o, status: updated.status as OrderStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === updated.orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: updated.status as OrderStatus } : null));
      }
      refreshAnalytics();
    },
    onInventoryUpdated: () => {
      refreshProducts();
    }
  });

  const refreshAnalytics = async () => {
    try {
      const data = await api.getAdminAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshOrders = async () => {
    try {
      const data = await api.getAdminOrders();
      setOrders(data.orders);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshProducts = async () => {
    try {
      const data = await api.getProducts({ limit: 500 });
      setProducts(data.products);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        refreshAnalytics(),
        refreshOrders(),
        refreshProducts(),
        api.getAdminCustomers().then((res) => setCustomers(res.customers)),
        api.getAdminNotifications().then((res) => setNotifications(res.notifications)),
        api.getDeliveryZones().then((res) => setDeliveryZones(res.zones))
      ]);
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData();
    }
  }, [isAdmin]);

  // Admin Login Handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await login(adminEmail.trim(), adminPassword, 'admin');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid administrator credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Status transition handler
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await api.updateOrderStatus(orderId, newStatus, statusUpdateNote || undefined);
      setSelectedOrder(res.order);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      setStatusUpdateNote('');
      refreshAnalytics();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  // Quick Inline Adjust
  const handleQuickAdjust = async (productId: string, updates: any) => {
    try {
      const res = await api.quickAdjustProduct(productId, updates);
      setProducts((prev) => prev.map((p) => (p.id === productId ? res.product : p)));
    } catch (err: any) {
      alert(err.message || 'Could not update product');
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from store catalog?`)) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      refreshAnalytics();
    } catch (err: any) {
      alert(err.message || 'Could not delete product');
    }
  };

  // If not admin, show Admin Authentication Screen
  if (!isAdmin) {
    return (
      <div className="bg-[#09090b] text-zinc-100 min-h-[80vh] flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-sm w-full text-center space-y-4 shadow-xl font-mono">
          <div className="w-12 h-12 rounded bg-red-600/20 text-red-500 flex items-center justify-center mx-auto border border-red-500/30">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
              AUTHORIZED ACCESS ONLY
            </span>
            <h2 className="text-base sm:text-lg font-black text-zinc-100 tracking-tight mt-2 uppercase">MEGA CITY Control Center</h2>
            <p className="text-[11px] text-zinc-400 mt-1 font-sans">
              Sign in with management credentials to manage orders, catalog prices, stock, and delivery zones.
            </p>
          </div>

          {loginError && (
            <div className="p-2.5 bg-red-950 border border-red-800 text-red-300 rounded text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-3 text-left text-xs">
            <div>
              <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@megacity.co.ke"
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Admin Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded text-xs transition cursor-pointer uppercase"
            >
              {isLoggingIn ? 'VERIFYING...' : 'SIGN IN AS ADMINISTRATOR'}
            </button>
          </form>

          <div className="pt-1">
            <button onClick={onExitAdmin} className="text-[11px] text-zinc-400 hover:text-zinc-100 underline cursor-pointer">
              ← Return to Customer Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
    if (orderSearchQuery) {
      const q = orderSearchQuery.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.deliveryLocation.estate.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q)
    );
  });

  // Low stock products
  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.lowStockThreshold);

  // Revenue chart data
  const revenueChartData =
    analytics?.salesByDay?.map((d: any) => ({
      date: new Date(d.date).toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' }),
      revenue: d.revenue,
      orders: d.orderCount
    })) || [];

  const pieColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen pb-16 text-left font-sans">
      {/* Top Admin Navigation Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2.5">
            <span className="bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded tracking-wider">
              ADMIN
            </span>
            <div>
              <span className="font-bold text-sm text-zinc-100">MEGA CITY ELECTRONICS</span>
              <span className="text-[11px] text-zinc-400 ml-2 hidden sm:inline">Store Management Panel</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE SSE SYNC</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExitAdmin}
              className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-bold px-2.5 py-1.5 rounded transition flex items-center gap-1.5 border border-zinc-700"
            >
              <Eye className="w-3 h-3 text-red-400" />
              <span>VIEW STOREFRONT</span>
            </button>
            <button
              onClick={logout}
              className="bg-red-950 hover:bg-red-900 text-red-300 text-xs font-bold px-2.5 py-1.5 rounded transition"
            >
              SIGN OUT
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 sm:gap-4 overflow-x-auto text-xs font-mono font-bold">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 uppercase ${
              activeTab === 'analytics' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 uppercase ${
              activeTab === 'orders' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Customer Orders ({orders.length})</span>
            {analytics?.pendingOrders > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded font-black">
                {analytics.pendingOrders}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 uppercase ${
              activeTab === 'products' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Product Catalog ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 uppercase ${
              activeTab === 'inventory' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Stock & Alerts ({lowStockProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 uppercase ${
              activeTab === 'customers' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('zones')}
            className={`py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 uppercase ${
              activeTab === 'zones' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Delivery Zones</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 uppercase ${
              activeTab === 'settings' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Store Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* ===================== TAB 1: ANALYTICS ===================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 font-mono">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-1">
                <span className="text-[11px] text-zinc-400 font-bold uppercase">Total Revenue (Delivered)</span>
                <div className="text-xl font-black text-emerald-400">
                  KSh {analytics?.totalRevenue?.toLocaleString() || 0}
                </div>
                <div className="text-[10px] text-zinc-500 font-sans">Collected via Cash on Delivery</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-1">
                <span className="text-[11px] text-zinc-400 font-bold uppercase">Today's Revenue</span>
                <div className="text-xl font-black text-zinc-100">
                  KSh {analytics?.todayRevenue?.toLocaleString() || 0}
                </div>
                <div className="text-[10px] text-zinc-400 font-sans">{analytics?.todayOrders || 0} orders placed today</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-1">
                <span className="text-[11px] text-zinc-400 font-bold uppercase">Pending Dispatches</span>
                <div className="text-xl font-black text-amber-400">{analytics?.pendingOrders || 0}</div>
                <div className="text-[10px] text-zinc-400 font-sans">Awaiting packaging or delivery rider</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-1">
                <span className="text-[11px] text-zinc-400 font-bold uppercase">Low Stock Alerts</span>
                <div className="text-xl font-black text-red-500">{analytics?.lowStockCount || 0}</div>
                <div className="text-[10px] text-zinc-400 font-sans">Items under threshold at Zion Mall</div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Daily Sales Bar Chart */}
              <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-100 uppercase">7-Day Sales Trend (KSh)</h3>
                  <span className="text-[11px] text-zinc-400">Daily Revenue</span>
                </div>
                <div className="h-60 w-full font-mono">
                  {revenueChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                        <YAxis stroke="#71717a" fontSize={10} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                          labelStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="revenue" fill="#ef4444" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                      No sales data recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Status Breakdown Pie */}
              <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-lg space-y-3">
                <h3 className="font-bold text-xs sm:text-sm text-zinc-100 uppercase">Orders by Status</h3>
                <div className="space-y-2 pt-1 text-xs font-mono">
                  {analytics?.ordersByStatus &&
                    Object.entries(analytics.ordersByStatus).map(([st, count]: any, idx) => (
                      <div key={st} className="flex justify-between items-center bg-zinc-950 p-2 rounded border border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                          <span className="font-bold text-zinc-300 text-xs">{st.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="font-bold text-zinc-100">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: ORDERS MANAGEMENT ===================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4 font-mono">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800">
              <div className="relative flex-1 w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Search by order #, customer name, phone, estate..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded py-1.5 pl-8 pr-2.5 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
                <span className="text-zinc-400 font-bold whitespace-nowrap text-[11px] uppercase">Status:</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 outline-none cursor-pointer font-mono"
                >
                  <option value="all">All Statuses ({orders.length})</option>
                  <option value="ORDER_RECEIVED">Order Received</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="READY_FOR_DELIVERY">Ready for Delivery</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button
                  onClick={refreshOrders}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition"
                  title="Refresh Orders"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 font-bold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Order #</th>
                      <th className="p-3">Customer & Phone</th>
                      <th className="p-3">Delivery Destination</th>
                      <th className="p-3">Items</th>
                      <th className="p-3">Total Amount (COD)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-zinc-500">
                          No customer orders matching this criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-zinc-850/60 transition">
                          <td className="p-3 font-mono font-bold text-red-400">{ord.orderNumber}</td>
                          <td className="p-3">
                            <div className="font-bold text-zinc-100 font-sans">{ord.customerName}</div>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono">
                              <Phone className="w-3 h-3 text-red-500" />
                              <a href={`tel:${ord.customerPhone}`} className="hover:text-zinc-100">
                                {ord.customerPhone}
                              </a>
                            </div>
                          </td>
                          <td className="p-3 font-sans">
                            <div className="font-medium text-zinc-200 truncate max-w-[180px]">
                              {ord.deliveryLocation.estate}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {ord.deliveryLocation.town}, {ord.deliveryLocation.county}
                            </div>
                          </td>
                          <td className="p-3 font-mono">
                            {ord.items.length} {ord.items.length === 1 ? 'item' : 'items'}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-400 text-xs">
                            KSh {ord.total.toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                ord.status === 'DELIVERED'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : ord.status === 'CANCELLED'
                                  ? 'bg-red-950 text-red-400 border border-red-800'
                                  : ord.status === 'OUT_FOR_DELIVERY'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {ord.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold px-2.5 py-1 rounded text-xs transition uppercase"
                            >
                              MANAGE
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: PRODUCT CATALOG ===================== */}
        {activeTab === 'products' && (
          <div className="space-y-4 font-mono">
            {/* Top Product Controls */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800">
              <div className="relative flex-1 w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by product name, SKU, brand..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded py-1.5 pl-8 pr-2.5 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>

              <button
                onClick={() => setIsAddProductModalOpen(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow cursor-pointer self-start sm:self-auto uppercase"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD NEW PRODUCT</span>
              </button>
            </div>

            {/* Products Table with Quick Adjusters */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 font-bold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">SKU / Brand</th>
                      <th className="p-3">Selling Price (KSh)</th>
                      <th className="p-3">Stock Qty</th>
                      <th className="p-3">Badges</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-850/60 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={p.images[0]}
                              alt=""
                              className="w-10 h-10 object-cover rounded bg-zinc-950 border border-zinc-800 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-zinc-100 truncate max-w-xs font-sans text-xs">{p.name}</div>
                              <div className="text-[10px] text-zinc-400">{p.categoryName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-zinc-200 font-bold text-xs">{p.sku}</div>
                          <div className="text-[10px] text-red-400 font-bold uppercase">{p.brand}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              defaultValue={p.price}
                              onBlur={(e) => {
                                const newPrice = Number(e.target.value);
                                if (newPrice > 0 && newPrice !== p.price) {
                                  handleQuickAdjust(p.id, { price: newPrice });
                                }
                              }}
                              className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-emerald-400 font-bold outline-none focus:border-red-500 font-mono"
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              defaultValue={p.stockQuantity}
                              onBlur={(e) => {
                                const newStock = Number(e.target.value);
                                if (newStock >= 0 && newStock !== p.stockQuantity) {
                                  handleQuickAdjust(p.id, { stockQuantity: newStock });
                                }
                              }}
                              className={`w-14 bg-zinc-950 border rounded px-2 py-1 text-xs font-bold outline-none font-mono ${
                                p.stockQuantity <= p.lowStockThreshold
                                  ? 'border-amber-500 text-amber-400'
                                  : 'border-zinc-800 text-zinc-100'
                              }`}
                            />
                            {p.stockQuantity <= p.lowStockThreshold && (
                              <span className="text-[9px] text-amber-400 font-bold">LOW</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleQuickAdjust(p.id, { isHotDeal: !p.isHotDeal })}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                p.isHotDeal ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              Deal
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(p.id, { featured: !p.featured })}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                p.featured ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              Feat
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingProduct(p)}
                              className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition"
                              title="Edit product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1 bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 rounded transition"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: INVENTORY & LOW STOCK ===================== */}
        {activeTab === 'inventory' && (
          <div className="space-y-4 font-mono">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100 uppercase">Stock Depletion Watchlist</h3>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Products at or below low stock threshold. Refill stock quantities below to ensure uninterrupted
                    Cash on Delivery orders.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-zinc-900 border border-amber-900/60 p-3.5 rounded-lg space-y-2.5 flex flex-col justify-between"
                >
                  <div className="flex gap-2.5 items-center">
                    <img
                      src={prod.images[0]}
                      alt=""
                      className="w-12 h-12 object-cover rounded bg-zinc-950 border border-zinc-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-red-400 font-bold">{prod.sku}</span>
                      <h4 className="text-xs font-bold text-zinc-100 truncate font-sans">{prod.name}</h4>
                      <div className="text-[11px] text-amber-400 font-bold mt-0.5">
                        Stock: {prod.stockQuantity} units left (Threshold: {prod.lowStockThreshold})
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex gap-2">
                    <button
                      onClick={() => handleQuickAdjust(prod.id, { stockQuantity: prod.stockQuantity + 10 })}
                      className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold py-1 px-2 rounded uppercase transition cursor-pointer"
                    >
                      +10 Units (Refill)
                    </button>
                    <button
                      onClick={() => handleQuickAdjust(prod.id, { stockQuantity: prod.stockQuantity + 25 })}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-1 px-2 rounded uppercase transition cursor-pointer"
                    >
                      +25 Units
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 5: CUSTOMERS ===================== */}
        {activeTab === 'customers' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-lg font-mono">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 font-bold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Phone / Contact</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Total Orders</th>
                    <th className="p-3">Lifetime Spend (KSh)</th>
                    <th className="p-3">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-850/60 transition">
                      <td className="p-3 font-bold text-zinc-100 font-sans">{c.name}</td>
                      <td className="p-3">
                        <a href={`tel:${c.phone}`} className="text-red-400 hover:underline">
                          {c.phone}
                        </a>
                      </td>
                      <td className="p-3 text-zinc-400">{c.email}</td>
                      <td className="p-3 font-bold text-zinc-100">{c.orderCount}</td>
                      <td className="p-3 font-bold text-emerald-400">KSh {c.totalSpent.toLocaleString()}</td>
                      <td className="p-3 text-zinc-500">
                        {new Date(c.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 6: DELIVERY ZONES ===================== */}
        {activeTab === 'zones' && (
          <div className="space-y-4 font-mono">
            <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-lg space-y-3">
              <h3 className="font-bold text-xs sm:text-sm text-zinc-100 uppercase">Delivery Zone Pricing & Speeds</h3>
              <p className="text-[11px] text-zinc-400 font-sans">
                Configure delivery rates for Eldoret CBD, Rift Valley, and Nationwide courier corridors.
              </p>

              <div className="space-y-2">
                {deliveryZones.map((zone, zIdx) => (
                  <div
                    key={zone.id}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                  >
                    <div className="sm:col-span-4">
                      <span className="font-bold text-zinc-100 text-xs block">{zone.name}</span>
                      <span className="text-[10px] text-zinc-400">ID: {zone.id}</span>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[9px] text-zinc-500 uppercase block mb-0.5">Fee (KSh)</label>
                      <input
                        type="number"
                        value={zone.fee}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setDeliveryZones((prev) =>
                            prev.map((z, idx) => (idx === zIdx ? { ...z, fee: val } : z))
                          );
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-100 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[9px] text-zinc-500 uppercase block mb-0.5">Estimated Speed</label>
                      <input
                        type="text"
                        value={zone.estimatedTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDeliveryZones((prev) =>
                            prev.map((z, idx) => (idx === zIdx ? { ...z, estimatedTime: val } : z))
                          );
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-100 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 flex justify-end">
                      <span className="text-xs font-bold text-emerald-400">
                        {zone.fee === 0 ? 'FREE' : `KSh ${zone.fee}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={async () => {
                  try {
                    await api.updateDeliveryZones(deliveryZones);
                    alert('Delivery zones saved successfully!');
                  } catch (e: any) {
                    alert(e.message || 'Failed to save zones');
                  }
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded transition mt-2 uppercase cursor-pointer"
              >
                SAVE ALL DELIVERY ZONE CHANGES
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 7: STORE SETTINGS ===================== */}
        {activeTab === 'settings' && (
          <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-lg max-w-2xl space-y-3 font-mono">
            <h3 className="font-bold text-xs sm:text-sm text-zinc-100 pb-2 border-b border-zinc-800 uppercase">
              MEGA CITY Business Information
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api.updateAdminSettings(settings);
                  await refreshSettings();
                  alert('Store settings updated successfully!');
                } catch (err: any) {
                  alert(err.message || 'Failed to update settings');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Customer Service Hotline</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => (settings.phone = e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">WhatsApp Order Number</label>
                <input
                  type="text"
                  value={settings.whatsapp}
                  onChange={(e) => (settings.whatsapp = e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Showroom Physical Address</label>
                <input
                  type="text"
                  value={settings.location}
                  onChange={(e) => (settings.location = e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Announcement Banner Text</label>
                <input
                  type="text"
                  value={settings.announcementText}
                  onChange={(e) => (settings.announcementText = e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded transition uppercase cursor-pointer"
              >
                SAVE STORE SETTINGS
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ===================== ORDER MANAGEMENT MODAL ===================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg w-full max-w-xl p-4 sm:p-5 space-y-4 shadow-2xl animate-fadeIn text-left font-mono">
            <div className="flex justify-between items-start pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold">MANAGE ORDER</span>
                <h3 className="text-base font-mono font-black text-red-500">{selectedOrder.orderNumber}</h3>
                <div className="text-[10px] text-zinc-400">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-100 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Customer & Call Actions */}
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
              <div>
                <div className="font-bold text-zinc-100 text-xs font-sans">{selectedOrder.customerName}</div>
                <div className="text-[10px] text-zinc-400">
                  {selectedOrder.deliveryLocation.estate}, {selectedOrder.deliveryLocation.town} (
                  {selectedOrder.deliveryLocation.county})
                </div>
              </div>
              <div className="flex gap-1.5">
                <a
                  href={`tel:${selectedOrder.customerPhone}`}
                  className="bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold py-1.5 px-2.5 rounded flex items-center gap-1 uppercase"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/254${selectedOrder.customerPhone.replace(/^0/, '')}?text=${encodeURIComponent(
                    `Hello ${selectedOrder.customerName}, this is MEGA CITY ELECTRONICS regarding your Cash on Delivery order ${selectedOrder.orderNumber}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold py-1.5 px-2.5 rounded flex items-center gap-1 uppercase"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* 1-Click Status Workflow Transitions */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-300 block uppercase">Advance Order Status:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs font-bold">
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'CONFIRMED')}
                  className={`p-2 rounded border transition cursor-pointer text-left text-[11px] ${
                    selectedOrder.status === 'CONFIRMED'
                      ? 'bg-amber-950 border-amber-600 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  1. Confirm Order
                </button>
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'PROCESSING')}
                  className={`p-2 rounded border transition cursor-pointer text-left text-[11px] ${
                    selectedOrder.status === 'PROCESSING'
                      ? 'bg-amber-950 border-amber-600 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  2. Packaging
                </button>
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'READY_FOR_DELIVERY')}
                  className={`p-2 rounded border transition cursor-pointer text-left text-[11px] ${
                    selectedOrder.status === 'READY_FOR_DELIVERY'
                      ? 'bg-amber-950 border-amber-600 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  3. Assign Rider
                </button>
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'OUT_FOR_DELIVERY')}
                  className={`p-2 rounded border transition cursor-pointer text-left text-[11px] ${
                    selectedOrder.status === 'OUT_FOR_DELIVERY'
                      ? 'bg-blue-950 border-blue-600 text-blue-300'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  4. Out for Delivery
                </button>
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'DELIVERED')}
                  className={`p-2 rounded border transition cursor-pointer text-left text-[11px] ${
                    selectedOrder.status === 'DELIVERED'
                      ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                      : 'bg-emerald-900/60 border-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  ✓ Mark Delivered
                </button>
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'CANCELLED')}
                  className="p-2 rounded border border-red-900/60 bg-red-950/40 hover:bg-red-900 text-red-300 cursor-pointer text-left text-[11px]"
                >
                  ✕ Cancel Order
                </button>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-0.5">Optional note for status update:</label>
                <input
                  type="text"
                  value={statusUpdateNote}
                  onChange={(e) => setStatusUpdateNote(e.target.value)}
                  placeholder="e.g. Rider dispatched on Motorbike KME 123A (Phone 0700112233)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-1.5 border-t border-zinc-800 pt-2.5 text-xs">
              <span className="font-bold text-zinc-300 block text-[11px] uppercase">Ordered Products:</span>
              {selectedOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-zinc-300 text-xs">
                  <span>
                    {it.quantity}x {it.productName} ({it.sku})
                  </span>
                  <span className="font-bold text-zinc-100">KSh {it.subtotal.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-emerald-400 text-xs pt-1.5 border-t border-zinc-800">
                <span>Total Due on Arrival:</span>
                <span>KSh {selectedOrder.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== ADD / EDIT PRODUCT MODAL ===================== */}
      {(isAddProductModalOpen || editingProduct) && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setIsAddProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSaved={() => {
            setIsAddProductModalOpen(false);
            setEditingProduct(null);
            refreshProducts();
            refreshAnalytics();
          }}
        />
      )}
    </div>
  );
};

// Modal for Creating or Editing Products
const ProductFormModal: React.FC<{
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ product, categories, onClose, onSaved }) => {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [brand, setBrand] = useState(product?.brand || 'Vitron');
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || 'cat-tv');
  const [subcategory, setSubcategory] = useState(product?.subcategory || 'Smart TVs');
  const [price, setPrice] = useState(product?.price || 15000);
  const [compareAtPrice, setCompareAtPrice] = useState(product?.compareAtPrice || 18000);
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity || 10);
  const [warranty, setWarranty] = useState(product?.warranty || '12 Months Official Warranty');
  const [description, setDescription] = useState(product?.description || '');
  const [imageUrl, setImageUrl] = useState(product?.images[0] || '');
  const [isHotDeal, setIsHotDeal] = useState(product?.isHotDeal || false);
  const [featured, setFeatured] = useState(product?.featured || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const selectedCat = categories.find((c) => c.id === categoryId);

      const productPayload: any = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        brand: brand.trim(),
        categoryId,
        categoryName: selectedCat?.name || 'Electronics',
        subcategory,
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
        stockQuantity: Number(stockQuantity),
        warranty,
        description,
        isHotDeal,
        featured,
        images: imageUrl ? [imageUrl] : ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80']
      };

      if (product) {
        await api.updateProduct(product.id, productPayload);
      } else {
        await api.createProduct(productPayload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg w-full max-w-lg p-4 sm:p-5 space-y-3 shadow-2xl text-left max-h-[90vh] overflow-y-auto font-mono">
        <div className="flex justify-between items-center pb-2.5 border-b border-zinc-800">
          <h3 className="font-bold text-xs sm:text-sm text-zinc-100 uppercase">
            {product ? `Edit Product: ${product.name}` : 'Add New Product to Catalog'}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-100 text-xs">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
          <div>
            <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Product Title</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">SKU</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-mono"
              />
            </div>
            <div>
              <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Brand</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-mono"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Subcategory</label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Price (KSh)</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-emerald-400 font-bold font-mono"
              />
            </div>
            <div>
              <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Compare Price</label>
              <input
                type="number"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Stock Units</label>
              <input
                type="number"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-bold font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-mono"
            />
          </div>

          <div>
            <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Warranty Term</label>
            <input
              type="text"
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-mono"
            />
          </div>

          <div>
            <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Description</label>
            <textarea
              rows={2.5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-sans"
            />
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isHotDeal}
                onChange={(e) => setIsHotDeal(e.target.checked)}
                className="accent-red-600"
              />
              <span className="text-amber-400 font-bold text-xs uppercase">Mark as Hot Deal</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="accent-red-600"
              />
              <span className="text-zinc-100 font-bold text-xs uppercase">Mark as Featured</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded hover:text-zinc-100 text-xs uppercase transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xs uppercase transition cursor-pointer"
            >
              {isSaving ? 'SAVING...' : product ? 'UPDATE PRODUCT' : 'CREATE PRODUCT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
