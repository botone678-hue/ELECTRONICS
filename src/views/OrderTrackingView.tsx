import React, { useState, useEffect } from 'react';
import {
  Search,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Package,
  AlertCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { api } from '../services/api';
import { useRealtime } from '../hooks/useRealtime';
import { useSettings } from '../context/SettingsContext';

export const OrderTrackingView: React.FC<{ initialQuery?: string }> = ({ initialQuery }) => {
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle automatic search if query passed
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  // Real-time SSE updates for the currently viewed order
  useRealtime({
    onOrderStatusUpdated: (payload) => {
      if (order && (payload.orderId === order.id || payload.orderNumber === order.orderNumber)) {
        setOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: payload.status as OrderStatus,
            statusHistory: payload.history || prev.statusHistory
          };
        });
      }
    }
  });

  const handleSearch = async (queryToSearch?: string) => {
    const q = (queryToSearch || searchQuery).trim();
    if (!q) {
      setError('Please enter your Order Number (e.g. MC-2026-0001) or Phone Number.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const data = await api.trackOrder(q);
      setOrder(data.order);
    } catch (err: any) {
      setOrder(null);
      setError(err.message || 'No active order found with this reference number.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps: { key: OrderStatus; label: string; desc: string }[] = [
    { key: 'ORDER_RECEIVED', label: 'Order Received', desc: 'Order entered into our system' },
    { key: 'CONFIRMED', label: 'Order Confirmed', desc: 'Verified by Mega City team' },
    { key: 'PROCESSING', label: 'Packaging', desc: 'Inspecting equipment at Zion Mall' },
    { key: 'READY_FOR_DELIVERY', label: 'Ready for Dispatch', desc: 'Assigned to delivery rider' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'On its way to your doorstep' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Inspected and payment received' }
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === 'CANCELLED') return -1;
    return steps.findIndex((s) => s.key === status);
  };

  const currentStepIdx = order ? getStepIndex(order.status) : 0;

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen py-8 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 text-left">
        {/* Header */}
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <div className="w-10 h-10 rounded bg-red-600/20 text-red-500 flex items-center justify-center mx-auto mb-1.5 border border-red-500/30">
            <Truck className="w-5 h-5" />
          </div>
          <h1 className="text-base sm:text-xl font-mono font-black text-zinc-100 tracking-tight uppercase">LIVE ORDER TRACKING</h1>
          <p className="text-[11px] text-zinc-400">
            Track your electronics shipment live from our showroom Along Zion Mall straight to your doorstep.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-zinc-900 border border-zinc-800 p-3 sm:p-4 rounded-lg shadow-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex flex-col sm:flex-row gap-2 font-mono"
          >
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Order Number (e.g. MC-2026-0001) or Phone Number"
                className="w-full bg-zinc-950 border border-zinc-800 rounded py-2 pl-9 pr-3 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isLoading ? 'TRACKING...' : 'TRACK ORDER'}</span>
            </button>
          </form>

          {error && (
            <div className="mt-2.5 p-2.5 bg-red-950/80 border border-red-800 text-red-300 rounded text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Order Details Result */}
        {order && (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-4 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">ORDER TRACKING</span>
                  <div className="text-base sm:text-xl font-mono font-black text-zinc-100">{order.orderNumber}</div>
                </div>
                <div className="flex flex-col sm:items-end">
                  <span className="text-[10px] text-zinc-400 uppercase">Total Due (Cash on Delivery)</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400">KSh {order.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Progress Steps Visualizer */}
              {order.status === 'CANCELLED' ? (
                <div className="p-3 bg-red-950/60 border border-red-800 rounded text-red-300 text-xs font-bold text-center">
                  This order has been cancelled. Please contact support at {settings.phone} for inquiries.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-6 gap-2 text-center text-xs">
                    {steps.map((s, idx) => {
                      const isCompleted = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      return (
                        <div key={s.key} className="space-y-1.5">
                          <div
                            className={`w-7 h-7 rounded mx-auto flex items-center justify-center font-bold text-xs transition ${
                              isCompleted
                                ? 'bg-red-600 text-white'
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            } ${isCurrent ? 'ring-2 ring-red-500/50' : ''}`}
                          >
                            {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <div className={`font-bold text-[11px] leading-tight ${isCompleted ? 'text-zinc-100' : 'text-zinc-500'}`}>
                            {s.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mobile Step List */}
                  <div className="sm:hidden space-y-2">
                    {steps.map((s, idx) => {
                      const isCompleted = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      return (
                        <div
                          key={s.key}
                          className={`flex items-start gap-2.5 p-2 rounded ${
                            isCurrent ? 'bg-red-950/40 border border-red-900/50' : 'bg-zinc-950'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs mt-0.5 ${
                              isCompleted ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <div>
                            <div className={`text-xs font-bold ${isCompleted ? 'text-zinc-100' : 'text-zinc-400'}`}>
                              {s.label}
                            </div>
                            <div className="text-[10px] text-zinc-500">{s.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status Timeline Logs */}
              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Timeline Activity</h4>
                <div className="space-y-1.5 divide-y divide-zinc-800 text-xs">
                  {order.statusHistory.map((item, idx) => (
                    <div key={idx} className="pt-1.5 first:pt-0 flex justify-between gap-3">
                      <div>
                        <span className="font-bold text-zinc-100 block">{item.status.replace(/_/g, ' ')}</span>
                        {item.note && <span className="text-zinc-400 text-[10px]">{item.note}</span>}
                      </div>
                      <span className="text-zinc-500 text-[10px] whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Items & Destination Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
                {/* Items */}
                <div className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-1.5">
                  <span className="font-mono font-bold text-zinc-100 block text-[11px] uppercase">Package Contents ({order.items.length} items)</span>
                  <div className="space-y-1.5">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-zinc-300 text-xs">
                        <span className="truncate pr-2">
                          {it.quantity}x {it.productName}
                        </span>
                        <span className="font-mono font-bold text-zinc-100 whitespace-nowrap">KSh {it.subtotal.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery */}
                <div className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-1 text-zinc-300">
                  <span className="font-mono font-bold text-zinc-100 block mb-1 flex items-center gap-1.5 text-[11px] uppercase">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    Delivery Destination
                  </span>
                  <div className="font-mono text-zinc-200">
                    {order.customerName} ({order.customerPhone})
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {order.deliveryLocation.estate}, {order.deliveryLocation.town}
                  </div>
                  <div className="text-emerald-400 font-mono font-bold text-[11px] pt-0.5">
                    Cash on Delivery ({order.deliveryZoneName})
                  </div>
                </div>
              </div>

              {/* Assistance Hotlines */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5 text-xs border-t border-zinc-800 font-mono">
                <span className="text-zinc-400 text-[11px] font-sans">Need to change delivery address or timing?</span>
                <div className="flex gap-2">
                  <a
                    href={`tel:${settings.phone}`}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-1.5 px-2.5 rounded text-xs flex items-center gap-1.5 transition"
                  >
                    <Phone className="w-3 h-3 text-red-500" />
                    <span>CALL STORE</span>
                  </a>
                  <a
                    href={`https://wa.me/254${settings.whatsapp.replace(/^0/, '')}?text=${encodeURIComponent(
                      `Hello MEGA CITY ELECTRONICS, I am checking on order ${order.orderNumber}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-1.5 px-2.5 rounded text-xs flex items-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>WHATSAPP</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
