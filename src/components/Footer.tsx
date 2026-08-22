import React from 'react';
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  ShieldCheck,
  Truck,
  Flame,
  Lock,
  Heart
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ActiveView } from '../types';

interface FooterProps {
  onNavigate: (view: ActiveView, extra?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { settings } = useSettings();

  return (
    <footer className="bg-[#09090b] border-t border-zinc-800 text-zinc-400 text-xs font-sans">
      {/* Top Banner */}
      <div className="bg-zinc-900 border-b border-zinc-800 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-red-600/20 text-red-500 border border-red-600/30 flex items-center justify-center flex-shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h4 className="text-zinc-100 font-bold text-xs sm:text-sm font-mono">ORDER ONLINE • PAY CASH ON DELIVERY</h4>
              <p className="text-zinc-400 text-[11px]">Pay upon delivery & doorstep inspection across all 47 counties.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`tel:${settings.phone}`}
              className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs px-3 py-1.5 rounded transition flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              <span>CALL {settings.phone}</span>
            </a>
            <a
              href={`https://wa.me/254${settings.whatsapp.replace(/^0/, '')}?text=Hello%20MEGA%20CITY%20ELECTRONICS`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-mono font-bold text-xs px-3 py-1.5 rounded border border-emerald-800 transition flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" />
              <span>WHATSAPP</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 text-left">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span className="bg-red-600 text-white font-mono font-black text-[10px] px-1.5 py-0.5 rounded">MEGA</span>
              <span className="text-base font-black tracking-tight text-zinc-100 font-mono">
                CITY <span className="text-red-500">ELECTRONICS</span>
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed max-w-sm">
              Kenya's premier destination for genuine televisions, home audio systems, refrigeration, kitchen appliances, and electrical accessories.
            </p>

            <div className="space-y-1.5 pt-1 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-zinc-300">
                <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span>Along Zion Mall, Eldoret, Kenya</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <Phone className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <a href={`tel:${settings.phone}`} className="hover:text-white font-semibold">
                  {settings.phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span>{settings.businessHours}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono font-bold tracking-wider text-zinc-300 uppercase">Shop Catalog</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={() => onNavigate('shop')} className="hover:text-zinc-100 transition">
                  All Products
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { categoryId: 'cat-tv' })} className="hover:text-zinc-100 transition">
                  Smart & 4K TVs
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { categoryId: 'cat-audio' })} className="hover:text-zinc-100 transition">
                  Woofers & Home Theatres
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { categoryId: 'cat-fridge' })} className="hover:text-zinc-100 transition">
                  Refrigerators & Freezers
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', { categoryId: 'cat-electrical' })} className="hover:text-zinc-100 transition">
                  Electrical Accessories
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('deals')} className="text-amber-400 font-mono font-bold hover:underline">
                  Hot Deals & Clearance
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono font-bold tracking-wider text-zinc-300 uppercase">Customer Support</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={() => onNavigate('order-tracking')} className="hover:text-zinc-100 transition">
                  Track My Order
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('delivery-policy')} className="hover:text-zinc-100 transition">
                  Delivery & Shipping Rates
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-zinc-100 transition">
                  Store Location & Hours
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account')} className="hover:text-zinc-100 transition">
                  My Customer Account
                </button>
              </li>
            </ul>
          </div>

          {/* Legal / Policy */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono font-bold tracking-wider text-zinc-300 uppercase">Guarantees</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Cash on Delivery</span>
              </li>
              <li className="flex items-center gap-1 text-zinc-300">
                <Truck className="w-3.5 h-3.5 text-zinc-500" />
                <span>Doorstep Inspection</span>
              </li>
              <li className="text-zinc-400">12 - 24 Months Official Warranty</li>
              <li className="text-zinc-400">7-Day Free Replacement Policy</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-4 border-t border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-zinc-500">
          <div>
            © {new Date().getFullYear()} MEGA CITY ELECTRONICS. All rights reserved. Along Zion Mall, Eldoret, Kenya.
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <span>PLATFORM:</span>
            <span className="text-red-500 font-bold">MEGA CITY KENYA</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
