import React from 'react';
import { Product, ActiveView } from '../types';
import { ProductGrid } from '../components/ProductGrid';
import { Flame, Clock, Tag, ShieldCheck, Truck } from 'lucide-react';

interface DealsViewProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: ActiveView, extra?: any) => void;
}

export const DealsView: React.FC<DealsViewProps> = ({ products, onSelectProduct, onNavigate }) => {
  const dealsProducts = products.filter((p) => p.isHotDeal || (p.discountPercent && p.discountPercent >= 10));

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen py-6 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
        {/* Banner */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6 relative overflow-hidden shadow-lg font-mono">
          <div className="max-w-2xl space-y-2 relative z-10 text-left">
            <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider inline-flex items-center gap-1">
              <Flame className="w-3 h-3 fill-white" />
              HOT DEALS & CLEARANCE
            </span>
            <h1 className="text-base sm:text-2xl font-black text-zinc-100 tracking-tight uppercase">
              MASSIVE ELECTRONICS DISCOUNTS
            </h1>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans">
              Save up to 40% on smart TVs, heavy bass woofers, double door fridges, solar kits, and electrical appliances. All items eligible for <strong className="text-zinc-200 font-mono">Cash on Delivery</strong> and 100% Kenyan warranty.
            </p>
          </div>
        </div>

        {/* Deals Grid */}
        <ProductGrid
          products={dealsProducts}
          title="Active Flash Deals & Discounted Products"
          subtitle="Prices slashed for this week only — order now and pay when your package arrives."
          onSelectProduct={onSelectProduct}
        />
      </div>
    </div>
  );
};
