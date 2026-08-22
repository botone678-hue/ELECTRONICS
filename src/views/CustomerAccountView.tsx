import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Package,
  Heart,
  MapPin,
  Phone,
  Mail,
  Truck,
  Trash2,
  ShoppingCart,
  ShieldCheck,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Order, Product, ActiveView } from '../types';
import { api } from '../services/api';

interface CustomerAccountViewProps {
  initialTab?: 'orders' | 'wishlist' | 'profile';
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: ActiveView, extra?: any) => void;
  onOpenAuthModal: () => void;
}

export const CustomerAccountView: React.FC<CustomerAccountViewProps> = ({
  initialTab = 'orders',
  products,
  onSelectProduct,
  onNavigate,
  onOpenAuthModal
}) => {
  const { user, logout, updateProfile } = useAuth();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'profile'>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      loadMyOrders();
    }
  }, [user]);

  const loadMyOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const data = await api.getMyOrders();
      setOrders(data.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Could not update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  // Wishlist Products
  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

  if (!user) {
    return (
      <div className="bg-[#09090b] text-zinc-100 min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500 mb-3">
          <UserIcon className="w-6 h-6" />
        </div>
        <h2 className="text-base sm:text-lg font-mono font-black mb-1 uppercase">Customer Account Portal</h2>
        <p className="text-xs text-zinc-400 max-w-md mb-4 leading-relaxed">
          Sign in or create an account to view your past orders, track real-time delivery status, and manage your wishlist.
        </p>
        <button
          onClick={onOpenAuthModal}
          className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs px-4 py-2 rounded transition"
        >
          SIGN IN / REGISTER
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen py-8 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <span className="text-red-500 font-mono font-bold text-[10px] uppercase tracking-wider">CUSTOMER PORTAL</span>
            <h1 className="text-base sm:text-xl font-mono font-black text-zinc-100 tracking-tight uppercase">Welcome, {user.name}</h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              {user.email} • {user.phone}
            </p>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-red-400 border border-zinc-800 text-xs font-mono font-bold px-3 py-1.5 rounded transition self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>SIGN OUT</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-800 gap-4 text-xs font-mono font-bold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer uppercase ${
              activeTab === 'orders' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>My Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer uppercase ${
              activeTab === 'wishlist' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Saved Wishlist ({wishlistProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer uppercase ${
              activeTab === 'profile' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profile & Addresses</span>
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-3 font-mono">
            {isLoadingOrders ? (
              <div className="p-8 text-center text-zinc-400 text-xs">Loading your orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-lg text-center space-y-2">
                <Package className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="text-xs font-bold text-zinc-100 uppercase">No Orders Yet</h3>
                <p className="text-[11px] text-zinc-400 font-sans">You have not placed any orders with Cash on Delivery yet.</p>
                <button
                  onClick={() => onNavigate('shop')}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold px-3 py-1.5 rounded transition"
                >
                  START SHOPPING
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 sm:p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-800">
                      <div>
                        <span className="text-xs font-mono font-bold text-red-400">{ord.orderNumber}</span>
                        <div className="text-[10px] text-zinc-400">
                          Placed on {new Date(ord.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            ord.status === 'DELIVERED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : ord.status === 'CANCELLED'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={() => onNavigate('order-tracking', { orderQuery: ord.orderNumber })}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 transition"
                        >
                          <span>TRACK</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="space-y-1.5 font-sans">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs">
                          <img
                            src={it.image}
                            alt=""
                            className="w-8 h-8 object-cover rounded bg-zinc-950 border border-zinc-800"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-zinc-100 truncate text-xs">{it.productName}</div>
                            <div className="text-zinc-400 text-[10px] font-mono">
                              Qty: {it.quantity} × KSh {it.priceSnapshot.toLocaleString()}
                            </div>
                          </div>
                          <div className="font-mono font-bold text-zinc-100 text-xs">KSh {it.subtotal.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-xs font-mono">
                      <span className="text-zinc-400 text-[10px]">
                        Delivery to {ord.deliveryLocation.estate}, {ord.deliveryLocation.town}
                      </span>
                      <span className="font-bold text-emerald-400 text-xs">
                        Total: KSh {ord.total.toLocaleString()} (COD)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Wishlist */}
        {activeTab === 'wishlist' && (
          <div>
            {wishlistProducts.length === 0 ? (
              <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-lg text-center space-y-2 font-mono">
                <Heart className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="text-xs font-bold text-zinc-100 uppercase">Your Wishlist is Empty</h3>
                <p className="text-[11px] text-zinc-400 font-sans">Click the heart icon on any product to save it for later.</p>
                <button
                  onClick={() => onNavigate('shop')}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded transition"
                >
                  EXPLORE CATALOG
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {wishlistProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex gap-2.5 items-center justify-between"
                  >
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      onClick={() => onSelectProduct(prod)}
                      className="w-12 h-12 object-cover rounded bg-zinc-950 border border-zinc-800 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 px-1">
                      <div className="text-[10px] text-red-400 font-mono font-bold uppercase">{prod.brand}</div>
                      <div
                        onClick={() => onSelectProduct(prod)}
                        className="text-xs font-bold text-zinc-100 truncate cursor-pointer hover:text-red-400"
                      >
                        {prod.name}
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                        KSh {prod.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => addToCart(prod, 1)}
                        className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs transition"
                        title="Add to Cart"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleWishlist(prod)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 rounded text-xs transition"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Profile */}
        {activeTab === 'profile' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-w-xl space-y-3 font-mono">
            <h3 className="font-bold text-xs text-zinc-100 pb-2 border-b border-zinc-800 uppercase">
              Personal Information
            </h3>

            {profileMsg && (
              <div className="p-2 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded text-xs font-bold">
                {profileMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Email (Cannot be changed)</label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-500 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded transition cursor-pointer uppercase"
              >
                {isUpdating ? 'SAVING...' : 'SAVE PROFILE CHANGES'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
