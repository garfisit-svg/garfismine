import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Booking, Venue, VenueResource } from '../../types';
import { Search, RotateCcw, Copy, Trash2, Calendar, FileText, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface BookingsTabProps {
  venue: Venue | null;
  onOpenWalkIn: () => void;
}

export const BookingsTab: React.FC<BookingsTabProps> = ({ venue, onOpenWalkIn }) => {
  const { 
    bookings, resources, profiles, 
    ownerCheckIn, ownerNoShow, cancelBooking, ownerCompleteBooking 
  } = useApp();

  // Filter States
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Workflow Confirmation Modals
  const [cancelTargetBooking, setCancelTargetBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('Venue Operational Issues');
  
  const [noShowTargetBooking, setNoShowTargetBooking] = useState<Booking | null>(null);
  const [completeTargetBooking, setCompleteTargetBooking] = useState<Booking | null>(null);

  // Active resource list
  const currentVenueResources = useMemo(() => {
    if (!venue) return [];
    return resources.filter(r => r.venue_id === venue.id);
  }, [venue, resources]);

  // Copy booking reference
  const handleCopyRef = (refStr: string) => {
    navigator.clipboard.writeText(refStr);
    toast.success(`Copied referee ${refStr}`);
  };

  // Main filter calculation
  const filteredBookings = useMemo(() => {
    if (!venue) return [];
    
    let base = bookings.filter(b => b.venue_id === venue.id);
    const todayStr = new Date().toISOString().split('T')[0];

    // Search query matches
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      base = base.filter(b => 
        b.booking_ref.toLowerCase().includes(q) || 
        (b.walk_in_customer_name && b.walk_in_customer_name.toLowerCase().includes(q)) ||
        (b.walk_in_customer_phone && b.walk_in_customer_phone.includes(q))
      );
    }

    // Status matching
    if (statusFilter !== 'all') {
      base = base.filter(b => b.booking_status === statusFilter);
    }

    // Payment matching
    if (paymentFilter !== 'all') {
      base = base.filter(b => b.payment_method === paymentFilter);
    }

    // Resource matching
    if (resourceFilter !== 'all') {
      base = base.filter(b => b.resource_id === resourceFilter);
    }

    // Date range mapping
    if (dateRange === 'today') {
      base = base.filter(b => b.booking_date === todayStr);
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      base = base.filter(b => b.booking_date === yStr);
    } else if (dateRange === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      base = base.filter(b => new Date(b.booking_date) >= sevenDaysAgo);
    } else if (dateRange === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      base = base.filter(b => new Date(b.booking_date) >= thirtyDaysAgo);
    } else if (customFrom && customTo) {
      base = base.filter(b => b.booking_date >= customFrom && b.booking_date <= customTo);
    }

    return base.reverse(); // Newest first
  }, [venue, bookings, searchTerm, statusFilter, paymentFilter, resourceFilter, dateRange, customFrom, customTo]);

  // Compute stats on filtered list
  const summary = useMemo(() => {
    const total = filteredBookings.length;
    const revenue = filteredBookings
      .filter(b => b.booking_status === 'completed' || b.booking_status === 'checked_in' || b.booking_status === 'confirmed')
      .reduce((acc, curr) => acc + curr.final_amount, 0);

    const online = filteredBookings.filter(b => b.payment_method === 'online' || b.payment_method === 'token_advance').length;
    const walkin = filteredBookings.filter(b => b.payment_method === 'walk_in').length;
    const hold = filteredBookings.filter(b => b.payment_method === 'pay_at_venue').length;
    const cancellations = filteredBookings.filter(b => b.booking_status === 'cancelled').length;

    return { total, revenue, online, walkin, hold, cancellations };
  }, [filteredBookings]);

  const handleClearFilters = () => {
    setDateRange('all');
    setCustomFrom('');
    setCustomTo('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setResourceFilter('all');
    setSearchTerm('');
    toast('Filters fully reset', { icon: '🔄' });
  };

  const executeCompleteSession = () => {
    if (completeTargetBooking) {
      ownerCompleteBooking(completeTargetBooking.id);
      toast.success('Session marked completed! Thank you alert triggered 🥳');
      setCompleteTargetBooking(null);
    }
  };

  const executeNoShowMark = () => {
    if (noShowTargetBooking) {
      ownerNoShow(noShowTargetBooking.id);
      toast.success('Client marked No-Show. Slot recycled successfully!');
      setNoShowTargetBooking(null);
    }
  };

  const executeCancellation = async () => {
    if (cancelTargetBooking) {
      try {
        await cancelBooking(cancelTargetBooking.id, cancelReason);
        toast.success('Booking cancelled. Settle refund dispatched successfully!');
        setCancelTargetBooking(null);
      } catch (err: any) {
        toast.error(err.message || 'Can not cancel');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* FILTER CONTROL WRAPPER */}
      <div className="bg-[#12121A] p-5 rounded-2xl border border-border-dark space-y-4">
        <h4 className="font-bold text-white font-display text-sm uppercase tracking-wider">🛠️ Filter Bookings Catalog</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Search Term */}
          <div>
            <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Search ID/Client</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="GARF-XXXXX or name"
                className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-brand-purple text-white"
              />
            </div>
          </div>

          {/* Date Options */}
          <div>
            <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Date Interval</label>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
              className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg p-2 text-xs outline-none text-white focus:border-brand-purple"
            >
              <option value="all">All Available Records</option>
              <option value="today">Today's Lists</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>

          {/* Status Options */}
          <div>
            <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Booking Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg p-2 text-xs outline-none text-white"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="held">Soft Hold</option>
              <option value="checked_in">Active (Checked In)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          {/* Type Payments */}
          <div>
            <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Payment Method</label>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg p-2 text-xs outline-none text-white"
            >
              <option value="all">All Methods</option>
              <option value="online">💳 Online Pre-paid</option>
              <option value="token_advance">🔐 Token (30% Advance)</option>
              <option value="pay_at_venue">⏳ Pay at Venue (Holds)</option>
              <option value="walk_in">🚶 Walk-In record</option>
            </select>
          </div>

        </div>

        {/* Custom and Action buttons combo */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1 border-t border-border-dark/40">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-secondary font-mono">Custom Range:</span>
            <input
              type="date"
              value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); setDateRange('all'); }}
              className="bg-[#1A1A2E] border border-border-dark p-1 rounded text-xs outline-none font-mono text-white"
            />
            <span className="text-text-secondary text-xs">-</span>
            <input
              type="date"
              value={customTo}
              onChange={e => { setCustomTo(e.target.value); setDateRange('all'); }}
              className="bg-[#1A1A2E] border border-border-dark p-1 rounded text-xs outline-none font-mono text-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClearFilters}
              type="button"
              className="px-3.5 py-1.5 bg-[#1A1A2E] border border-border-dark rounded-lg text-xs font-bold text-text-secondary hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
            <button
              onClick={onOpenWalkIn}
              type="button"
              className="px-4 py-1.5 btn-gradient text-white font-bold rounded-lg text-xs uppercase flex items-center gap-1 cursor-pointer"
            >
              <span>＋ Walk-in Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUMMARY DISPLAY CARD STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#1A1A2E] p-3 rounded-xl border border-border-dark text-center">
          <span className="text-[9px] text-text-secondary uppercase">Active List Block</span>
          <p className="text-xl font-black text-white font-mono mt-0.5">{summary.total}</p>
        </div>
        <div className="bg-[#1A1A2E] p-3 rounded-xl border border-border-dark text-center">
          <span className="text-[9px] text-text-secondary uppercase">Sum Estimated</span>
          <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">₹{summary.revenue}</p>
        </div>
        <div className="bg-[#1A1A2E] p-3 rounded-xl border border-border-dark text-center">
          <span className="text-[9px] text-text-secondary uppercase">Online/Token flow</span>
          <p className="text-xl font-black text-[#7C3AED] font-mono mt-0.5">{summary.online}</p>
        </div>
        <div className="bg-[#1A1A2E] p-3 rounded-xl border border-border-dark text-center">
          <span className="text-[9px] text-text-secondary uppercase">Walk-In Sessions</span>
          <p className="text-xl font-black text-brand-cyan font-mono mt-0.5">{summary.walkin}</p>
        </div>
        <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-center col-span-2 md:col-span-1">
          <span className="text-[9px] text-red-400 uppercase">Cancellations</span>
          <p className="text-xl font-black text-red-400 font-mono mt-0.5">{summary.cancellations}</p>
        </div>
      </div>

      {/* BOOKINGS TABLE CATALOG */}
      <div className="bg-[#1A1A2E] border border-border-dark rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#12121A] text-text-secondary uppercase tracking-wider font-mono text-[10px] border-b border-border-dark">
                <th className="py-3 px-4">Ref/Copy</th>
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3">Arena Asset</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Hours Block</th>
                <th className="py-3 px-3">Gross Settle</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Interactive Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C2D]">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 p-4 text-center text-text-secondary">
                    <span className="text-4xl">🗄️</span>
                    <h5 className="font-bold text-white text-sm mt-3">No matching booking logs present</h5>
                    <p className="text-xs text-text-secondary/60 mt-1">Refine your dates range filters or log a live Walk-in bookable above!</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => {
                  const correspondingRes = currentVenueResources.find(r => r.id === b.resource_id);
                  const isToken = b.payment_method === 'token_advance';
                  const isHold = b.payment_method === 'pay_at_venue';
                  const clientProfile = profiles?.find(p => p.id === b.customer_id);
                  const clientName = b.walk_in_customer_name || clientProfile?.full_name || 'Anonymous player';
                  const clientPhone = b.walk_in_customer_phone || clientProfile?.phone || '';

                  return (
                    <tr key={b.id} className="hover:bg-[#12121A]/30 transition text-white">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleCopyRef(b.booking_ref)}
                          className="flex items-center gap-1 font-mono hover:text-brand-purple text-[#a8a8cf] font-bold text-[11px] bg-[#12121A] px-2 py-1 rounded border border-border-dark hover:border-brand-purple/40 cursor-pointer"
                        >
                          <span>{b.booking_ref}</span>
                          <Copy className="h-3 w-3" />
                        </button>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white">{clientName}</div>
                        {clientPhone && (
                          <div className="text-[10px] text-text-secondary/70 font-mono mt-0.5">{clientPhone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="bg-[#12121A] px-2 py-0.5 rounded border border-border-dark font-semibold">
                          {correspondingRes?.name || 'Default Rig'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-text-secondary">
                        {b.booking_date}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs">
                        {b.walk_in_actual_start_time ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 w-fit">
                              ⏱️ {b.walk_in_actual_start_time} - {b.walk_in_actual_end_time}
                            </span>
                            <span className="text-[10px] text-text-secondary">Slot: {b.start_time} - {b.end_time}</span>
                          </div>
                        ) : (
                          <span>{b.start_time} - {b.end_time} <span className="text-[10px] text-text-secondary">({b.duration_hours}h)</span></span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-white">₹{b.final_amount}</div>
                        <div className="text-[9px] text-text-secondary mt-0.5">
                          {isToken
                            ? `₹${b.advance_paid_amount || Math.round(b.final_amount * 0.3)} Paid Token + ₹${b.final_amount - (b.advance_paid_amount || Math.round(b.final_amount * 0.3))} Counter`
                            : isHold
                              ? 'Counter settle (Hold)'
                              : 'Full Pre-Paid Online'}
                        </div>
                        {b.upi_transaction_id && (
                          <div className="text-[9px] text-cyan-400 font-mono mt-1 bg-cyan-950/45 border border-cyan-500/20 px-1.5 py-0.5 rounded w-fit" title="User reported Transaction reference">
                            Txn ID: {b.upi_transaction_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono font-bold leading-none ${
                          b.booking_status === 'confirmed'
                            ? 'bg-emerald-400/10 text-emerald-400'
                            : b.booking_status === 'checked_in'
                              ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/20 px-2.5'
                              : b.booking_status === 'completed'
                                ? 'bg-gray-500/15 text-text-secondary'
                                : b.booking_status === 'no_show'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-red-500/15 text-red-500'
                        }`}>
                          {b.booking_status === 'held' ? '⏳ Soft Hold' : b.booking_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.booking_status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => ownerCheckIn(b.id)}
                                className="px-2.5 py-1 bg-emerald-400 text-black text-[11px] font-bold rounded hover:bg-emerald-500 transition cursor-pointer"
                              >
                                Check In
                              </button>
                              <button
                                onClick={() => setNoShowTargetBooking(b)}
                                className="px-2.5 py-1 bg-gray-700 hover:bg-gray-800 text-white text-[11px] font-bold rounded transition cursor-pointer"
                              >
                                No Show
                              </button>
                              <button
                                onClick={() => { setCancelTargetBooking(b); setCancelReason('Client Requested Cancellation'); }}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-bold rounded border border-red-500/20 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {b.booking_status === 'held' && (
                            <>
                              <button
                                onClick={() => ownerCheckIn(b.id)}
                                className="px-2.5 py-1 bg-emerald-400 text-black text-[11px] font-bold rounded hover:bg-emerald-500 transition cursor-pointer"
                              >
                                Check In
                              </button>
                              <button
                                onClick={() => setNoShowTargetBooking(b)}
                                className="px-2.5 py-1 bg-gray-700 hover:bg-gray-800 text-white text-[11px] font-bold rounded transition cursor-pointer"
                              >
                                No Show
                              </button>
                              <button
                                onClick={() => { setCancelTargetBooking(b); setCancelReason('Hold window elapsed'); }}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-bold rounded border border-red-500/20 transition cursor-pointer"
                              >
                                Release
                              </button>
                            </>
                          )}

                          {b.booking_status === 'checked_in' && (
                            <button
                              onClick={() => setCompleteTargetBooking(b)}
                              className="px-3 py-1 bg-brand-cyan text-black hover:bg-brand-cyan text-[11px] font-bold rounded transition cursor-pointer"
                            >
                              Complete Session ✓
                            </button>
                          )}

                          {b.booking_status === 'completed' && (
                            <span className="text-[10px] text-text-secondary/60">Settle logs only</span>
                          )}

                          {b.booking_status === 'cancelled' && (
                            <span className="text-[10px] text-red-400/60">Cancelled</span>
                          )}

                          {b.booking_status === 'no_show' && (
                            <span className="text-[10px] text-amber-400/60">Missed No-Show</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CANCELLATION DIALOG FORM */}
      {cancelTargetBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#1A1A2E] border border-red-500/20 p-6 rounded-2xl space-y-4">
            <div className="flex gap-2 items-center text-red-400 pb-1 border-b border-border-dark">
              <AlertOctagon className="h-5 w-5" />
              <h4 className="font-bold font-display text-white text-lg">Cancel Active Reservation?</h4>
            </div>
            
            <p className="text-xs text-text-secondary leading-normal">
              Booking Ref: <strong>{cancelTargetBooking.booking_ref}</strong>. Cancelling clients will instantly trigger full refunds (online/token payments) to their GARF wallets.
            </p>

            <div>
              <label className="block text-xs uppercase font-mono tracking-wider text-text-secondary mb-1">State Reason for Cancel (Required)</label>
              <select
                className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-xs text-white outline-none"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              >
                <option value="Venue Operational Issues">🔧 Venue Operational Repairs/Hardware failures</option>
                <option value="Staff Unavailable">☕ Supervisor staff adjustments</option>
                <option value="Power Outage">⚡ Severe electricity power outage</option>
                <option value="Client Cancelled Request">👤 Client manually requested cancel help</option>
              </select>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setCancelTargetBooking(null)}
                className="w-1/2 py-2 bg-[#12121A] border border-[#2a2a3e] rounded-lg text-xs font-bold uppercase text-text-secondary cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={executeCancellation}
                className="w-1/2 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-bold text-white uppercase cursor-pointer"
              >
                Cancel and Settle Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED DIALOG SCREEN */}
      {completeTargetBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-brand-cyan/25 p-6 rounded-2xl text-center space-y-4">
            <div className="inline-flex p-3 bg-brand-cyan/10 text-brand-cyan rounded-full">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold font-display text-white text-lg">Settle and Complete Session?</h4>
              <p className="text-xs text-text-secondary mt-1">
                This marks {completeTargetBooking.booking_ref} as completed and recycles state. Customers will receive coins alerts inviting them to review.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setCompleteTargetBooking(null)}
                className="w-1/2 py-2 bg-[#12121A] border border-[#2a2a3e] rounded-xl text-xs font-bold text-text-secondary cursor-pointer"
              >
                Close page
              </button>
              <button
                onClick={executeCompleteSession}
                className="w-1/2 py-2 bg-brand-cyan text-black rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Yes, Complete ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NO SHOW SCREEN */}
      {noShowTargetBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl text-center space-y-4">
            <div className="inline-flex p-3 bg-yellow-500/10 text-yellow-500 rounded-full">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold font-display text-white text-lg">Mark Client as No-Show?</h4>
              <p className="text-xs text-text-secondary mt-1 leading-normal">
                Ref: {noShowTargetBooking.booking_ref}. For paid pre-bookings, advance amounts remain unrefunded. If soft hold expired, booking simply auto-cancels. Client risk counters increment.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setNoShowTargetBooking(null)}
                className="w-1/2 py-2 bg-[#12121A] border border-border-dark rounded-xl text-xs font-bold uppercase text-text-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeNoShowMark}
                className="w-1/2 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-xs font-bold text-white uppercase cursor-pointer"
              >
                Mark No-Show
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
