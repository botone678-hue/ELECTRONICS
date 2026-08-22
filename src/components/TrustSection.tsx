import React from 'react';
import { ShieldCheck, Truck, PhoneCall, RotateCcw, MapPin, Sparkles, CheckCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const TrustSection: React.FC<{ onNavigateToContact?: () => void; onNavigateToPolicy?: () => void }> = ({
  onNavigateToContact,
  onNavigateToPolicy
}) => {
  const { settings } = useSettings();

  const trustPillars = [
    {
      icon: <ShieldCheck className="w-4 h-4 text-red-500" />,
      title: 'Cash on Delivery',
      desc: 'Pay zero upfront. Inspect equipment at your doorstep before paying via M-Pesa or Cash.'
    },
    {
      icon: <Truck className="w-4 h-4 text-emerald-400" />,
      title: 'Nationwide Delivery',
      desc: 'Same-day in Eldoret & fast 24-48h parcel transit across all 47 counties in Kenya.'
    },
    {
      icon: <CheckCircle className="w-4 h-4 text-blue-400" />,
      title: '100% Genuine & Warranty',
      desc: 'All TVs, audio systems, and electricals carry verified official Kenya warranties.'
    },
    {
      icon: <MapPin className="w-4 h-4 text-amber-400" />,
      title: 'Physical Showroom',
      desc: 'Visit us Along Zion Mall for live sound demos, testing, and immediate customer pickup.'
    }
  ];

  return (
    <section className="py-6 bg-[#09090b] border-b border-zinc-800 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {trustPillars.map((pillar, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-lg flex items-start gap-3 hover:border-zinc-700 transition"
            >
              <div className="p-2 bg-zinc-950 rounded border border-zinc-800 flex-shrink-0">
                {pillar.icon}
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-zinc-100 mb-0.5">{pillar.title}</h3>
                <p className="text-[11px] text-zinc-400 leading-normal">{pillar.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
