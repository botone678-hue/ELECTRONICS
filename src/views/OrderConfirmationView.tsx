import React from 'react';
import {
  CheckCircle2,
  Truck,
  Phone,
  MessageCircle,
  MapPin,
  Flame,
  ArrowRight,
  ShieldCheck,
  Package
} from 'lucide-react';
import { Order, ActiveView } from '../types';
import { useSettings } from '../context/SettingsContext';

interface OrderConfirmationViewProps {
  order: Order | null;
  onNavigate: (view: ActiveView, extra?: any) => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({ order, onNavigate }) => {
  const { settings } = useSettings();

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-zinc-100 bg-[#09090b] font-sans">
        <h2 className="text-sm font-bold font-mono uppercase mb-2">No active order found</h2>
        <button
          onClick={() => onNavigate('shop')}
          className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs px-4 py-2 rounded transition"
        >
          BROWSE CATALOG
        </button>
      </div>
    );
  }

  const whatsappUrl = `https://wa.me/254${settings.whatsapp.replace(/^0/, '')}?text=${encodeURIComponent(
    `Hello MEGA CITY ELECTRONICS, I have just placed order ${order.orderNumber} for KSh ${order.total.toLocaleString()} with Cash on Delivery. Please confirm dispatch.`
  )}`;

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen py-8 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-left space-y-5">
        {/* Success Banner */}
        <div className="bg-zinc-900 border border-emerald-800/80 rounded-lg p-5 text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <span className="bg-emerald-950 text-emerald-400 font-mono font-bold text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider border border-emerald-800">
              ORDER RECEIVED • CASH ON DELIVERY
            </span>
            <h1 className="text-base sm:text-xl font-mono font-black text-zinc-100 tracking-tight mt-2 uppercase">
              Thank You, {order.customerName}!
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Your order has been recorded in our dispatch system. We will call you shortly to confirm delivery.
            </p>
          </div>

          {/* Order Tracking Badge */}
          <div className="bg-zinc-950 border border-zinc-800 rounded p-3 inline-block text-left w-full sm:w-auto">
            <div className="text-[10px] text-zinc-400 font-mono font-bold uppercase">ORDER TRACKING NUMBER</div>
            <div className="text-lg sm:text-xl font-mono font-black text-red-500 tracking-wider">
              {order.orderNumber}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Keep this number to track delivery updates in real-time.</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono">
          <button
            onClick={() => onNavigate('order-tracking', { orderQuery: order.orderNumber })}
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>TRACK ORDER STATUS LIVE</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span>NOTIFY STORE ON WHATSAPP</span>
          </a>
        </div>

        {/* Order Details Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
          <h3 className="font-mono font-bold text-xs text-zinc-100 pb-2 border-b border-zinc-800 flex items-center justify-between uppercase">
            <span>Order Summary</span>
            <span className="text-[10px] font-normal text-zinc-400">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
            </span>
          </h3>

          {/* Items */}
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 bg-zinc-950 p-2.5 rounded border border-zinc-800">
                <img
                  src={item.image}
                  alt={item.productName}
                  className="w-10 h-10 object-cover rounded bg-zinc-900 border border-zinc-800"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-100 truncate">{item.productName}</div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    Qty: {item.quantity} × KSh {item.priceSnapshot.toLocaleString()}
                  </div>
                </div>
                <div className="text-xs font-bold text-zinc-100 font-mono">KSh {item.subtotal.toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-xs text-zinc-300 font-mono">
            <div className="flex justify-between">
              <span>SUBTOTAL</span>
              <span className="font-bold text-zinc-100">KSh {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>DELIVERY ({order.deliveryZoneName})</span>
              <span className="font-bold text-emerald-400">
                {order.deliveryFee === 0 ? 'FREE' : `KSh ${order.deliveryFee.toLocaleString()}`}
              </span>
            </div>
            <div className="flex justify-between text-xs font-bold text-zinc-100 pt-2 border-t border-zinc-800">
              <span>TOTAL PAYABLE UPON ARRIVAL</span>
              <span className="text-emerald-400 text-sm">KSh {order.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Destination */}
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-1 text-xs text-zinc-300">
            <div className="font-mono font-bold text-zinc-100 flex items-center gap-1.5 mb-1 uppercase text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>Delivery Address</span>
            </div>
            <div className="font-mono text-zinc-200">
              {order.customerName} ({order.customerPhone})
            </div>
            <div className="text-zinc-400 text-[11px]">
              {order.deliveryLocation.estate}, {order.deliveryLocation.town}, {order.deliveryLocation.county}
            </div>
            {order.deliveryLocation.landmark && (
              <div className="text-zinc-500 text-[10px]">Landmark: {order.deliveryLocation.landmark}</div>
            )}
            <div className="pt-1.5 text-emerald-400 font-mono font-bold flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Payment Mode: Cash or M-Pesa on Delivery</span>
            </div>
          </div>
        </div>

        {/* Back to Home CTA */}
        <div className="text-center pt-2">
          <button
            onClick={() => onNavigate('home')}
            className="text-xs font-mono font-bold text-zinc-400 hover:text-white underline cursor-pointer"
          >
            ← CONTINUE SHOPPING AT MEGA CITY ELECTRONICS
          </button>
        </div>
      </div>
    </div>
  );
};
