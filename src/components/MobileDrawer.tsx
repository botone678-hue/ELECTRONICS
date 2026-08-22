import React from 'react';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Flame,
  Truck,
  ShieldCheck,
  Package,
  Heart,
  User as UserIcon,
  Tv,
  Speaker,
  Refrigerator,
  Zap,
  Cpu,
  SunMedium,
  Sparkles
} from 'lucide-react';
import { Category, ActiveView } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useWishlist } from '../context/WishlistContext';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onNavigate: (view: ActiveView, extra?: any) => void;
  onOpenAuthModal: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  categories,
  onNavigate,
  onOpenAuthModal
}) => {
  const { user, isAdmin, logout } = useAuth();
  const { settings } = useSettings();
  const { wishlistCount } = useWishlist();

  if (!isOpen) return null;

  const handleNav = (view: ActiveView, extra?: any) => {
    onNavigate(view, extra);
    onClose();
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Tv':
        return <Tv className="w-3.5 h-3.5 text-red-500" />;
      case 'Speaker':
        return <Speaker className="w-3.5 h-3.5 text-blue-500" />;
      case 'Refrigerator':
        return <Refrigerator className="w-3.5 h-3.5 text-cyan-500" />;
      case 'Zap':
        return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      case 'Cpu':
        return <Cpu className="w-3.5 h-3.5 text-emerald-500" />;
      case 'SunMedium':
        return <SunMedium className="w-3.5 h-3.5 text-yellow-500" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-red-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden font-sans">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer Content */}
      <div className="relative w-4/5 max-w-xs bg-[#09090b] text-zinc-100 h-full shadow-2xl flex flex-col z-10 overflow-y-auto border-r border-zinc-800">
        {/* Header */}
        <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="bg-red-600 text-white font-mono font-black text-[10px] px-1.5 py-0.5 rounded">MEGA</span>
            <span className="font-extrabold text-sm tracking-tight text-zinc-100 font-mono">
              CITY <span className="text-red-500">ELECTRONICS</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Promo Banner */}
        <div className="bg-red-950/70 border-b border-red-900/50 px-3 py-2 text-[11px] font-mono text-red-200 flex items-center gap-1.5 font-bold">
          <Flame className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span>PAY CASH ON DELIVERY IN 47 COUNTIES</span>
        </div>

        {/* User Account / Sign In */}
        <div className="p-3 bg-zinc-900 border-b border-zinc-800">
          {user ? (
            <div>
              <div className="text-[10px] font-mono text-zinc-400">SIGNED IN AS</div>
              <div className="text-xs font-bold text-zinc-100 truncate">{user.name}</div>
              <div className="text-[11px] font-mono text-zinc-400 truncate">{user.email}</div>
              <div className="flex gap-1.5 mt-2">
                {isAdmin && (
                  <button
                    onClick={() => handleNav('admin')}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono font-bold py-1 px-1.5 rounded flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Admin
                  </button>
                )}
                <button
                  onClick={() => handleNav('account', { tab: 'orders' })}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-[10px] font-mono font-bold py-1 px-1.5 rounded border border-zinc-700"
                >
                  My Orders
                </button>
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="bg-zinc-800 hover:bg-red-950 text-red-400 text-[10px] font-mono font-bold py-1 px-2 rounded border border-zinc-700"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[11px] font-mono text-zinc-400 mb-1.5">Sign in to track orders & save wishlist</div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-mono font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <UserIcon className="w-3.5 h-3.5" />
                SIGN IN / REGISTER
              </button>
            </div>
          )}
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 p-3 space-y-3">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1.5">DEPARTMENTS</div>
            <div className="space-y-0.5 font-mono">
              <button
                onClick={() => handleNav('shop')}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold text-zinc-200 hover:bg-zinc-900 hover:text-white flex items-center justify-between border border-transparent hover:border-zinc-800"
              >
                <span>ALL PRODUCTS</span>
                <span className="text-[10px] text-zinc-500 font-normal">VIEW ALL</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleNav('shop', { categoryId: cat.id })}
                  className="w-full text-left px-2.5 py-1.5 rounded text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2 border border-transparent hover:border-zinc-800"
                >
                  {getCategoryIcon(cat.icon)}
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-1.5">QUICK LINKS</div>
            <div className="space-y-0.5 font-mono">
              <button
                onClick={() => handleNav('deals')}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs font-bold text-amber-400 hover:bg-zinc-900 flex items-center gap-2 border border-transparent hover:border-zinc-800"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                HOT DEALS & CLEARANCE
              </button>
              <button
                onClick={() => handleNav('order-tracking')}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 border border-transparent hover:border-zinc-800"
              >
                <Truck className="w-3.5 h-3.5 text-red-500" />
                TRACK ORDER
              </button>
              <button
                onClick={() => handleNav('account', { tab: 'wishlist' })}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs font-medium text-zinc-300 hover:bg-zinc-900 flex items-center justify-between border border-transparent hover:border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-zinc-400" />
                  <span>WISHLIST</span>
                </div>
                {wishlistCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">
                    {wishlistCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleNav('delivery-policy')}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs font-medium text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 border border-transparent hover:border-zinc-800"
              >
                <Package className="w-3.5 h-3.5 text-zinc-400" />
                DELIVERY POLICY
              </button>
              <button
                onClick={() => handleNav('contact')}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs font-medium text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 border border-transparent hover:border-zinc-800"
              >
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                SHOWROOM LOCATION
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Contact / Direct Hotlines */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 space-y-1.5 font-mono">
          <a
            href={`tel:${settings.phone}`}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 py-2 px-2.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 border border-zinc-750"
          >
            <Phone className="w-3.5 h-3.5 text-red-500" />
            <span>CALL: {settings.phone}</span>
          </a>
          <a
            href={`https://wa.me/254${settings.whatsapp.replace(/^0/, '')}?text=Hello%20MEGA%20CITY%20ELECTRONICS%2C%20I%20want%20to%20order.`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-950 hover:bg-emerald-900 text-emerald-400 py-2 px-2.5 rounded text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-800"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WHATSAPP SUPPORT</span>
          </a>
        </div>
      </div>
    </div>
  );
};
