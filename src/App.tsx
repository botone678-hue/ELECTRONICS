import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { SettingsProvider } from './context/SettingsContext';
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
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') return 'admin';
    return 'home';
  });
  const [navExtra, setNavExtra] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const { isAdmin } = useAuth();
  const { isCartDrawerOpen, setIsCartDrawerOpen } = useCart();

  const loadCatalog = async () => {
    setIsLoadingProducts(true);
    try {
      const [prodData, catData] = await Promise.all([api.getProducts({ limit: 100 }), api.getCategories()]);
      setProducts(prodData.products);
      setCategories(catData.categories);
    } catch (err) {
      console.error('Failed to load initial catalog:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => { void loadCatalog(); }, []);

  useRealtime({ onInventoryUpdated: () => { void loadCatalog(); } });

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

  if (activeView === 'admin') {
    return <div className="min-h-screen bg-[#09090b] font-sans antialiased text-zinc-100 selection:bg-red-600 selection:text-white"><AdminDashboard categories={categories} onExitAdmin={() => navigateTo('home')} /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] font-sans antialiased text-zinc-100 selection:bg-red-600 selection:text-white">
      <AnnouncementBar />
      <Header activeView={activeView} categories={categories} onNavigate={navigateTo} onOpenMobileMenu={() => setIsMobileDrawerOpen(true)} onOpenAuth={() => handleOpenAuth('login')} />
      <main className="flex-grow">
        {activeView === 'home' && <HomeView products={products} categories={categories} isLoading={isLoadingProducts} onSelectProduct={setSelectedProduct} onNavigate={navigateTo} />}
        {activeView === 'shop' && <ShopView initialCategoryId={navExtra?.categoryId} initialSubcategory={navExtra?.subcategory} initialSearch={navExtra?.search} categories={categories} onSelectProduct={setSelectedProduct} />}
        {activeView === 'deals' && <DealsView products={products} onSelectProduct={setSelectedProduct} onNavigate={navigateTo} />}
        {activeView === 'checkout' && <CheckoutView onOrderPlaced={handleOrderPlaced} onNavigate={navigateTo} />}
        {activeView === 'order-confirmation' && <OrderConfirmationView order={lastPlacedOrder} onNavigate={navigateTo} />}
        {activeView === 'order-tracking' && <OrderTrackingView initialQuery={navExtra?.orderQuery} />}
        {activeView === 'account' && <CustomerAccountView initialTab={navExtra?.tab || 'orders'} products={products} onSelectProduct={setSelectedProduct} onNavigate={navigateTo} onOpenAuthModal={() => handleOpenAuth('login')} />}
        {activeView === 'contact' && <ContactView />}
        {activeView === 'delivery-policy' && <DeliveryPolicyView onNavigate={navigateTo} />}
      </main>
      <Footer onNavigate={navigateTo} />
      <FloatingActions onNavigate={navigateTo} />
      <MobileDrawer isOpen={isMobileDrawerOpen} onClose={() => setIsMobileDrawerOpen(false)} categories={categories} onNavigate={navigateTo} onOpenAuthModal={() => handleOpenAuth('login')} />
      <CartDrawer isOpen={isCartDrawerOpen} onClose={() => setIsCartDrawerOpen(false)} onProceedToCheckout={() => { setIsCartDrawerOpen(false); navigateTo('checkout'); }} onNavigateToShop={() => navigateTo('shop')} />
      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onBuyNowWithCOD={() => { setSelectedProduct(null); navigateTo('checkout'); }} />}
      <AuthModal isOpen={isAuthModalOpen} initialTab={authModalInitialTab} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export function App() {
  return <SettingsProvider><AuthProvider><CartProvider><WishlistProvider><AppContent /></WishlistProvider></CartProvider></AuthProvider></SettingsProvider>;
}

export default App;
