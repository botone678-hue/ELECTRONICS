import React from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  Flame,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

interface CartDrawerProps {
  onNavigateToCheckout: () => void;
  onNavigateToShop: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onNavigateToCheckout,
  onNavigateToShop
}) => {
  const {
    items,
    itemCount,
    subtotal,
    deliveryZones,
    selectedZone,
    deliveryFee,
    total,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeFromCart,
    setSelectedZone,
    clearCart
  } = useCart();

  const { settings } = useSettings();

  if (!isCartDrawerOpen) return null;

  const freeThreshold = selectedZone?.freeThreshold || settings.freeDeliveryThreshold;
  const progressToFreeDelivery = Math.min(100, Math.round((subtotal / freeThreshold) * 100));
  const amountNeededForFree = Math.max(0, freeThreshold - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-[#09090b] text-zinc-100 shadow-2xl flex flex-col border-l border-zinc-800 animate-slideLeft">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-red-600/20 text-red-500 border border-red-600/30">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-100 tracking-tight">SHOPPING CART</h3>
                <span className="text-[10px] font-mono text-zinc-400">
                  {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'} IN CART
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
              aria-label="Close cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cash on delivery banner */}
          <div className="bg-red-950/80 border-b border-red-900/60 p-2 px-3.5 text-[11px] text-red-200 font-mono font-bold flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span>PAY ON DELIVERY VIA M-PESA OR CASH UPON INSPECTION</span>
          </div>

          {/* Free Delivery Meter */}
          {subtotal > 0 && freeThreshold > 0 && (
            <div className="p-2.5 px-3.5 bg-zinc-900 border-b border-zinc-800 text-[11px]">
              <div className="flex justify-between font-mono font-semibold mb-1 text-zinc-300">
                {amountNeededForFree > 0 ? (
                  <span>
                    ADD <strong className="text-emerald-400">KSh {amountNeededForFree.toLocaleString()}</strong> FOR{' '}
                    <strong className="text-zinc-100">FREE DELIVERY</strong>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    YOU UNLOCKED FREE DELIVERY!
                  </span>
                )}
                <span className="text-zinc-400">{progressToFreeDelivery}%</span>
              </div>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressToFreeDelivery}%` }}
                />
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.length === 0 ? (
              <div className="py-14 text-center text-zinc-400 space-y-2.5">
                <div className="w-12 h-12 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-zinc-100 font-mono">YOUR CART IS EMPTY</h4>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                  Explore genuine electronics, TVs, sound systems, and accessories.
                </p>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    onNavigateToShop();
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs px-4 py-2 rounded transition mt-2 cursor-pointer shadow"
                >
                  START SHOPPING
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.product.id}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg flex gap-2.5 items-center"
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-14 h-14 object-cover rounded bg-zinc-950 border border-zinc-800 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-red-400 font-semibold truncate">{item.product.brand}</div>
                    <h4 className="text-xs font-bold text-zinc-100 truncate">{item.product.name}</h4>
                    <div className="text-xs font-mono font-black text-emerald-400 mt-0.5">
                      KSh {item.product.price.toLocaleString()}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center border border-zinc-750 bg-zinc-950 rounded overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-0.5 px-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 text-[11px] font-mono font-bold text-zinc-100 min-w-[1.25rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.stockQuantity}
                          className="p-0.5 px-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 transition"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-3.5 bg-zinc-950 border-t border-zinc-800 space-y-3">
              {/* Delivery Zone Selector */}
              {deliveryZones.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400 font-semibold flex items-center gap-1">
                    <Truck className="w-3 h-3 text-red-500" />
                    DELIVERY DESTINATION:
                  </label>
                  <select
                    value={selectedZone?.id || ''}
                    onChange={(e) => {
                      const zone = deliveryZones.find((z) => z.id === e.target.value);
                      if (zone) setSelectedZone(zone);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs font-mono text-zinc-200 outline-none cursor-pointer focus:border-red-500"
                  >
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} (
                        {z.fee === 0 || (z.freeThreshold && subtotal >= z.freeThreshold)
                          ? 'FREE'
                          : `KSh ${z.fee.toLocaleString()}`}
                        ) • {z.estimatedTime}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1 text-xs font-mono text-zinc-300 border-t border-zinc-850 pt-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">SUBTOTAL</span>
                  <span className="font-bold text-zinc-100">KSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">ESTIMATED DELIVERY</span>
                  <span className="font-bold text-emerald-400">
                    {deliveryFee === 0 ? 'FREE' : `KSh ${deliveryFee.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-zinc-100 pt-1.5 border-t border-zinc-800">
                  <span>TOTAL (COD)</span>
                  <span className="text-emerald-400 text-base">KSh {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => {
                  setIsCartDrawerOpen(false);
                  onNavigateToCheckout();
                }}
                id="cart-checkout-btn"
                className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 px-3 rounded font-mono font-black text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
              >
                <span>PROCEED TO CHECKOUT (COD)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Zero pre-payment required. Pay upon delivery.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
