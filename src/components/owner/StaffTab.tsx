import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Venue } from '../../types';
import { Plus, User, Mail, ShieldAlert, Sparkles, Loader2, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';

interface StaffTabProps {
  venue: Venue | null;
}

export const StaffTab: React.FC<StaffTabProps> = ({ venue }) => {
  const { profiles } = useApp();

  const [staffEmail, setStaffEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Simulated invitations list
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; email: string; date: string }>>([
    { id: 'inv-1', email: 'priya_desk@arena.com', date: '2 days ago' }
  ]);

  // Find users in profiles with some staff pattern or simulate staff
  const staffList = useMemo(() => {
    // Return mock staff since we are in sandbox and let users experience it
    return [
      { id: 'st-1', name: 'Amit Kumar', email: 'amit_desk@arena.com', role: 'Check-in Staff', status: 'Active', added: 'May 12, 2026' }
    ];
  }, []);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      // Find inside profiles just to check if email has account
      const matched = profiles.find(p => p.email && p.email.toLowerCase() === staffEmail.trim().toLowerCase());
      
      setPendingInvites([...pendingInvites, { id: `inv-${Date.now()}`, email: staffEmail, date: 'Just now' }]);
      toast.success(`Verification email dispatched to ${staffEmail}!`);
      setStaffEmail('');
      setSubmitting(false);
    }, 800);
  };

  const handleCancelInvite = (id: string) => {
    setPendingInvites(pendingInvites.filter(x => x.id !== id));
    toast.success('Invitation recalled');
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-[#12121A] p-5 rounded-2xl border border-border-dark space-y-2">
        <h4 className="font-bold font-display text-white text-base">Client-Checkin Supervisor Staff</h4>
        <p className="text-xs text-text-secondary">Invite floor operators and cashiers who manage customer arrivals with limited dashboard privileges.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* INVITE FORM SPLIT */}
        <div className="md:col-span-4 bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl space-y-4">
          <h5 className="font-bold text-white text-sm font-display uppercase tracking-wider">＋ Invite crew desk</h5>
          
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1">Crew account email</label>
              <div className="relative">
                <span className="absolute left-3 inset-y-0 text-text-secondary flex items-center">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="e.g. staff_desk@arena.com"
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg pl-9 pr-3 py-2 text-sm outline-none text-white focus:border-brand-purple"
                  value={staffEmail}
                  onChange={e => setStaffEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg btn-gradient text-white text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Dispatch Invitation'}
            </button>
          </form>

          {/* PRIVILEGES EXPLANATION BOX */}
          <div className="bg-[#12121A] border border-border-dark p-3.5 rounded-xl space-y-1.5 text-[9px] text-text-secondary leading-relaxed uppercase">
            <span className="text-yellow-400 font-bold block mb-1">Staff Access rules applied:</span>
            <span className="text-emerald-400 block font-bold font-mono">✅ View today bookings checklist</span>
            <span className="text-emerald-400 block font-bold font-mono">✅ Check-in soft hold timers</span>
            <span className="text-emerald-400 block font-bold font-mono">✅ Settle Walk-in registrations</span>
            <span className="text-red-400 block font-mono font-bold mt-1">❌ No Revenue financial details tab</span>
            <span className="text-red-400 block font-mono font-bold">❌ No Specs listings delete tab</span>
            <span className="text-red-400 block font-mono font-bold">❌ No Promo coupon controls</span>
          </div>
        </div>

        {/* STAFF LIST TABLE AND RECALL */}
        <div className="md:col-span-8 bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-border-dark pb-2 font-mono">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Active Supervisor Staff</h5>
            <span className="text-[10px] text-emerald-400 font-bold font-mono text-[9px] uppercase">All systems green</span>
          </div>

          <div className="space-y-3">
            {staffList.map(st => (
              <div key={st.id} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4.5 bg-[#12121A] border border-border-dark rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-cyan/20 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan font-bold font-mono">
                    {st.name[0]}
                  </div>
                  <div>
                    <h6 className="font-bold text-white text-sm">{st.name}</h6>
                    <p className="text-[10px] text-[#a8a8cf] font-mono mt-0.5">{st.email} · {st.role}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs leading-normal">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#10B981] bg-[#10B981]/5 px-2.5 py-0.5 rounded border border-[#10B981]/15 font-bold">ACTIVE ROLE</span>
                    <span className="text-[9px] text-[#a8a8cf] font-mono block mt-0.5">joined {st.added}</span>
                  </div>
                  <button
                    onClick={() => {
                      toast.success(`Supervisor roles revoked for ${st.name}`);
                    }}
                    className="p-1.5 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-lg cursor-pointer transition"
                    title="Revoke and suspend desk access"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* PENDING LIST BOX */}
            {pendingInvites.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] text-text-secondary font-mono uppercase tracking-wider block mb-2">Pending verification invitees ({pendingInvites.length})</span>
                <div className="space-y-2">
                  {pendingInvites.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-xs p-3 border border-dashed border-[#2a2a3e] bg-black/10 rounded-xl font-mono text-text-secondary">
                      <span>✉️ Invite Sent: <strong className="text-white">{p.email}</strong> ({p.date})</span>
                      <button
                        onClick={() => handleCancelInvite(p.id)}
                        className="text-red-400 hover:underline hover:text-red-300 font-bold uppercase text-[10px] cursor-pointer"
                      >
                        Recall invite
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
