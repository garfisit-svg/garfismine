import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Venue, Offer } from '../../types';
import { Plus, Tag, ToggleLeft, ToggleRight, Sparkles, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface OffersTabProps {
  venue: Venue | null;
}

export const OffersTab: React.FC<OffersTabProps> = ({ venue }) => {
  const { offers, createOffer, deactivateOffer } = useApp();

  const [showCreateOffer, setShowCreateOffer] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState(15);
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('');
  const [minHours, setMinHours] = useState(1);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  const [validFromTime, setValidFromTime] = useState('09:00');
  const [validToTime, setValidToTime] = useState('23:00');

  const currentVenueOffers = useMemo(() => {
    if (!venue) return [];
    return offers.filter(o => o.venue_id === venue.id);
  }, [venue, offers]);

  // Combined Live preview text summarizing fields
  const compiledSummaryPreview = useMemo(() => {
    const valueStr = discountType === 'percentage' ? `${discountValue}%` : `₹${discountValue}`;
    const descText = discountType === 'percentage' && maxDiscount !== '' ? ` (capped at ₹${maxDiscount} max)` : '';
    const hourLine = `on bookings of minimum ${minHours} hours`;
    const daysLine = selectedDays.length === 7 ? 'Applied on all days' : `Applied on specified days (${selectedDays.join(', ')})`;
    const rangeLine = `Valid daily from ${validFromTime} to ${validToTime}.`;

    return `This campaign will auto-apply a ${valueStr} discount${descText} ${hourLine}. ${daysLine}. ${rangeLine} Active immediately upon submission.`;
  }, [discountType, discountValue, maxDiscount, minHours, selectedDays, validFromTime, validToTime]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleCreateOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue) return;
    if (!title) {
      toast.error('Offer Title camp is required');
      return;
    }

    createOffer({
      venue_id: venue.id,
      title,
      description: description || null,
      discount_type: discountType,
      discount_value: Number(discountValue),
      max_discount_amount: maxDiscount === '' ? null : Number(maxDiscount),
      min_booking_hours: Number(minHours),
      valid_days: selectedDays,
      valid_from_time: validFromTime || null,
      valid_to_time: validToTime || null,
      valid_from_date: null,
      valid_to_date: null,
      is_active: true
    });

    toast.success('Campaign launched and live for checkout autoapplication!');
    setShowCreateOffer(false);
    
    // reset form
    setTitle('');
    setDescription('');
    setDiscountValue(15);
    setMaxDiscount('');
    setMinHours(1);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex justify-between items-center bg-[#12121A] p-5 rounded-2xl border border-border-dark">
        <div>
          <h4 className="font-bold font-display text-white text-base">Discount Campaigns ({currentVenueOffers.length})</h4>
          <p className="text-xs text-text-secondary">Create promo campaigns and high-occupancy Happy Hour filters.</p>
        </div>
        {!showCreateOffer && (
          <button
            onClick={() => setShowCreateOffer(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-gradient text-white flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>📢 Create New Offer</span>
          </button>
        )}
      </div>

      {showCreateOffer ? (
        /* CREATE FORM SCREEN */
        <div className="bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl space-y-6">
          <div className="pb-2 border-b border-border-dark flex justify-between items-center">
            <h5 className="font-bold text-white text-base font-display">Configure Promo Campaign</h5>
            <button
              onClick={() => setShowCreateOffer(false)}
              className="px-3 py-1.5 bg-[#12121A] rounded-lg border border-border-dark text-text-secondary text-xs font-bold hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateOfferSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Promo title name (visible to players)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midweek High Energy Happy Hour"
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Campaign Tagline description</label>
                <input
                  type="text"
                  placeholder="e.g. 15% discount on early afternoon locks!"
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Campaign style</label>
                <select
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-sm text-white"
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as any)}
                >
                  <option value="percentage">% Percentage Off</option>
                  <option value="flat">₹ Flat Settle Off</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Value rate</label>
                <input
                  type="number"
                  required
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-sm outline-none text-white focus:border-brand-purple font-mono"
                  value={discountValue}
                  onChange={e => setDiscountValue(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Maximum discount cap (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-sm outline-none text-white"
                  value={maxDiscount}
                  onChange={e => setMaxDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Min reserve slot length</label>
                <select
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-sm text-white"
                  value={minHours}
                  onChange={e => setMinHours(Number(e.target.value))}
                >
                  <option value="1">1 Hour Minimum</option>
                  <option value="2">2 Hours Minimum</option>
                  <option value="3">3 Hours Minimum</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Valid Daily from Hour</label>
                <input
                  type="time"
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-sm outline-none text-white font-mono"
                  value={validFromTime}
                  onChange={e => setValidFromTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Valid Daily to Hour</label>
                <input
                  type="time"
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-sm outline-none text-white font-mono font-bold"
                  value={validToTime}
                  onChange={e => setValidToTime(e.target.value)}
                />
              </div>
            </div>

            {/* Applicable days */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1.5">Applicable Days</label>
              <div className="flex flex-wrap gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`py-1.5 px-3.5 border rounded-lg text-xs font-semibold hover:border-brand-purple/40 cursor-pointer transition ${selectedDays.includes(day) ? 'bg-[#7C3AED]/20 border-brand-purple text-white' : 'bg-[#12121A] border-border-dark text-text-secondary'}`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* CAMPAIGN LIVE PREVIEW SUMMARY CHECKER */}
            <div className="bg-[#12121A] border border-border-dark p-4 rounded-xl space-y-2">
              <h6 className="font-bold text-xs uppercase tracking-widest text-[#a8a8cf] font-mono flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand-purple animate-bounce" />
                <span>Computed live summary preview</span>
              </h6>
              <p className="text-xs text-text-secondary leading-relaxed bg-black/20 p-3 rounded border border-border-dark font-mono">
                {compiledSummaryPreview}
              </p>
            </div>

            <button
              type="submit"
              className="py-3 px-8 rounded-lg btn-gradient text-white text-xs font-bold uppercase tracking-widest block w-full sm:w-max transition uppercase"
            >
              🚀 Launch Discount Campaign
            </button>

          </form>
        </div>
      ) : (
        /* OFFER CAMPAIGN CARDS CATALOG */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {currentVenueOffers.map(o => (
            <div key={o.id} className="bg-[#1A1A2E] border border-border-dark p-4 rounded-2xl flex flex-col justify-between hover:border-[#2A2A3E] transition relative overflow-hidden">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-white text-base font-display">{o.title}</h5>
                    <p className="text-xs text-text-secondary mt-0.5">{o.description || 'Promotional coupon.'}</p>
                  </div>
                  
                  <span className="text-xs text-brand-purple font-mono font-bold bg-[#7C3AED]/10 px-2.5 py-0.5 rounded border border-[#7C3AED]/20">
                    {o.discount_type === 'percentage' ? `${o.discount_value}% OFF` : `₹${o.discount_value} FLAT`}
                  </span>
                </div>

                <div className="bg-[#12121A] p-3 rounded-xl border border-border-dark text-[10px] sm:text-xs text-[#a8a8cf] space-y-1 font-mono leading-tight">
                  <div className="flex justify-between">
                    <span>Days Valid:</span>
                    <span className="text-white">{o.valid_days.length === 7 ? 'Daily' : `${o.valid_days.length} Days`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timing margins:</span>
                    <span className="text-white">{o.valid_from_time || '09:00'} to {o.valid_to_time || '23:00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min reserve limit:</span>
                    <span className="text-white">{o.min_booking_hours} Hour{o.min_booking_hours > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border-dark/50">
                    <span>Usage Logs Claimed:</span>
                    <span className="text-emerald-400 font-bold">{o.usage_count} times</span>
                  </div>
                </div>
              </div>

              {o.is_active ? (
                <button
                  type="button"
                  onClick={() => {
                    deactivateOffer(o.id);
                    toast.success('Campaign deactivated!');
                  }}
                  className="py-1.5 px-3 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold rounded-lg mt-4 cursor-pointer"
                >
                  Deactivate Promotion
                </button>
              ) : (
                <span className="text-[10px] text-text-secondary block mt-4 text-center leading-normal">Retired logs</span>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
