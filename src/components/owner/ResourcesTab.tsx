import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Venue, VenueResource } from '../../types';
import { Plus, Edit3, Trash2, CheckCircle2, ShieldAlert, Cpu, Layers, Laptop } from 'lucide-react';
import toast from 'react-hot-toast';

interface ResourcesTabProps {
  venue: Venue | null;
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({ venue }) => {
  const { resources, addResource, updateResource, deleteResource } = useApp();

  const [showAddRes, setShowAddRes] = useState(false);
  const [editingRes, setEditingRes] = useState<VenueResource | null>(null);

  // Form states
  const [resName, setResName] = useState('');
  const [resType, setResType] = useState<'pc' | 'ps5' | 'xbox' | 'vr' | 'turf'>('pc');
  const [resSpecs, setResSpecs] = useState('');
  const [resPrice, setResPrice] = useState('150');

  // Bulk Generator States
  const [showBulkCard, setShowBulkCard] = useState(false);
  const [bulkQty, setBulkQty] = useState(5);
  const [bulkType, setBulkType] = useState<'pc' | 'ps5' | 'xbox' | 'vr'>('pc');
  const [bulkPrice, setBulkPrice] = useState('150');

  const executeBulkAdd = () => {
    if (!venue) return;
    if (bulkQty <= 0) {
      toast.error('Please input a valid quantity');
      return;
    }

    const typeLabels: Record<string, string> = {
      pc: 'Gaming PC Station',
      ps5: 'PS5 Console Booth',
      xbox: 'Xbox Series Box',
      vr: 'VR Headset Zone'
    };

    const typeSpecs: Record<string, string> = {
      pc: 'RTX 4060 Ti, Intel i7, 16GB RAM, 165Hz Monitor',
      ps5: 'PlayStation 5 Console, DualSense Controller, 4K HDR TV',
      xbox: 'Xbox Series X Console, Elite Controller, 4K HDR TV',
      vr: 'Meta Quest 3, Elite Strap, SteamVR High Performance Link'
    };

    const label = typeLabels[bulkType] || 'Station';
    const spec = typeSpecs[bulkType] || 'Standard setup parameters';
    const rate = Number(bulkPrice) || 150;

    for (let i = 1; i <= bulkQty; i++) {
      const existingCountOfThisType = resources.filter(
        r => r.venue_id === venue.id && r.type === bulkType
      ).length;
      const nextNum = existingCountOfThisType + i;

      addResource(venue.id, {
        name: `${label} #${nextNum}`,
        type: bulkType,
        specifications: spec,
        price_per_hour: rate,
        is_active: true,
        sort_order: resources.length + i
      });
    }

    toast.success(`Successfully registered ${bulkQty} new ${bulkType.toUpperCase()} stations in bulk! Slots have been auto-generated.`);
    setShowBulkCard(false);
  };

  // filter
  const currentVenueResources = useMemo(() => {
    if (!venue) return [];
    return resources.filter(r => r.venue_id === venue.id && r.is_active);
  }, [venue, resources]);

  const handleOpenAdd = () => {
    setResName('');
    setResType('pc');
    setResSpecs('');
    setResPrice(venue ? String(venue.price_per_hour) : '150');
    setEditingRes(null);
    setShowAddRes(true);
  };

  const handleOpenEdit = (res: VenueResource) => {
    setResName(res.name);
    setResType(res.type);
    setResSpecs(res.specifications || '');
    setResPrice(String(res.price_per_hour));
    setEditingRes(res);
    setShowAddRes(true);
  };

  const executeSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue) return;
    if (!resName || !resPrice) {
      toast.error('Name & Pricing index are required parameters');
      return;
    }

    if (editingRes) {
      // Edit mode
      updateResource(editingRes.id, {
        name: resName,
        type: resType,
        specifications: resSpecs,
        price_per_hour: Number(resPrice)
      });
      toast.success('Station specifications updated!');
    } else {
      // Add mode
      addResource(venue.id, {
        name: resName,
        type: resType,
        specifications: resSpecs,
        price_per_hour: Number(resPrice),
        is_active: true,
        sort_order: currentVenueResources.length + 1
      });
      toast.success('New high-performance bookable station registered details!');
    }

