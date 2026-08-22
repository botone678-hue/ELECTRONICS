import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { CategoryShowcase } from '../components/CategoryShowcase';
import { HotDealsSection } from '../components/HotDealsSection';
import { ProductGrid } from '../components/ProductGrid';
import { TrustSection } from '../components/TrustSection';
import { Product, Category, ActiveView } from '../types';
import { ArrowRight, Flame, Sparkles, Tv, Speaker, Refrigerator, Zap } from 'lucide-react';

interface HomeViewProps {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: ActiveView, extra?: any) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  categories,
  isLoading,
  onSelectProduct,
  onNavigate
}) => {
  const featuredProducts = products.filter((p) => p.featured);
  const tvProducts = products.filter((p) => p.categoryId === 'cat-tv').slice(0, 4);
  const audioProducts = products.filter((p) => p.categoryId === 'cat-audio').slice(0, 4);
  const fridgeProducts = products.filter((p) => p.categoryId === 'cat-fridge').slice(0, 4);

  return (
    <div className="space-y-0 text-zinc-100 font-sans">
      {/* 1. Hero Showcase */}
      <HeroSection
        featuredProducts={featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4)}
        onNavigate={onNavigate}
        onSelectProduct={onSelectProduct}
      />

      {/* 2. Trust Highlights */}
      <TrustSection
        onNavigateToContact={() => onNavigate('contact')}
        onNavigateToPolicy={() => onNavigate('delivery-policy')}
      />

      {/* 3. Category Departments Showcase */}
      <CategoryShowcase categories={categories} onNavigate={onNavigate} />

      {/* 4. Hot Deals & Clearance */}
      <HotDealsSection products={products} onSelectProduct={onSelectProduct} onNavigate={onNavigate} />

      {/* 5. Featured TVs Section */}
      {tvProducts.length > 0 && (
        <section className="py-8 bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-red-600/20 text-red-500 border border-red-600/30">
                  <Tv className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-mono">SMART & 4K TELEVISIONS</h3>
                  <p className="text-[11px] text-zinc-400">Frameless Android & WebOS Smart TVs with crystal clear displays</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('shop', { categoryId: 'cat-tv' })}
                className="text-[11px] font-mono font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <span>VIEW ALL TVS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <ProductGrid products={tvProducts} onSelectProduct={onSelectProduct} />
          </div>
        </section>
      )}

      {/* 6. High-Bass Audio & Sound Systems */}
      {audioProducts.length > 0 && (
        <section className="py-8 bg-zinc-950 border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-600/20 text-blue-400 border border-blue-600/30">
                  <Speaker className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-mono">AUDIO & HOME THEATRES</h3>
                  <p className="text-[11px] text-zinc-400">Deep bass subwoofers, soundbars, and DJ party speakers</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('shop', { categoryId: 'cat-audio' })}
                className="text-[11px] font-mono font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <span>VIEW ALL SOUND</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <ProductGrid products={audioProducts} onSelectProduct={onSelectProduct} />
          </div>
        </section>
      )}

      {/* 7. Refrigeration & Freezers */}
      {fridgeProducts.length > 0 && (
        <section className="py-8 bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-cyan-600/20 text-cyan-400 border border-cyan-600/30">
                  <Refrigerator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-mono">REFRIGERATION & COOLING</h3>
                  <p className="text-[11px] text-zinc-400">Single & double door fridges, beverage coolers, and chest freezers</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('shop', { categoryId: 'cat-fridge' })}
                className="text-[11px] font-mono font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <span>VIEW ALL FRIDGES</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <ProductGrid products={fridgeProducts} onSelectProduct={onSelectProduct} />
          </div>
        </section>
      )}

      {/* 8. Full Catalog Highlights */}
      <section className="py-8 bg-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 gap-3">
            <div>
              <span className="text-red-500 font-mono font-bold text-[10px] tracking-wider uppercase">VERIFIED STOCK</span>
              <h2 className="text-base sm:text-xl font-black text-zinc-100 tracking-tight font-mono">ALL AVAILABLE ELECTRONICS</h2>
              <p className="text-zinc-400 text-xs mt-0.5">
                Genuine stock ready for immediate dispatch and Cash on Delivery
              </p>
            </div>
            <button
              onClick={() => onNavigate('shop')}
              className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs px-3.5 py-1.5 rounded transition"
            >
              BROWSE CATALOG →
            </button>
          </div>
          <ProductGrid products={products.slice(0, 12)} isLoading={isLoading} onSelectProduct={onSelectProduct} />
        </div>
      </section>
    </div>
  );
};
