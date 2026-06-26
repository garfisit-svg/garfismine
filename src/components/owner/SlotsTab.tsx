import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Venue, VenueResource, Slot } from '../../types';
import { ChevronLeft, ChevronRight, Calendar, Info, RefreshCw, Zap, Lock, Grid, List } from 'lucide-react';
import toast from 'react-hot-toast';

interface SlotsTabProps {
  venue: Venue | null;
}

export const SlotsTab: React.FC<SlotsTabProps> = ({ venue }) => {
  const { 
    slots, resources, bookings,
    generateSlotsForNext7Days, bulkBlockSlots, bulkUnblockSlots, ownerReleaseSlot 
  } = useApp();

  const currentVenueResources = useMemo(() => {
    if (!venue) return [];
    return resources.filter(r => r.venue_id === venue.id);
  }, [venue, resources]);

  // Tab state
  const [selectedResId, setSelectedResId] = useState<string>(currentVenueResources[0]?.id || '');

  // Default selection safe update
  React.useEffect(() => {
    if (!selectedResId && currentVenueResources.length > 0) {
      setSelectedResId(currentVenueResources[0].id);
    }
  }, [currentVenueResources, selectedResId]);

  const activeResource = useMemo(() => {
    return currentVenueResources.find(r => r.id === selectedResId) || null;
  }, [selectedResId, currentVenueResources]);

  // View state and week shifting
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week

  const weekDays = useMemo(() => {
    const dates = [];
    const base = new Date();
    // Shift base date by offset weeks (7 days each)
    base.setDate(base.getDate() + (weekOffset * 7));
    
    // Find the Monday of that week
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(base.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekOffset]);

  // Dynamic operating hours
  const hourlyTimings = useMemo(() => {
    const sHour = venue ? parseInt((venue.operating_hours_start || '09:00').split(':')[0]) || 9 : 9;
    const eHour = venue ? parseInt((venue.operating_hours_end || '23:00').split(':')[0]) || 23 : 23;
    const length = Math.max(1, eHour - sHour);
    return Array.from({ length }, (_, i) => {
      const hour = i + sHour;
      return `${hour < 10 ? '0' : ''}${hour}:00`;
    });
  }, [venue]);

  // Bulk parameters
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkReason, setBulkReason] = useState('Maintenance');

  // Cell Interaction Modals
  const [interactCell, setInteractCell] = useState<any | null>(null);
  const [cellReason, setCellReason] = useState('Maintenance');

  const handleGenerateSlots = () => {
    if (!selectedResId) {
      toast.error('Please configure/select a target resource.');
      return;
    }
    generateSlotsForNext7Days(selectedResId);
    toast.success(`Slots generated/validated for next 7-day operating cycles! 🚀`);
  };

  const executeCellAction = () => {
    if (interactCell) {
      if (interactCell.status === 'available') {
        bulkBlockSlots(selectedResId, interactCell.date, [interactCell.hour], cellReason);
        toast.success(`Slot blocked at ${interactCell.hour}`);
      } else if (interactCell.status === 'blocked') {
        bulkUnblockSlots(selectedResId, interactCell.date, [interactCell.hour]);
        toast.success(`Slot unblocked at ${interactCell.hour}`);
      }
      setInteractCell(null);
    }
  };

  const handleBulkBlockAllDay = () => {
    if (!selectedResId) return;
    bulkBlockSlots(selectedResId, bulkDate, hourlyTimings, bulkReason);
    toast.success(`Bulk blocked all 13 slots on ${bulkDate} for ${bulkReason}`);
  };

  const handleBulkUnblockAllDay = () => {
    if (!selectedResId) return;
    bulkUnblockSlots(selectedResId, bulkDate, hourlyTimings);
    toast.success(`Bulk unblocked hours on ${bulkDate}`);
  };

  return (
    <div className="space-y-6">
      
      {/* TOP RESOURCE TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2a2a3e] pb-4">
        
        <div className="overflow-x-auto pr-2">
          <div className="flex gap-2 min-w-max pb-1">
            {currentVenueResources.map(res => (
              <button
                key={res.id}
                onClick={() => setSelectedResId(res.id)}
                className={`px-4.5 py-2.5 rounded-xl text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer ${
                  selectedResId === res.id
                    ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                    : 'bg-[#12121A] border border-border-dark text-text-secondary hover:text-white'
                }`}
              >
                <span>💻</span>
                <span>{res.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-center text-xs">
          <button
            onClick={() => setViewMode(viewMode === 'week' ? 'day' : 'week')}
            className="px-3.5 py-2 hover:bg-border-dark bg-[#12121A] border border-border-dark rounded-xl text-[11px] font-bold uppercase tracking-wider text-[#a8a8cf] flex items-center gap-1.5 cursor-pointer"
          >
            {viewMode === 'week' ? <Grid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
            <span>{viewMode === 'week' ? 'Week View' : 'Day View'}</span>
          </button>
          
          <button
            onClick={handleGenerateSlots}
            className="px-4 py-2 bg-brand-purple/25 hover:bg-brand-purple hover:text-white transition rounded-xl text-brand-purple text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 px-3 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Generate Slots</span>
          </button>
        </div>
      </div>

      {activeResource ? (
        <div className="space-y-6">
          
          {/* NAVIGATION OF DATES */}
          <div className="flex items-center justify-between bg-[#12121A] p-4 rounded-xl border border-border-dark">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1 px-3 bg-[#1A1A2E] text-xs font-bold text-text-secondary hover:text-white border border-border-dark rounded-lg flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous Week</span>
            </button>
            
            <div className="text-xs sm:text-sm font-semibold text-white font-mono flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-purple" />
              <span>Week index of {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1 px-3 bg-[#1A1A2E] text-xs font-bold text-text-secondary hover:text-white border border-border-dark rounded-lg flex items-center gap-1"
            >
              <span>Next Week</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* GRID RENDER AREA */}
          <div className="bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#2A2A3E]">
                    <th className="py-2 px-3 text-white font-bold tracking-widest font-mono uppercase bg-[#12121A]">Hours Block</th>
                    {weekDays.map(day => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <th key={day.toISOString()} className={`py-3 px-1 text-center font-bold font-mono text-[10px] sm:text-xs ${isToday ? 'text-brand-purple' : 'text-text-secondary'}`}>
                          <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="text-sm font-black mt-0.5">{day.getDate()}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {hourlyTimings.map(hr => (
                    <tr key={hr} className="border-b border-[#1C1C2D] hover:bg-[#12121A]/10">
                      <td className="py-3 px-3 font-bold font-mono text-[10px] sm:text-xs text-text-secondary bg-[#12121A]/30">
                        {hr}
                      </td>
                      {weekDays.map(day => {
                        const dateStr = day.toISOString().split('T')[0];
                        const dbSlot = slots.find(s => s.resource_id === selectedResId && s.slot_date === dateStr && s.start_time === hr);
                        
                        let cellStatus = 'available';
                        let detail = 'Available - Click to block';
                        let label = 'AV';

                        if (dbSlot) {
                          cellStatus = dbSlot.status;
                          if (dbSlot.status === 'booked') {
                            const b = bookings.find(x => x.id === dbSlot.booking_id);
                            detail = b ? `Booked: ${b.walk_in_customer_name || 'Client'}` : 'Booked';
                            label = 'LOCKED';
                          } else if (dbSlot.status === 'held') {
                            detail = 'Pay at Venue Soft Hold';
                            label = 'HOLD';
                          } else if (dbSlot.status === 'blocked') {
                            detail = `Blocked: ${dbSlot.blocked_reason || 'Maintenance'}`;
                            label = 'BLOCKED';
                          }
                        }

                        // Style modifiers
                        let colorStyles = 'bg-emerald-400/10 hover:bg-emerald-400/25 border-emerald-400/20 text-emerald-400';
                        if (cellStatus === 'booked') {
                          colorStyles = 'bg-[#7C3AED]/20 border-[#7C3AED]/35 text-[#a8a8cf]';
                        } else if (cellStatus === 'held') {
                          colorStyles = 'bg-yellow-500/15 border-yellow-500/30 text-yellow-500';
                        } else if (cellStatus === 'blocked') {
                          colorStyles = 'bg-gray-600/10 border-gray-600/20 text-text-secondary/50';
                        }

                        return (
                          <td key={day.toISOString()} className="p-1">
                            <button
                              type="button"
                              onClick={() => {
                                setInteractCell({
                                  hour: hr,
                                  date: dateStr,
                                  status: cellStatus,
                                  detail
                                });
                              }}
                              title={detail}
                              className={`w-full py-2.5 border rounded-lg text-[9px] font-bold text-center transition cursor-pointer select-none ${colorStyles}`}
                            >
                              <span className="font-mono">{label}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* STATUS LEGEND DISPLAY */}
            <div className="flex flex-wrap gap-4 text-[10px] text-text-secondary font-mono mt-6 border-t border-border-dark/40 pt-4 justify-center">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 bg-emerald-400/10 border border-emerald-400/20 rounded"></span> Available</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 bg-yellow-500/15 border border-yellow-500/30 rounded"></span> Soft hold hold</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 bg-[#7C3AED]/20 border border-[#7C3AED]/30 rounded"></span> hard locked booking</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 bg-gray-600/10 border border-gray-600/20 rounded"></span> Blocked</span>
            </div>
          </div>

          {/* BULK ACTIONS BOX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[#12121A] border border-border-dark p-5 rounded-2xl space-y-4">
              <h5 className="font-bold text-white text-sm font-display uppercase tracking-wider">🔒 Bulk Block Tool</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase font-mono mb-1">Target Date</label>
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={e => setBulkDate(e.target.value)}
                    className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase font-mono mb-1">Reason for block</label>
                  <select
                    value={bulkReason}
                    onChange={e => setBulkReason(e.target.value)}
                    className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg p-2 text-xs text-white"
                  >
                    <option value="Maintenance">🔧 Hardware Maintenance</option>
                    <option value="Staff Break">☕ Local shift timing swaps</option>
                    <option value="Private Event">🏆 Tournament slot locks</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleBulkBlockAllDay}
                  type="button"
                  className="px-4 py-2 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase rounded-lg flex-1 transition cursor-pointer"
                >
                  Block entire day (All 13h)
                </button>
                <button
                  onClick={handleBulkUnblockAllDay}
                  type="button"
                  className="px-4 py-2 border border-[#2a2a3e] bg-[#1A1A2E] text-text-secondary hover:text-white text-xs font-bold uppercase rounded-lg flex-1 transition cursor-pointer"
                >
                  Unblock All Day
                </button>
              </div>
            </div>

            <div className="bg-[#12121A] border border-border-dark p-5 rounded-2xl flex flex-col justify-between">
              <div className="space-y-2">
                <h5 className="font-bold text-white text-sm font-display uppercase tracking-wider">💡 Recurring Slot Blocker</h5>
                <p className="text-xs text-text-secondary leading-normal">
                  Want to lock stations every Mon or Wed routinely for esports crew events? Standard settings apply under setting rosters easily.
                </p>
              </div>
              <p className="text-[10px] text-text-secondary/60 mt-4 leading-normal font-mono">
                * Note: bulk blocks will respect and keep confirmed paid client bookings intact. They will not be overridden.
              </p>
            </div>

          </div>

        </div>
      ) : (
        <div className="py-12 text-center text-text-secondary">
          Register initial resources on Settings first to manage slots blocks.
        </div>
      )}

      {/* CELL INTERACT CONDITIONAL SCREEN */}
      {interactCell && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl space-y-4">
            <h4 className="font-bold text-white font-display text-base">
              {interactCell.status === 'available' ? 'Configure Block' : interactCell.status === 'blocked' ? 'Unblock Slot' : 'Slot Details'}
            </h4>
            <p className="text-xs text-text-secondary leading-normal">
              Clock Block: {interactCell.hour} on date {interactCell.date} · {interactCell.detail}
            </p>

            {interactCell.status === 'available' && (
              <div>
                <label className="block text-xs uppercase text-text-secondary mb-1">Block Reason</label>
                <select
                  value={cellReason}
                  onChange={e => setCellReason(e.target.value)}
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-xs text-white"
                >
                  <option value="Maintenance">🔧 Component Repairs</option>
                  <option value="Staff Break">☕ shift overlaps</option>
                  <option value="Personal Use">👤 Local Private usage</option>
                </select>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setInteractCell(null)}
                className="w-1/2 py-2 bg-[#12121A] border border-[#2a2a3e] rounded-lg text-xs font-bold text-text-secondary"
              >
                Close Dialog
              </button>
              
              {(interactCell.status === 'available' || interactCell.status === 'blocked') && (
                <button
                  onClick={executeCellAction}
                  className="w-1/2 py-2 btn-gradient text-white rounded-lg text-xs font-bold"
                >
                  {interactCell.status === 'available' ? 'Confirm Block' : 'Validate Unblock'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
