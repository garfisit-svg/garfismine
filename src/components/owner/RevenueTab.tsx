import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Booking, Venue } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { DollarSign, Download, ArrowUpRight, ArrowDownRight, Calendar, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface RevenueTabProps {
  venue: Venue | null;
}

export const RevenueTab: React.FC<RevenueTabProps> = ({ venue }) => {
  const { bookings, resources } = useApp();

  const [filterPeriod, setFilterPeriod] = useState<'month' | 'week' | 'all'>('all');

  const currentVenueBookings = useMemo(() => {
    if (!venue) return [];
    return bookings.filter(b => b.venue_id === venue.id);
  }, [venue, bookings]);

  const currentVenueResources = useMemo(() => {
    if (!venue) return [];
    return resources.filter(r => r.venue_id === venue.id);
  }, [venue, resources]);

  // Compute stats metrics
  const financialTotals = useMemo(() => {
    // only count completed, checked_in or confirmed paid
    const counts = currentVenueBookings.filter(b => b.booking_status === 'completed' || b.booking_status === 'checked_in' || b.booking_status === 'confirmed');
    const gross = counts.reduce((acc, curr) => acc + curr.final_amount, 0);
    const commission = Math.round(gross * 0.1);
    const net = gross - commission;

    const online = counts.filter(b => b.payment_method === 'online').reduce((acc, curr) => acc + curr.final_amount, 0);
    const token = counts.filter(b => b.payment_method === 'token_advance').reduce((acc, curr) => acc + (curr.advance_paid_amount || Math.round(curr.final_amount * 0.3)), 0);
    const walkin = counts.filter(b => b.payment_method === 'walk_in').reduce((acc, curr) => acc + curr.final_amount, 0);

    return {
      gross,
      commission,
      net,
      online,
      token,
      walkin
    };
  }, [currentVenueBookings]);

  // Daily points coordinate simulation
  const chartPoints = useMemo(() => {
    const list = [
      { day: 'Mon', Gross: Math.round(financialTotals.gross * 0.12), Net: Math.round(financialTotals.net * 0.12) },
      { day: 'Tue', Gross: Math.round(financialTotals.gross * 0.08), Net: Math.round(financialTotals.net * 0.08) },
      { day: 'Wed', Gross: Math.round(financialTotals.gross * 0.14), Net: Math.round(financialTotals.net * 0.14) },
      { day: 'Thu', Gross: Math.round(financialTotals.gross * 0.11), Net: Math.round(financialTotals.net * 0.11) },
      { day: 'Fri', Gross: Math.round(financialTotals.gross * 0.18), Net: Math.round(financialTotals.net * 0.18) },
      { day: 'Sat', Gross: Math.round(financialTotals.gross * 0.22), Net: Math.round(financialTotals.net * 0.22) },
      { day: 'Sun', Gross: Math.round(financialTotals.gross * 0.15), Net: Math.round(financialTotals.net * 0.15) },
    ];
    return list;
  }, [financialTotals]);

  // Export CSV
  const handleDownloadCSV = () => {
    toast.success('Dispatched local transactional CSV spreadsheet compilation logs!');
    
    let content = 'Date,Booking Ref,Station ID,Gross (₹),Commission (₹),Net Earned (₹),Payment Method\n';
    currentVenueBookings.forEach(b => {
      const gross = b.final_amount;
      const comm = Math.round(gross * 0.1);
      const net = gross - comm;
      content += `${b.booking_date},${b.booking_ref},${b.resource_id},${gross},${comm},${net},${b.payment_method}\n`;
    });

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GARF_Revenue_${venue?.name.replace(/\s+/g, '_') || 'ledger'}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#12121A] p-5 rounded-2xl border border-border-dark">
        <div>
          <h4 className="font-bold font-display text-white text-base">Analytical Payout Ledger</h4>
          <p className="text-xs text-text-secondary">Weekly payout settlements and revenue deductions breakdown.</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleDownloadCSV}
            className="px-4 py-2 bg-[#1A1A2E] border border-border-dark text-text-secondary hover:text-white transition rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>📥 Download CSV Logs</span>
          </button>
        </div>
      </div>

      {/* REVENUE SQUARES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#a8a8cf] block">Gross Revenue</span>
          <h3 className="text-3xl font-mono font-black mt-2 text-white">₹{financialTotals.gross}</h3>
          <p className="text-[9px] text-text-secondary leading-normal mt-1">Total billing values before platform commissions applied.</p>
        </div>

        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-red-400 block">Platform Commission</span>
          <h3 className="text-3xl font-mono font-black mt-2 text-red-400">-₹{financialTotals.commission}</h3>
          <p className="text-[9px] text-text-secondary leading-normal mt-1">GARF standard 10% operational platform commission fee.</p>
        </div>

        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 block">Total Net Earnings</span>
          <h3 className="text-3xl font-mono font-black mt-2 text-emerald-400">₹{financialTotals.net}</h3>
          <p className="text-[9px] text-text-secondary leading-normal mt-1">Net settlement sum transferred out weekly to owner vault accounts.</p>
        </div>

        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-yellow-500 block">Pending Payout Sells</span>
          <h3 className="text-3xl font-mono font-black mt-2 text-yellow-500">₹{Math.round(financialTotals.net * 0.3)}</h3>
          <p className="text-[9px] text-text-secondary leading-normal mt-1">Disbursed on next Friday. Covers complete bookings of cycle week.</p>
        </div>

      </div>

      {/* CHART GRID GRAPHICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LINE CHART */}
        <div className="lg:col-span-8 bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl space-y-4">
          <div className="border-b border-border-dark pb-2 flex justify-between items-center">
            <h5 className="font-bold font-display text-white text-sm uppercase tracking-wider">Revenue Trendline Over Time</h5>
            <span className="text-[10px] font-mono text-text-secondary">Current week coordinates</span>
          </div>

          <div className="h-64 mt-4 text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#252538"/>
                <XAxis dataKey="day" stroke="#a0a0b8"/>
                <YAxis stroke="#a0a0b8"/>
                <Tooltip contentStyle={{ backgroundColor: '#1A1A2E', borderColor: '#2A2A3E' }} />
                <Area type="monotone" dataKey="Gross" stroke="#7C3AED" fillOpacity={1} fill="url(#colorGross)" />
                <Area type="monotone" dataKey="Net" stroke="#10B981" fillOpacity={1} fill="url(#colorNet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* METHOD STACK PILLS */}
        <div className="lg:col-span-4 bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl space-y-4">
          <div className="border-b border-border-dark pb-2">
            <h5 className="font-bold font-display text-white text-sm uppercase tracking-wider">Failsafe Payment Shares</h5>
          </div>

          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary font-mono">💳 Online Pre-paid Gateways</span>
                <span className="font-mono text-white font-bold">₹{financialTotals.online}</span>
              </div>
              <div className="w-full bg-[#12121A] h-2 rounded-full overflow-hidden">
                <div className="bg-brand-purple h-full" style={{ width: `${financialTotals.online ? Math.round((financialTotals.online / (financialTotals.gross || 1)) * 100) : 10}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary font-mono">🔐 Partial Token advance collects</span>
                <span className="font-mono text-white font-bold">₹{financialTotals.token}</span>
              </div>
              <div className="w-full bg-[#12121A] h-2 rounded-full overflow-hidden">
                <div className="bg-[#06B6D4] h-full" style={{ width: `${financialTotals.token ? Math.round((financialTotals.token / (financialTotals.gross || 1)) * 100) : 10}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary font-mono">🚶 Cash/UPI Local Walk-ins</span>
                <span className="font-mono text-white font-bold">₹{financialTotals.walkin}</span>
              </div>
              <div className="w-full bg-[#12121A] h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full" style={{ width: `${financialTotals.walkin ? Math.round((financialTotals.walkin / (financialTotals.gross || 1)) * 100) : 10}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#12121A] border border-border-dark rounded-xl p-3 flex gap-2 font-mono text-[9px] text-text-secondary/70 leading-relaxed">
            <Info className="h-3.5 w-3.5 text-brand-purple flex-shrink-0 mt-0.5" />
            <span>Settlement covers bookings that completed prior to Fri cycles. Funds transfer normally settles out inside 48 business hours direct to masked bank vaults.</span>
          </div>
        </div>

      </div>

    </div>
  );
};
