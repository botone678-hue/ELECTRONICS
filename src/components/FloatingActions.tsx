import React from 'react';
import { MessageCircle, Phone, Truck } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ActiveView } from '../types';

export const FloatingActions: React.FC<{ onNavigate: (view: ActiveView, extra?: any) => void }> = ({
  onNavigate
}) => {
  const { settings } = useSettings();

  const whatsappUrl = `https://wa.me/254${settings.whatsapp.replace(/^0/, '')}?text=${encodeURIComponent(
    'Hello MEGA CITY ELECTRONICS, I would like to make an inquiry / place an order with Cash on Delivery.'
  )}`;

  return (
    <div className="fixed bottom-4 right-4 sm:right-5 z-40 flex flex-col items-end gap-2 pointer-events-none font-mono">
      {/* Track My Order Pill */}
      <button
        onClick={() => onNavigate('order-tracking')}
        className="pointer-events-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-[11px] font-bold py-1.5 px-3 rounded shadow-lg border border-zinc-750 backdrop-blur-md flex items-center gap-1.5 transition cursor-pointer"
      >
        <Truck className="w-3.5 h-3.5 text-red-500" />
        <span className="hidden sm:inline">TRACK ORDER</span>
      </button>

      {/* Call Button */}
      <a
        href={`tel:${settings.phone}`}
        className="pointer-events-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-100 p-2.5 rounded shadow-lg border border-zinc-750 flex items-center justify-center transition"
        title={`Call ${settings.phone}`}
      >
        <Phone className="w-4 h-4 text-red-500" />
      </a>

      {/* WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto relative bg-emerald-950 hover:bg-emerald-900 text-emerald-400 p-2.5 rounded shadow-lg border border-emerald-700 flex items-center justify-center transition"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
        </span>
      </a>
    </div>
  );
};
