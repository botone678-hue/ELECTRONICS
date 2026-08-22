import React from 'react';
import {
  Tv,
  Speaker,
  Refrigerator,
  Utensils,
  Zap,
  Cpu,
  SunMedium,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { Category, ActiveView } from '../types';

interface CategoryShowcaseProps {
  categories: Category[];
  onNavigate: (view: ActiveView, extra?: any) => void;
}

export const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({ categories, onNavigate }) => {
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Tv':
        return <Tv className="w-4 h-4 text-red-500" />;
      case 'Speaker':
        return <Speaker className="w-4 h-4 text-blue-400" />;
      case 'Refrigerator':
        return <Refrigerator className="w-4 h-4 text-cyan-400" />;
      case 'Utensils':
        return <Utensils className="w-4 h-4 text-amber-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4 text-emerald-400" />;
      case 'SunMedium':
        return <SunMedium className="w-4 h-4 text-amber-400" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <section className="py-8 bg-zinc-950 border-b border-zinc-800 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-mono font-bold text-[10px] tracking-wider uppercase">DEPARTMENTS</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 font-mono text-[10px]">ALL IN STOCK</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">SHOP BY CATEGORY</h2>
          </div>
          <button
            onClick={() => onNavigate('shop')}
            className="inline-flex items-center gap-1 text-xs font-mono font-bold text-red-400 hover:text-red-300 transition"
          >
            <span>VIEW ALL ({categories.length} CATEGORIES)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg overflow-hidden shadow-md transition-all flex flex-col justify-between"
            >
              {/* Category Image Header */}
              <div
                onClick={() => onNavigate('shop', { categoryId: cat.id })}
                className="relative h-32 w-full overflow-hidden cursor-pointer bg-zinc-950"
              >
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-transparent" />

                <div className="absolute top-2.5 left-2.5 bg-zinc-950/90 border border-zinc-800 p-1.5 rounded">
                  {getCategoryIcon(cat.icon)}
                </div>
              </div>

              {/* Category Content */}
              <div className="p-3 flex-1 flex flex-col justify-between text-left">
                <div>
                  <h3
                    onClick={() => onNavigate('shop', { categoryId: cat.id })}
                    className="text-sm font-bold text-zinc-100 group-hover:text-red-400 transition-colors cursor-pointer"
                  >
                    {cat.name}
                  </h3>
                  <p className="text-zinc-400 text-[11px] mt-0.5 line-clamp-1">{cat.description}</p>

                  {/* Subcategories Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {cat.subcategories.slice(0, 3).map((sub, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => onNavigate('shop', { categoryId: cat.id, subcategory: sub })}
                        className="text-[10px] font-mono bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded border border-zinc-800 transition"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2.5 mt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                  <button
                    onClick={() => onNavigate('shop', { categoryId: cat.id })}
                    className="text-[11px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Browse</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-900">
                    COD READY
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