    setShowAddRes(false);
    setEditingRes(null);
  };

  const executeDeleteRes = (id: string, name: string) => {
    const confirmation = window.confirm(`Permanently remove station: "${name}"? This will recycle any available future booking slots as well.`);
    if (confirmation) {
      deleteResource(id);
      toast.success('Station soft deleted successfully!');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#12121A] p-5 rounded-2xl border border-border-dark gap-4">
        <div>
          <h4 className="font-bold font-display text-white text-base">Resource Layouts ({currentVenueResources.length})</h4>
          <p className="text-xs text-text-secondary">Configure individual equipment units, sports pitches, and pricing offsets.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowBulkCard(!showBulkCard)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#1A1A2E] hover:bg-[#252538] text-brand-purple border border-brand-purple/30 flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <span>⚡ Rapid Bulk Setup</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-gradient text-white flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>＋ Add Unit</span>
          </button>
        </div>
      </div>

      {/* EXPLAINER ON PREVENTING SLOTS MISMANAGEMENT / OVERLAPS */}
      <div className="bg-brand-purple/5 border border-brand-purple/20 p-5 rounded-2xl space-y-3">
        <h5 className="text-xs font-black uppercase font-mono text-brand-purple tracking-wider flex items-center gap-1.5">
          <span>🛡️ Operational Intelligence: How overlap is mathematically impossible</span>
        </h5>
        <p className="text-xs text-text-secondary leading-relaxed">
          Each PC station or PS5 console is registered as a <strong>distinct device resource</strong> in your database. 
          If Customer A has booked <strong>PC Station #1</strong> for 5:00 PM to 6:00 PM, that device is hard-locked in the visual calendar matrix. 
          When Customer B walks in at 5:15 PM, you simply assign them to <strong>PC Station #2</strong> or <strong>PS5 Booth #1</strong>, which are marked green (free). 
          Each station behaves as its own timeline, preventing any physical double-booking.
        </p>
      </div>

      {/* BULK CARD */}
      {showBulkCard && (
        <div className="bg-[#12121A] border border-brand-purple/30 p-6 rounded-2xl space-y-4">
          <div>
            <h5 className="font-bold font-display text-white text-sm">⚡ Rapid Bulk Device Generator</h5>
            <p className="text-xs text-text-secondary">Quickly register multiple game stations at once with standardized specs.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-mono text-text-secondary mb-1">Equipment Genre</label>
              <select
                className="w-full bg-[#1A1A2E] border border-[#2a2a3e] rounded-lg p-2.5 text-xs text-white outline-none"
                value={bulkType}
                onChange={e => setBulkType(e.target.value as any)}
              >
                <option value="pc font-mono">🖥️ Gaming PCs</option>
                <option value="ps5 font-mono">🎮 PS5 Consoles</option>
                <option value="xbox font-mono">💚 Xbox Series Consoles</option>
                <option value="vr font-mono">🥽 VR Stations</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono text-text-secondary mb-1">Quantity of Units</label>
              <input
                type="number"
                min="1"
                max="20"
                className="w-full bg-[#1A1A2E] border border-[#2a2a3e] rounded-lg p-2 text-xs outline-none text-white font-mono"
                value={bulkQty}
                onChange={e => setBulkQty(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono text-text-secondary mb-1">Hourly Rate (₹)</label>
              <input
                type="number"
                min="0"
                className="w-full bg-[#1A1A2E] border border-[#2a2a3e] rounded-lg p-2 text-xs outline-none text-white font-mono"
                value={bulkPrice}
                onChange={e => setBulkPrice(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={executeBulkAdd}
                className="w-full py-2.5 btn-gradient text-white text-xs font-bold uppercase tracking-wider rounded-lg transition"
              >
                Create {bulkQty} Stations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRID DISPLAY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentVenueResources.map(res => (
          <div key={res.id} className="bg-[#1A1A2E] border border-border-dark rounded-2xl p-5 flex flex-col justify-between hover:border-[#2A2A3E] transition duration-200">
            
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#12121A] rounded-xl text-brand-purple border border-border-dark">
                    {res.type === 'pc' ? <Laptop className="h-5 w-5" /> : <Cpu className="h-5 w-5" />}
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-base leading-snug">{res.name}</h5>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#a8a8cf] mt-0.5 block">{res.type} type</span>
                  </div>
                </div>

                <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-400/5 px-2.5 py-1 rounded border border-emerald-400/10">
                  ₹{res.price_per_hour}/hr
                </span>
              </div>

              <div className="bg-[#12121A] p-3 rounded-xl border border-border-dark">
                <span className="text-[9px] uppercase font-mono tracking-widest text-text-secondary block mb-1">Specifications</span>
                <p className="text-xs text-white leading-relaxed font-mono line-clamp-3">
                  {res.specifications || 'Standard configurations preset.'}
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-4 mt-4 border-t border-border-dark/40">
              <button
                onClick={() => handleOpenEdit(res)}
                className="py-1.5 px-3 border border-border-dark bg-[#12121A] hover:bg-border-dark text-text-secondary hover:text-white rounded-lg text-xs font-semibold flex-grow flex justify-center items-center gap-1 cursor-pointer transition"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit specs</span>
              </button>
              <button
                onClick={() => executeDeleteRes(res.id, res.name)}
                className="py-1.5 px-3 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 rounded-lg text-xs font-semibold flex justify-center items-center gap-1 cursor-pointer transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* ADD / EDIT RES MODAL */}
      {showAddRes && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
          <div className="w-full max-w-md bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl space-y-4">
            
            <div className="pb-2 border-b border-border-dark">
              <h4 className="font-bold text-white text-lg font-display">
                {editingRes ? '✏️ Edit Rig Configuration' : '＋ Add Station Layout'}
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">Configure hardware specs that will be shown during client online bookings.</p>
            </div>

            <form onSubmit={executeSaveResource} className="space-y-4">
              
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Station/Court Label Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PC Station 04, Couch Station 2"
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                  value={resName}
                  onChange={e => setResName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Equipment Genre</label>
                  <select
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-sm text-white outline-none"
                    value={resType}
                    onChange={e => setResType(e.target.value as any)}
                  >
                    <option value="pc">🖥️ PC Gaming Rig</option>
                    <option value="ps5">🎮 PlayStation 5</option>
                    <option value="xbox">💚 Xbox Series Console</option>
                    <option value="vr">🥽 Premium VR Station</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Hourly rate (₹)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-sm outline-none text-white focus:border-brand-purple font-mono"
                    value={resPrice}
                    onChange={e => setResPrice(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Hardware & specs specifications</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Intel i9, RTX 4080 GPU, Dual monitors, 240Hz, or specialized keyboard details."
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-xs outline-none text-white focus:border-brand-purple font-mono"
                  value={resSpecs}
                  onChange={e => setResSpecs(e.target.value)}
                ></textarea>
              </div>

              <div className="flex gap-4 pt-2 border-t border-border-dark/40 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddRes(false)}
                  className="w-1/2 py-2.5 bg-[#12121A] border border-[#2a2a3e] rounded-lg text-[#a8a8cf] font-bold uppercase transition hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 btn-gradient text-white font-bold uppercase rounded-lg transition hover:opacity-95"
                >
                  Validate specifications
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
