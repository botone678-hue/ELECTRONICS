import React from 'react';
import { ShoppingCart, Heart, MessageCircle, Star, ShieldCheck } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useSettings } from '../context/SettingsContext';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { settings } = useSettings();

  const isFavorited = isInWishlist(product.id);
  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;

  // WhatsApp Order message
  const whatsappUrl = `https://wa.me/254${settings.whatsapp.replace(/^0/, '')}?text=${encodeURIComponent(
    `Hello MEGA CITY ELECTRONICS, I am interested in ordering: ${product.name} (SKU: ${product.sku}) listed at KSh ${product.price.toLocaleString()}. Is this available for Cash on Delivery?`
  )}`;

  return (
    <div
      id={`product-card-${product.id}`}
      className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-150 flex flex-col justify-between"
    >
      {/* Top Badges Bar */}
      <div className="relative aspect-4/3 w-full bg-zinc-950 overflow-hidden cursor-pointer border-b border-zinc-850">
        <img
          src={product.images[0]}
          alt={product.name}
          onClick={() => onSelect(product)}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
          loading="lazy"
        />

        {/* Floating Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shadow tracking-wider uppercase">
            COD
          </span>
          {product.discountPercent && product.discountPercent > 0 ? (
            <span className="bg-emerald-700 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shadow">
              -{product.discountPercent}%
            </span>
          ) : null}
          {product.isHotDeal && (
            <span className="bg-amber-500 text-black font-mono font-black text-[9px] px-1.5 py-0.5 rounded shadow">
              DEAL
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-md backdrop-blur-md transition-colors z-10 cursor-pointer ${
            isFavorited
              ? 'bg-red-600 text-white'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700/60'
          }`}
          title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-white' : ''}`} />
        </button>

        {/* Stock Status Indicator Pill */}
        <div className="absolute bottom-1.5 left-2 z-10">
          {isOutOfStock ? (
            <span className="bg-zinc-950/90 text-zinc-500 border border-zinc-800 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
              SOLD OUT
            </span>
          ) : isLowStock ? (
            <span className="bg-amber-950/90 text-amber-300 border border-amber-800 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
              ONLY {product.stockQuantity} LEFT
            </span>
          ) : (
            <span className="bg-zinc-950/90 text-emerald-400 border border-zinc-800 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
              IN STOCK
            </span>
          )}
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-3 flex-1 flex flex-col justify-between text-left">
        <div>
          {/* Brand & Rating */}
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="font-mono font-bold text-red-400 uppercase">{product.brand}</span>
            <div className="flex items-center gap-1 text-amber-400 font-mono font-bold">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{product.rating}</span>
              <span className="text-zinc-500 font-normal">({product.reviewCount})</span>
            </div>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => onSelect(product)}
            className="text-xs sm:text-[13px] font-bold text-zinc-100 line-clamp-2 hover:text-red-400 transition-colors cursor-pointer leading-snug min-h-[2.2rem]"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Warranty tag */}
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1 font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{product.warranty}</span>
          </div>
        </div>

        {/* Price & Actions */}
        <div className="pt-2.5 mt-2 border-t border-zinc-800">
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-sm sm:text-base font-mono font-black text-zinc-100">
              KSh {product.price.toLocaleString()}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-[10px] font-mono text-zinc-500 line-through">
                KSh {product.compareAtPrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => addToCart(product, 1)}
              disabled={isOutOfStock}
              id={`add-cart-${product.id}`}
              className={`py-1.5 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                isOutOfStock
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-sm'
              }`}
            >
              <ShoppingCart className="w-3 h-3" />
              <span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              id={`whatsapp-order-${product.id}`}
              className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 hover:text-emerald-300 py-1.5 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-800/80"
              title="Order this product via WhatsApp"
            >
              <MessageCircle className="w-3 h-3" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
