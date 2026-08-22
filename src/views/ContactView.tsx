import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  Mail,
  Send,
  ShieldCheck,
  Building,
  Navigation
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const ContactView: React.FC = () => {
  const { settings } = useSettings();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSent(true);
    setName('');
    setPhone('');
    setMessage('');
    setTimeout(() => setIsSent(false), 5000);
  };

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen py-8 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 text-left">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto space-y-1.5 font-mono">
          <span className="text-red-500 font-bold text-[10px] uppercase tracking-wider">SHOWROOM & SUPPORT</span>
          <h1 className="text-base sm:text-xl font-black text-zinc-100 tracking-tight uppercase">Visit Us or Get in Touch</h1>
          <p className="text-[11px] text-zinc-400 font-sans">
            Visit our physical electronics branch Along Zion Mall or contact our customer support team directly.
          </p>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
          {/* Card 1: Location */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-2">
            <div className="w-8 h-8 rounded bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase">Physical Location</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              <strong className="text-zinc-200 font-mono">MEGA CITY ELECTRONICS</strong>
              <br />
              Along Zion Mall, Uganda Road
              <br />
              Eldoret, Kenya
            </p>
            <div className="pt-1 text-[10px] text-red-400 font-bold">
              SHOWROOM WALK-INS & PICKUPS WELCOME
            </div>
          </div>

          {/* Card 2: Phone & WhatsApp */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-2">
            <div className="w-8 h-8 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Phone className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase">Hotline & WhatsApp</h3>
            <div className="space-y-1 text-xs font-mono">
              <div className="text-zinc-400 text-[10px]">Call Us:</div>
              <a href={`tel:${settings.phone}`} className="text-xs font-bold text-zinc-100 hover:text-red-400 block">
                {settings.phone}
              </a>
              <div className="text-zinc-400 text-[10px] pt-0.5">WhatsApp Orders:</div>
              <a
                href={`https://wa.me/254${settings.whatsapp.replace(/^0/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-400 hover:underline block"
              >
                +254 {settings.whatsapp.replace(/^0/, '')}
              </a>
            </div>
          </div>

          {/* Card 3: Business Hours */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg space-y-2">
            <div className="w-8 h-8 rounded bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase">Working Hours</h3>
            <div className="space-y-0.5 text-[11px] text-zinc-400 font-sans">
              <div>
                <span className="text-zinc-200 font-mono font-bold">Mon - Sat:</span> 8:00 AM - 8:00 PM
              </div>
              <div>
                <span className="text-zinc-200 font-mono font-bold">Sun & Holidays:</span> 10:00 AM - 6:00 PM
              </div>
              <div className="pt-1 text-emerald-400 font-mono font-bold text-[10px]">Online orders received 24/7</div>
            </div>
          </div>
        </div>

        {/* 2-Column: Showroom Map Card & Direct Message Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Showroom Information */}
          <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-lg space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800 font-mono">
              <Building className="w-4 h-4 text-red-500" />
              <h3 className="text-xs sm:text-sm font-bold text-zinc-100 uppercase">Zion Mall Showroom Experience</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Step into our modern electronics experience center Along Zion Mall to test television panel clarity,
              experience high-fidelity subwoofer bass acoustics in person, or pick up your reserved online orders with
              instant Cash or M-Pesa on Delivery.
            </p>

            <div className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-1.5 text-xs font-sans">
              <div className="font-mono font-bold text-zinc-100 text-[11px] uppercase">Showroom Services:</div>
              <ul className="space-y-1 text-zinc-400 text-[11px]">
                <li>• Live sound tests for woofers and home theatres</li>
                <li>• Free TV unboxing, testing & warranty registration</li>
                <li>• Certified technician advice for electrical accessories</li>
                <li>• Instant in-store collection with zero waiting time</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <a
                href={`https://maps.google.com/?q=Zion+Mall+Eldoret`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-mono font-bold px-3 py-1.5 rounded border border-zinc-700 transition"
              >
                <Navigation className="w-3.5 h-3.5 text-red-500" />
                <span>GET DIRECTIONS TO ZION MALL</span>
              </a>
            </div>
          </div>

          {/* Right: Message Form */}
          <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-lg space-y-3 font-mono">
            <h3 className="text-xs sm:text-sm font-bold text-zinc-100 pb-2 border-b border-zinc-800 uppercase">
              Send Inquiry or Custom Quote
            </h3>

            {isSent && (
              <div className="p-2.5 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded text-xs font-bold font-mono">
                Thank you! Your message has been received. Our sales team will call you back shortly.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
              <div>
                <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Moses Odhiambo"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Phone Number (M-Pesa / Call)</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0741 775 878"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-0.5 text-[11px] uppercase">Product Inquiry / Message</label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what product you're looking for or any delivery questions..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-100 outline-none focus:border-red-500 font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded text-xs flex items-center justify-center gap-1.5 transition cursor-pointer uppercase"
              >
                <Send className="w-3.5 h-3.5" />
                <span>SEND MESSAGE TO MEGA CITY</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
