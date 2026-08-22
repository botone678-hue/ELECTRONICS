import React, { useState } from 'react';
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  Phone,
  MapPin,
  Flame,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Lock
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { Order, ActiveView } from '../types';
import confetti from 'canvas-confetti';

interface CheckoutViewProps {
  onOrderPlaced: (order: Order) => void;
  onNavigate: (view: ActiveView, extra?: any) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({ onOrderPlaced, onNavigate }) => {
  const { items, subtotal, deliveryZones, selectedZone, deliveryFee, total, clearCart, setSelectedZone } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();

  // Form State
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [county, setCounty] = useState('Uasin Gishu (Eldoret)');
  const [town, setTown] = useState('Eldoret Town');
  const [estate, setEstate] = useState('');
  const [landmark, setLandmark] = useState('');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'MPESA_ON_DELIVERY'>('CASH_ON_DELIVERY');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const kenyaCounties = [
    'Uasin Gishu (Eldoret)',
    'Nairobi',
    'Nakuru',
    'Kisumu',
    'Trans Nzoia (Kitale)',
    'Kakamega',
    'Kiambu',
    'Mombasa',
    'Machakos',
    'Nandi',
    'Bomet',
    'Kericho',
    'Bungoma',
    'Busia',
    'Elgeyo-Marakwet',
    'West Pokot',
    'Nyeri',
    'Embu',
    'Meru',
    'Laikipia',
    'Kajiado',
    'Kilifi',
    'Other County in Kenya'
  ];

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (items.length === 0) {
      setErrorMessage('Your cart is empty. Please add items before placing an order.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !estate.trim()) {
      setErrorMessage('Please fill in your Full Name, Phone Number, and Estate / Delivery Address.');
      return;
    }

    // Validate phone number loosely for Kenyan networks
    const cleanPhone = customerPhone.replace(/\s+/g, '');
    if (cleanPhone.length < 9) {
      setErrorMessage('Please provide a valid Kenyan phone number (e.g. 0712 345 678 or 0110 123 456).');
      return;
    }

    setIsSubmitting(true);
    try {
      const zoneId = selectedZone?.id || deliveryZones[0]?.id || 'zone-eldoret-cbd';

      const res = await api.checkout({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        deliveryLocation: {
          county,
          town: town.trim() || 'Eldoret',
          estate: estate.trim(),
          landmark: landmark.trim() || undefined,
          instructions: instructions.trim() || undefined
        },
        deliveryZoneId: zoneId,
        paymentMethod,
        items: items.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity
        }))
      });

