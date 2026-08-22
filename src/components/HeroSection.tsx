import React, { useState, useEffect } from 'react';
import {
  Phone,
  ArrowRight,
  ShieldCheck,
  Truck,
  Flame,
  Zap,
  MapPin,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Product, ActiveView } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';

interface HeroSectionProps {
  featuredProducts: Product[];
  onNavigate: (view: ActiveView, extra?: any) => void;
  onSelectProduct: (product: Product) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredProducts,
  onNavigate,
  onSelectProduct
}) => {
  const { settings } = useSettings();
  const { addToCart } = useCart();
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto carousel rotation
  useEffect(() => {
    if (featuredProducts.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % Math.min(featuredProducts.length, 4));
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredProducts]);

  const currentHeroProduct = featuredProducts[activeSlide] || featuredProducts[0];

  return (
    <section className="relative bg-[#09090b] border-b border-zinc-800 text-zinc-100 overflow-hidden">
      {/* Background Subtle Tech Grid */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column: High Density Value Proposition */}
          <div className="lg:col-span-7 space-y-4 text-left">
            {/* Cash on delivery prominent badge */}
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="bg-red-600 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded tracking-wider flex items-center gap-1.5 shadow-sm">
                <Flame className="w-3.5 h-3.5 fill-white" />
                CASH ON DELIVERY NATIONWIDE
              </span>
              <span className="inline-flex items-center gap-1 bg-zinc-900 text-zinc-300 text-[11px] px-2 py-0.5 rounded border border-zinc-800 font-mono">
                <MapPin className="w-3 h-3 text-red-500" />
                ZION MALL • ELDORET
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-zinc-100 leading-tight">
              POWER YOUR HOME. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-amber-400">
                KENYA'S BEST ELECTRONICS DEALS.
              </span>
            </h1>

            <p className="text-zinc-400 text-xs sm:text-sm max-w-xl font-normal leading-relaxed">
              Order genuine 4K Smart TVs, double door refrigerators, heavy-bass subwoofers, solar equipment, and electrical accessories. Inspect at your doorstep before payment.
            </p>

            {/* High Density Trust Pills */}
            <div className="grid grid-cols-3 gap-2 pt-1 max-w-lg">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold">100% Genuine</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold">KE Warranty</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded">
                <Truck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold">Express COD</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                onClick={() => onNavigate('shop')}
                id="hero-shop-now-btn"
                className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-5 py-2.5 rounded-lg text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-950 hover:scale-[1.01] cursor-pointer"
              >
                <span>SHOP CATALOG</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <a
                href={`tel:${settings.phone}`}
                id="hero-call-btn"
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold px-4 py-2.5 rounded-lg text-xs sm:text-sm flex items-center gap-2 transition border border-zinc-800"
              >
                <Phone className="w-3.5 h-3.5 text-red-500" />
                <span className="font-mono">{settings.phone}</span>
              </a>

              <button
                onClick={() => onNavigate('deals')}
                id="hero-deals-btn"
                className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1 py-1.5 px-2 font-mono"
              >
                <Flame className="w-3 h-3 text-amber-400" />
                TODAY'S DEALS →
              </button>
            </div>
          </div>

          {/* Right Column: High Density Featured Showcase Card */}
          <div className="lg:col-span-5">
            {currentHeroProduct ? (
              <div className="relative bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 shadow-xl overflow-hidden group">
                {/* Hot Badge */}
                <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 items-start">
                  <span className="bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded tracking-wider uppercase shadow">
                    FEATURED SHOWCASE
                  </span>
                  {currentHeroProduct.discountPercent && (
                    <span className="bg-emerald-700 text-white font-mono font-bold text-[9px] px-1.5 py-0.2 rounded">
                      SAVE {currentHeroProduct.discountPercent}%
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3 z-20">
                  <span className="bg-zinc-950/90 text-zinc-300 border border-zinc-800 font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                    {currentHeroProduct.brand}
                  </span>
                </div>

                {/* Product Image */}
                <div
                  onClick={() => onSelectProduct(currentHeroProduct)}
                  className="relative aspect-video sm:aspect-4/3 w-full bg-zinc-950 rounded-lg overflow-hidden cursor-pointer mt-3 mb-3 border border-zinc-800"
                >
                  <img
                    src={currentHeroProduct.images[0]}
                    alt={currentHeroProduct.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

                  <div className="absolute bottom-2 left-2 bg-red-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow">
                    CASH ON DELIVERY
                  </div>
                </div>

                {/* Product Meta */}
                <div className="space-y-1.5 text-left">
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {currentHeroProduct.categoryName} • SKU: {currentHeroProduct.sku}
                  </div>
                  <h3
                    onClick={() => onSelectProduct(currentHeroProduct)}
                    className="text-sm font-bold text-zinc-100 line-clamp-1 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    {currentHeroProduct.name}
                  </h3>

                  {/* Price & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <div>
                      <div className="text-base sm:text-lg font-mono font-black text-emerald-400">
                        KSh {currentHeroProduct.price.toLocaleString()}
                      </div>
                      {currentHeroProduct.compareAtPrice && (
                        <div className="text-[10px] font-mono text-zinc-500 line-through">
                          KSh {currentHeroProduct.compareAtPrice.toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => addToCart(currentHeroProduct, 1)}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors cursor-pointer"
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={() => onSelectProduct(currentHeroProduct)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-2.5 py-1.5 rounded transition"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>

                {/* Carousel Pips */}
                {featuredProducts.length > 1 && (
                  <div className="flex justify-center gap-1 mt-3">
                    {featuredProducts.slice(0, 4).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlide(idx)}
                        className={`h-1 rounded-full transition-all ${
                          activeSlide === idx ? 'w-5 bg-red-600' : 'w-1.5 bg-zinc-700'
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-zinc-900 rounded-xl text-center text-xs text-zinc-400">Loading catalog items...</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
