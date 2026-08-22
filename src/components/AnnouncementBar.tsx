import React from 'react';
import { Phone, MapPin, ShieldCheck, Flame, MessageCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface AnnouncementBarProps {
  onNavigateToContact?: () => void;
  onNavigateToDeals?: () => void;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  onNavigateToContact,
  onNavigateToDeals
}) => {
  const { settings } = useSettings();

  return (
    <div id="announcement-bar" className="bg-[#09090b] text-zinc-300 border-b border-zinc-800 text-[11px] py-1.5 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left Side: Cash On Delivery & Hot Deal */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1 bg-red-600 text-white font-black px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
            <Flame className="w-3 h-3 fill-white" />
            CASH ON DELIVERY COUNTRYWIDE
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 text-zinc-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Zero Pre-Payment Required • Inspect Before Paying
          </span>
        </div>

        {/* Right Side: Phone, WhatsApp, Location */}
        <div className="flex items-center gap-3 sm:gap-4 text-zinc-400">
          <a
            href={`tel:${settings.phone}`}
            id="announcement-call-btn"
            className="flex items-center gap-1.5 hover:text-white font-mono font-bold text-zinc-200 transition-colors"
          >
            <Phone className="w-3 h-3 text-red-500" />
            <span>{settings.phone}</span>
          </a>

          <a
            href={`https://wa.me/254${settings.whatsapp.replace(/^0/, '')}?text=Hello%20MEGA%20CITY%20ELECTRONICS%2C%20I%20have%20an%20inquiry.`}
            target="_blank"
            rel="noopener noreferrer"
            id="announcement-whatsapp-btn"
            className="hidden sm:flex items-center gap-1 hover:text-emerald-300 transition-colors font-medium text-emerald-400"
          >
            <MessageCircle className="w-3 h-3" />
            <span>WhatsApp Orders</span>
          </a>

          <button
            onClick={onNavigateToContact}
            id="announcement-location-btn"
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-zinc-300"
          >
            <MapPin className="w-3 h-3 text-red-500" />
            <span>Along Zion Mall</span>
          </button>
        </div>
      </div>
    </div>
  );
};

