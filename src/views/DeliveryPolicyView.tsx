import React from 'react';
import {
  Truck,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  MapPin,
  Flame,
  Phone
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ActiveView } from '../types';

export const DeliveryPolicyView: React.FC<{ onNavigate: (view: ActiveView, extra?: any) => void }> = ({
  onNavigate
}) => {
  const { settings } = useSettings();

  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-screen py-8 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 text-left">
        {/* Title */}
        <div className="space-y-1.5 pb-4 border-b border-zinc-800 font-mono">
          <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider inline-flex items-center gap-1">
            <Flame className="w-3 h-3 fill-white" />
            CASH ON DELIVERY GUARANTEE
          </span>
          <h1 className="text-base sm:text-xl font-black text-zinc-100 tracking-tight uppercase">
            Delivery & Cash on Delivery Policies
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans">
            How we dispatch genuine electronics directly from our Zion Mall showroom to your doorstep across Kenya.
          </p>
        </div>

        {/* Highlight Banner */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-red-600/20 text-red-500 flex items-center justify-center flex-shrink-0 border border-red-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-zinc-100 font-mono uppercase">Zero Pre-Payment Required</h3>
              <p className="text-xs text-zinc-300 font-sans">
                You do NOT pay any deposit before receiving your item. You inspect the box, confirm seal integrity, and test the unit before releasing funds.
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Zones Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-3 font-mono">
          <h3 className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-1.5 uppercase">
            <Truck className="w-4 h-4 text-red-500" />
            Delivery Rates & Turnaround Times
          </h3>

          <div className="divide-y divide-zinc-800 text-xs">
            <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <strong className="text-zinc-100 text-xs block">Eldoret CBD & Immediate Environs</strong>
                <span className="text-zinc-400 text-[11px] font-sans">Pioneer, Kapsoya, Elgon View, West Indies, Maili Nne</span>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-bold text-xs block">FREE Delivery</span>
                <span className="text-zinc-500 text-[10px]">1 - 3 Hours Express</span>
              </div>
            </div>

            <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <strong className="text-zinc-100 text-xs block">Greater Eldoret & Nearby Suburbs</strong>
                <span className="text-zinc-400 text-[11px] font-sans">Kesses, Moi University, Langas, Turbo, Annex, Chepkoilel</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-100 font-bold text-xs block">KSh 300</span>
                <span className="text-zinc-500 text-[10px]">Same Day (2 - 4 Hours)</span>
              </div>
            </div>

            <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <strong className="text-zinc-100 text-xs block">Western & North Rift Hubs</strong>
                <span className="text-zinc-400 text-[11px] font-sans">Kitale, Kapsabet, Bungoma, Kakamega, Kisumu, Nakuru</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-100 font-bold text-xs block">KSh 500</span>
                <span className="text-zinc-500 text-[10px]">Next Day (12 - 24 Hours)</span>
              </div>
            </div>

            <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <strong className="text-zinc-100 text-xs block">Nairobi, Coast & Rest of Kenya</strong>
                <span className="text-zinc-400 text-[11px] font-sans">All 47 Counties via secure courier collection points or doorstep</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-100 font-bold text-xs block">KSh 700</span>
                <span className="text-zinc-500 text-[10px]">24 - 48 Hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Delivery Process */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-3 font-mono">
          <h3 className="text-xs sm:text-sm font-bold text-zinc-100 uppercase">How Cash on Delivery Works</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-1">
              <div className="w-5 h-5 rounded bg-red-600 text-white font-bold flex items-center justify-center text-[10px]">
                1
              </div>
              <h4 className="font-bold text-zinc-100 uppercase text-xs">1. Place Order</h4>
              <p className="text-zinc-400 leading-relaxed font-sans text-[11px]">
                Add products to cart and submit your Kenyan phone number and estate name. No credit card or deposit required.
              </p>
            </div>

            <div className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-1">
              <div className="w-5 h-5 rounded bg-red-600 text-white font-bold flex items-center justify-center text-[10px]">
                2
              </div>
              <h4 className="font-bold text-zinc-100 uppercase text-xs">2. Verification Call</h4>
              <p className="text-zinc-400 leading-relaxed font-sans text-[11px]">
                Our customer dispatch agent will call you from <strong className="text-zinc-200 font-mono">{settings.phone}</strong> to confirm your address and dispatch rider.
              </p>
            </div>

            <div className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-1">
              <div className="w-5 h-5 rounded bg-red-600 text-white font-bold flex items-center justify-center text-[10px]">
                3
              </div>
              <h4 className="font-bold text-zinc-100 uppercase text-xs">3. Inspect & Pay</h4>
              <p className="text-zinc-400 leading-relaxed font-sans text-[11px]">
                When the rider arrives, inspect your brand new electronic unit and pay via Cash or Lipa na M-Pesa.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="p-4 sm:p-5 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-zinc-100 uppercase">Ready to upgrade your electronics?</h4>
            <p className="text-[11px] text-zinc-400 font-sans">Explore over 30+ verified electronics models available for instant dispatch.</p>
          </div>
          <button
            onClick={() => onNavigate('shop')}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded transition self-start sm:self-auto cursor-pointer uppercase"
          >
            START SHOPPING NOW
          </button>
        </div>
      </div>
    </div>
  );
};
