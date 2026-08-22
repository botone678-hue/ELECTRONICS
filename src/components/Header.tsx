import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Heart,
  User as UserIcon,
  Menu,
  Phone,
  Flame,
  Truck,
  MapPin,
  ChevronDown,
  X,
  Sparkles,
  Tv,
  Speaker,
  Refrigerator,
  Zap,
  Cpu,
  SunMedium,
  ShieldCheck,
  Package
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Category, Product, ActiveView } from '../types';
import { api } from '../services/api';

interface HeaderProps {
  activeView?: ActiveView;
  currentView?: ActiveView;
  onNavigate: (view: ActiveView, extra?: any) => void;
  categories: Category[];
  onSelectProduct?: (product: Product) => void;
  onOpenAuth?: () => void;
  onOpenAuthModal?: () => void;
  onOpenCart?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenMobileDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  currentView,
  onNavigate,
  categories,
  onSelectProduct,
  onOpenAuth,
  onOpenAuthModal,
  onOpenCart,
  onOpenMobileMenu,
  onOpenMobileDrawer
}) => {
  const effectiveView = activeView || currentView || 'home';
  const handleOpenAuth = onOpenAuth || onOpenAuthModal || (() => {});
  const handleOpenCart = onOpenCart || (() => {});
  const handleOpenMobile = onOpenMobileMenu || onOpenMobileDrawer || (() => {});
  const handleSelectProduct = onSelectProduct || ((p: Product) => onNavigate('shop', { search: p.name }));

  const { itemCount, subtotal, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAdmin, logout } = useAuth();
  const { settings } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchCat, setSelectedSearchCat] = useState<string>('all');
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { products } = await api.getProducts({
          search: searchQuery,
          categoryId: selectedSearchCat !== 'all' ? selectedSearchCat : undefined,
          limit: 6
        });
        setSearchResults(products);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedSearchCat]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      onNavigate('shop', {
        search: searchQuery.trim(),
        categoryId: selectedSearchCat !== 'all' ? selectedSearchCat : undefined
      });
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Tv':
        return <Tv className="w-3.5 h-3.5 text-red-500" />;
      case 'Speaker':
        return <Speaker className="w-3.5 h-3.5 text-blue-400" />;
      case 'Refrigerator':
        return <Refrigerator className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Zap':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'Cpu':
        return <Cpu className="w-3.5 h-3.5 text-emerald-400" />;
      case 'SunMedium':
        return <SunMedium className="w-3.5 h-3.5 text-yellow-400" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-red-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-800 text-zinc-100 shadow-2xl">
      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 lg:gap-6">
        {/* Left: Mobile Toggle & Logo */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenMobile}
            id="mobile-menu-toggle"
            className="lg:hidden p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('home')}
            id="site-logo-btn"
            className="flex flex-col text-left group cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="bg-red-600 text-white font-black text-[11px] px-1.5 py-0.5 rounded tracking-wider shadow-sm">
                MEGA
              </span>
              <span className="text-lg sm:text-xl font-black tracking-tight text-zinc-100 group-hover:text-red-400 transition-colors">
                CITY <span className="text-red-500 font-extrabold">ELECTRONICS</span>
              </span>
            </div>
            <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-400 -mt-0.5">
              ELDORET SHOWROOM • CASH ON DELIVERY
            </span>
          </button>
        </div>

        {/* Center: Search Bar */}
        <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-xl relative">
          <form onSubmit={handleSearchSubmit} className="flex w-full rounded-lg overflow-hidden border border-zinc-750 bg-zinc-900/90 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 transition-all">
            <select
              value={selectedSearchCat}
              onChange={(e) => setSelectedSearchCat(e.target.value)}
              className="bg-zinc-800/80 text-zinc-300 text-xs px-2.5 border-r border-zinc-700 outline-none cursor-pointer hover:bg-zinc-750"
            >
              <option value="all">All Departments</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchDropdown(true);
                }}
                placeholder="Search TVs, audio, woofers, fridges, electrical accessories..."
                className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 px-3 py-2 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="pr-2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              id="header-search-submit"
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 mr-1" />
              Search
            </button>
          </form>

          {/* Autocomplete Search Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-fadeIn">
              {isSearching ? (
                <div className="p-3 text-center text-xs text-zinc-400">Searching catalog...</div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  <div className="p-2 bg-zinc-950 text-[11px] text-zinc-400 font-semibold flex justify-between">
                    <span>MATCHING PRODUCTS</span>
                    <span>{searchResults.length} results</span>
                  </div>
                  {searchResults.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => {
                        handleSelectProduct(prod);
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left p-2.5 hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-10 h-10 object-cover rounded bg-zinc-950 border border-zinc-800 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-red-400 font-mono uppercase">{prod.brand} • {prod.sku}</div>
                        <div className="text-xs font-semibold text-zinc-100 truncate">{prod.name}</div>
                        <div className="text-xs font-mono font-bold text-emerald-400">KSh {prod.price.toLocaleString()}</div>
                      </div>
                      <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-mono font-bold">
                        COD
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full py-2 text-center text-xs font-bold text-red-400 hover:text-red-300 hover:bg-zinc-800 transition"
                  >
                    View all matching products for "{searchQuery}" →
                  </button>
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-zinc-400">
                  No products found for "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Actions: Phone Hotline, Wishlist, Account, Cart */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Quick Call */}
          <a
            href={`tel:${settings.phone}`}
            id="header-call-cta"
            className="hidden xl:flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded-lg text-xs transition"
          >
            <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center">
              <Phone className="w-3 h-3" />
            </div>
            <div className="text-left">
              <div className="text-[9px] text-zinc-400 font-medium leading-none">CALL HOTLINE</div>
              <div className="text-xs font-mono font-bold text-zinc-100 tracking-tight leading-tight">{settings.phone}</div>
            </div>
          </a>

          {/* Wishlist */}
          <button
            onClick={() => onNavigate('account', { tab: 'wishlist' })}
            id="header-wishlist-btn"
            className="relative p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Wishlist"
          >
            <Heart className="w-4 h-4" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white font-mono font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-zinc-950">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Account Menu */}
          <div ref={accountMenuRef} className="relative">
            <button
              onClick={() => {
                if (user) {
                  setShowAccountMenu(!showAccountMenu);
                } else {
                  handleOpenAuth();
                }
              }}
              id="header-account-btn"
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 transition cursor-pointer border border-zinc-800 text-xs"
            >
              <UserIcon className="w-4 h-4 text-red-500" />
              <div className="hidden lg:flex flex-col text-left leading-tight">
                <span className="text-[10px] text-zinc-400">
                  {user ? `Hello, ${user.name.split(' ')[0]}` : 'Sign In / Register'}
                </span>
                <span className="text-xs font-bold text-zinc-100">
                  {user ? (isAdmin ? 'Admin Panel' : 'My Account') : 'Account'}
                </span>
              </div>
              {user && <ChevronDown className="w-3 h-3 text-zinc-400" />}
            </button>

            {/* Account Dropdown */}
            {user && showAccountMenu && (
              <div className="absolute right-0 mt-1.5 w-52 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-fadeIn text-xs">
                <div className="p-2.5 bg-zinc-950 border-b border-zinc-800">
                  <div className="font-bold text-zinc-100 truncate">{user.name}</div>
                  <div className="text-[11px] text-zinc-400 truncate">{user.email}</div>
                  <span className={`inline-block mt-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${user.role === 'admin' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-zinc-800 text-zinc-300'}`}>
                    {user.role === 'admin' ? 'Administrator' : 'Customer'}
                  </span>
                </div>

                <div className="p-1">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setShowAccountMenu(false);
                        onNavigate('admin');
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-zinc-800 rounded flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Admin Control Panel
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onNavigate('account', { tab: 'orders' });
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 rounded flex items-center gap-2"
                  >
                    <Package className="w-3.5 h-3.5 text-zinc-400" />
                    My Orders & Tracking
                  </button>
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onNavigate('account', { tab: 'wishlist' });
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 rounded flex items-center gap-2"
                  >
                    <Heart className="w-3.5 h-3.5 text-zinc-400" />
                    Saved Wishlist ({wishlistCount})
                  </button>
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onNavigate('account', { tab: 'profile' });
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 rounded flex items-center gap-2"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                    Profile & Addresses
                  </button>
                  <div className="my-1 border-t border-zinc-800" />
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/40 rounded flex items-center gap-2"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart Button */}
          <button
            onClick={() => {
              if (onOpenCart) onOpenCart();
              else setIsCartOpen(true);
            }}
            id="header-cart-btn"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shadow-lg shadow-red-950"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4" />
              {itemCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-white text-red-600 font-mono font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {itemCount}
                </span>
              )}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-[9px] text-red-200 font-medium uppercase tracking-wider">CART</span>
              <span className="text-xs font-mono font-black">KSh {subtotal.toLocaleString()}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 pb-2.5">
        <form onSubmit={handleSearchSubmit} className="flex rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TVs, woofers, fridges, cables..."
            className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 px-3 py-2 outline-none"
          />
          <button type="submit" className="bg-red-600 text-white px-3 py-2 font-bold text-xs flex items-center">
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Secondary Department Navigation Bar */}
      <nav className="hidden lg:block bg-zinc-950 border-t border-zinc-850 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-1 py-1">
            <button
              onClick={() => onNavigate('home')}
              id="nav-home"
              className={`px-2.5 py-1.5 rounded font-semibold transition ${
                effectiveView === 'home' ? 'text-red-400 bg-zinc-900 font-bold' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              Home
            </button>

            <button
              onClick={() => onNavigate('shop')}
              id="nav-shop"
              className={`px-2.5 py-1.5 rounded font-semibold transition ${
                effectiveView === 'shop' ? 'text-red-400 bg-zinc-900 font-bold' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              All Products
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onNavigate('shop', { categoryId: cat.id })}
                className="px-2.5 py-1.5 rounded font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/60 transition flex items-center gap-1.5"
              >
                {getCategoryIcon(cat.icon)}
                <span>{cat.name}</span>
              </button>
            ))}

            <button
              onClick={() => onNavigate('deals')}
              id="nav-deals"
              className="px-2.5 py-1.5 rounded font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 transition flex items-center gap-1"
            >
              <Flame className="w-3 h-3 text-amber-400" />
              Hot Deals
            </button>
          </div>

          {/* Quick Track & Showroom Info */}
          <div className="flex items-center gap-3 text-zinc-400 text-xs">
            <button
              onClick={() => onNavigate('order-tracking')}
              id="nav-track"
              className="flex items-center gap-1 text-zinc-300 hover:text-red-400 transition font-medium"
            >
              <Truck className="w-3.5 h-3.5 text-red-500" />
              <span>Track Order</span>
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => onNavigate('contact')}
              id="nav-contact"
              className="flex items-center gap-1 text-zinc-300 hover:text-white transition font-medium"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>Showroom & Contact</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