      // Confetti celebration!
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Confetti fallback
      }

      clearCart();
      onOrderPlaced(res.order);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order. Please try again or call us.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-zinc-100 bg-[#09090b] font-sans">
        <div className="w-12 h-12 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold font-mono uppercase mb-1">YOUR CART IS EMPTY</h2>
        <p className="text-xs text-zinc-400 max-w-sm mb-4">
          Add items to your cart before proceeding to checkout.
        </p>
        <button
          onClick={() => onNavigate('shop')}
          className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs px-4 py-2 rounded transition"
        >
          BROWSE ELECTRONICS CATALOG
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen py-6 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Title */}
        <div className="text-left mb-6">
          <span className="bg-red-600 text-white text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded tracking-wider inline-flex items-center gap-1 mb-1.5">
            <Flame className="w-3 h-3 fill-white" />
            CASH ON DELIVERY CHECKOUT
          </span>
          <h1 className="text-base sm:text-xl font-black text-zinc-100 tracking-tight font-mono uppercase">COMPLETE YOUR ORDER</h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            No upfront payment needed. We will call you immediately to confirm dispatch and delivery.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-200 rounded text-xs font-mono text-left">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
          {/* Left Column: Delivery & Customer Info */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Customer Contact */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
                <div className="w-5 h-5 rounded bg-red-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  1
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-zinc-100 font-mono uppercase">Contact & Recipient Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Kennedy Kiprotich"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">
                    Phone Number (M-Pesa / Call) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0741 775 878"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block font-mono">Our dispatch team will call this number.</span>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. kennedy@gmail.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block font-mono">Receive electronic invoice receipt.</span>
                </div>
              </div>
            </div>

            {/* 2. Delivery Address */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
                <div className="w-5 h-5 rounded bg-red-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  2
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-zinc-100 font-mono uppercase">Delivery Location in Kenya</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">
                    County <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 cursor-pointer font-mono"
                  >
                    {kenyaCounties.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">
                    Town / City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    placeholder="e.g. Eldoret / Kitale / Nairobi"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">
                    Estate / Street / Building Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={estate}
                    onChange={(e) => setEstate(e.target.value)}
                    placeholder="e.g. Pioneer Estate, Block B / KVDA Plaza / Maili Nne"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">Nearby Landmark / Stage</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Shell Petrol Station / Zion Mall"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">Delivery Instructions</label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Call before arrival / Gate code"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              {/* Delivery Zone Selector */}
              <div className="pt-2">
                <label className="text-[11px] font-mono text-zinc-400 block mb-1.5 uppercase">Select Delivery Turnaround Speed</label>
                <div className="space-y-1.5 font-mono">
                  {deliveryZones.map((z) => (
                    <label
                      key={z.id}
                      className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition ${
                        selectedZone?.id === z.id
                          ? 'border-red-500 bg-red-950/20 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="deliveryZone"
                          checked={selectedZone?.id === z.id}
                          onChange={() => setSelectedZone(z)}
                          className="accent-red-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-zinc-100">{z.name}</div>
                          <div className="text-[10px] text-zinc-400">Estimated: {z.estimatedTime}</div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-400">
                        {z.fee === 0 || (z.freeThreshold && subtotal >= z.freeThreshold)
                          ? 'FREE'
                          : `KSh ${z.fee.toLocaleString()}`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Payment Method: Cash on Delivery */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-3 font-mono">
              <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
                <div className="w-5 h-5 rounded bg-red-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  3
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-zinc-100 uppercase">Payment Method</h3>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-3 rounded border border-red-500 bg-red-950/20 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'CASH_ON_DELIVERY'}
                    onChange={() => setPaymentMethod('CASH_ON_DELIVERY')}
                    className="accent-red-600 mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 uppercase">
                      <Flame className="w-3.5 h-3.5 text-red-500" />
                      CASH ON DELIVERY (Recommended)
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-sans leading-relaxed">
                      Pay via Cash or M-Pesa once your equipment arrives at your doorstep and you have inspected it.
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-sans">Zero financial risk. Guaranteed authentic products backed by official Kenyan warranty.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order */}
          <div className="lg:col-span-5 space-y-4 font-mono">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-4 sticky top-20">
              <h3 className="font-bold text-xs text-zinc-100 pb-2 border-b border-zinc-800 uppercase">
                Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h3>

              {/* Items List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-2.5 items-center">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-10 h-10 rounded object-cover bg-zinc-950 border border-zinc-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 font-sans">
                      <div className="text-xs font-bold text-zinc-100 truncate">{item.product.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        Qty: {item.quantity} × KSh {item.product.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-zinc-100 font-mono">
                      KSh {(item.product.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Calculation */}
              <div className="space-y-1.5 border-t border-zinc-800 pt-3 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span>SUBTOTAL</span>
                  <span className="font-bold text-zinc-100">KSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>DELIVERY ({selectedZone?.name || 'Standard'})</span>
                  <span className="font-bold text-emerald-400">
                    {deliveryFee === 0 ? 'FREE' : `KSh ${deliveryFee.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-zinc-100 pt-2.5 border-t border-zinc-800">
                  <span>TOTAL DUE</span>
                  <span className="text-emerald-400 text-sm">KSh {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Big Place Order Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                id="place-order-button"
                className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 px-3 rounded font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <span>PLACING ORDER...</span>
                ) : (
                  <>
                    <span>CONFIRM & PLACE ORDER (COD)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center space-y-1">
                <div className="text-[10px] text-zinc-400 font-sans">
                  By clicking confirm, you agree to receive a confirmation call from MEGA CITY ELECTRONICS at{' '}
                  <strong className="text-zinc-200 font-mono">{settings.phone}</strong>.
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
