import React, { useState, useEffect } from 'react';
import { Flame, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { Product, ActiveView } from '../types';
import { ProductCard } from './ProductCard';

interface HotDealsSectionProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: ActiveView, extra?: any) => void;
}

export const HotDealsSection: React.FC<HotDealsSectionProps> = ({
  products,
  onSelectProduct,
  onNavigate
}) => {
  const hotDeals = products.filter((p) => p.isHotDeal || (p.discountPercent && p.discountPercent >= 15)).slice(0, 8);

  // Dynamic daily countdown timer
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 35, seconds: 20 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (hotDeals.length === 0) return null;

  return (
    <section className="py-8 bg-[#09090b] border-b border-zinc-800 text-zinc-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header with Countdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 sm:p-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-red-600/20 border border-red-600/30 text-red-500 flex items-center justify-center flex-shrink-0">
              <Flame className="w-5 h-5 fill-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white font-mono font-bold text-[9px] uppercase px-1.5 py-0.2 rounded">
                  LIMITED TIME
                </span>
                <h2 className="text-base sm:text-lg font-black text-zinc-100 tracking-tight">HOT DEALS & CLEARANCE</h2>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">
                Steep price cuts on TVs, woofers, fridges & accessories with Cash on Delivery.
              </p>
            </div>
          </div>

          {/* Flash Sale Countdown Timer */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 rounded self-start md:self-auto">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-zinc-400 font-mono font-semibold mr-1">ENDS IN:</span>
            <div className="flex items-center gap-1 font-mono font-black text-xs">
              <span className="bg-zinc-900 text-amber-400 px-1.5 py-0.5 rounded border border-zinc-800">
                {String(timeLeft.hours).padStart(2, '0')}h
              </span>
              <span className="text-zinc-600">:</span>
              <span className="bg-zinc-900 text-amber-400 px-1.5 py-0.5 rounded border border-zinc-800">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </span>
              <span className="text-zinc-600">:</span>
              <span className="bg-zinc-900 text-amber-400 px-1.5 py-0.5 rounded border border-zinc-800">
                {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          </div>
        </div>

        {/* Hot Deals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {hotDeals.map((product) => (
            <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-5 text-center">
          <button
            onClick={() => onNavigate('deals')}
            className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-mono font-bold text-xs px-4 py-2 rounded-lg border border-zinc-800 transition"
          >
            <span>VIEW ALL ({hotDeals.length}+ DEALS)</span>
            <ArrowRight className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>
    </section>
  );
};
