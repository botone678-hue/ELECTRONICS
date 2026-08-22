import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileDrawer } from './components/MobileDrawer';
import { CartDrawer } from './components/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { FloatingActions } from './components/FloatingActions';
import { HomeView } from './views/HomeView';
import { ShopView } from './views/ShopView';
import { DealsView } from './views/DealsView';
import { CheckoutView } from './views/CheckoutView';
import { OrderConfirmationView } from './views/OrderConfirmationView';
import { OrderTrackingView } from './views/OrderTrackingView';
import { CustomerAccountView } from './views/CustomerAccountView';
import { ContactView } from './views/ContactView';
import { DeliveryPolicyView } from './views/DeliveryPolicyView';
import { AdminDashboard } from './views/admin/AdminDashboard';
import { Product, Category, ActiveView, Order } from './types';
import { api } from './services/api';
import { useRealtime } from './hooks/useRealtime';

const AppContent: React.FC = () => {
  // Navigation State
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      return 'admin';
    }
    return 'home';
  });
  const [navExtra, setNavExtra] = useState<any>(null);

  // Products & Categories Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');

  // Checkout placed order for confirmation screen
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  const { user, isAdmin } = useAuth();
  const { isCartOpen, setIsCartOpen } = useCart();

  // Fetch initial catalog
  const loadCatalog = async () => {
    setIsLoadingProducts(true);
    try {
      const [prodData, catData] = await Promise.all([
        api.getProducts({ limit: 100 }),
        api.getCategories()
      ]);
      setProducts(prodData.products);
      setCategories(catData.categories);
    } catch (err) {
      console.error('Failed to load initial catalog:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Sync real-time updates for products
  useRealtime({
    onInventoryUpdated: () => {
      loadCatalog();
    }
  });

  // Navigation Helper
  const navigateTo = (view: ActiveView, extra?: any) => {
    setActiveView(view);
    setNavExtra(extra || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthModalInitialTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleOrderPlaced = (order: Order) => {
    setLastPlacedOrder(order);
    navigateTo('order-confirmation');
  };

  // If in Admin Dashboard view
  if (activeView === 'admin') {
    return (
      <div className="min-h-screen bg-[#09090b] font-sans antialiased text-zinc-100 selection:bg-red-600 selection:text-white">
        <AdminDashboard categories={categories} onExitAdmin={() => navigateTo('home')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] font-sans antialiased text-zinc-100 selection:bg-red-600 selection:text-white">
      {/* Top Announcement */}
      <AnnouncementBar />

      {/* Main Header */}
      <Header
        activeView={activeView}
        categories={categories}
        onNavigate={navigateTo}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        onOpenAuth={() => handleOpenAuth('login')}
      />

      {/* Main Dynamic View Outlet */}
      <main className="flex-grow">
        {activeView === 'home' && (
          <HomeView
            products={products}
            categories={categories}
            isLoading={isLoadingProducts}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onNavigate={navigateTo}
          />
        )}

        {activeView === 'shop' && (
          <ShopView
            initialCategoryId={navExtra?.categoryId}
            initialSubcategory={navExtra?.subcategory}
            initialSearch={navExtra?.search}
            categories={categories}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        )}

        {activeView === 'deals' && (
          <DealsView
            products={products}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onNavigate={navigateTo}
          />
        )}

        {activeView === 'checkout' && (
          <CheckoutView onOrderPlaced={handleOrderPlaced} onNavigate={navigateTo} />
        )}

        {activeView === 'order-confirmation' && (
          <OrderConfirmationView order={lastPlacedOrder} onNavigate={navigateTo} />
        )}

        {activeView === 'order-tracking' && (
          <OrderTrackingView initialQuery={navExtra?.orderQuery} />
        )}

        {activeView === 'account' && (
          <CustomerAccountView
            initialTab={navExtra?.tab || 'orders'}
            products={products}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onNavigate={navigateTo}
            onOpenAuthModal={() => handleOpenAuth('login')}
          />
        )}

        {activeView === 'contact' && <ContactView />}

        {activeView === 'delivery-policy' && <DeliveryPolicyView onNavigate={navigateTo} />}
      </main>

      {/* Global Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Floating Call, WhatsApp & Order Tracking Widgets */}
      <FloatingActions onNavigate={navigateTo} />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        categories={categories}
        onNavigate={navigateTo}
        onOpenAuthModal={() => handleOpenAuth('login')}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          navigateTo('checkout');
        }}
        onNavigateToShop={() => navigateTo('shop')}
      />

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onBuyNowWithCOD={() => {
            setSelectedProduct(null);
            navigateTo('checkout');
          }}
        />
      )}

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalInitialTab}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppContent />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
