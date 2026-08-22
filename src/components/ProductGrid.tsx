import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { Sparkles, PackageSearch } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  onSelectProduct: (product: Product) => void;
  title?: string;
  subtitle?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading,
  onSelectProduct,
  title,
  subtitle
}) => {
  if (isLoading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-block w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-zinc-400 font-mono font-medium">QUERYING PRODUCT DATABASE...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center max-w-md mx-auto">
        <div className="w-10 h-10 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-2.5">
          <PackageSearch className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-zinc-100 mb-0.5">NO PRODUCTS FOUND</h3>
        <p className="text-[11px] text-zinc-400 leading-normal">
          No records match your selected filters. Adjust your criteria or reset filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 text-left border-b border-zinc-800 pb-2.5">
          <div>
            {title && <h2 className="text-base sm:text-lg font-black text-zinc-100 tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            TOTAL: <strong className="text-zinc-100">{products.length}</strong> ITEMS
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
        ))}
      </div>
    </div>
  );
};
