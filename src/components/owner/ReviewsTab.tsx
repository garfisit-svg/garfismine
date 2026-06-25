import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Venue, Review } from '../../types';
import { Star, MessageSquare, CornerDownRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReviewsTabProps {
  venue: Venue | null;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({ venue }) => {
  const { reviews, profiles, bookings, replyToReview } = useApp();

  const [starFilter, setStarFilter] = useState<'all' | number>('all');
  const [replyInputId, setReplyInputId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const currentVenueReviews = useMemo(() => {
    if (!venue) return [];
    let base = reviews.filter(r => r.venue_id === venue.id);
    
    if (starFilter !== 'all') {
      base = base.filter(r => r.rating === starFilter);
    }
    return base.reverse();
  }, [venue, reviews, starFilter]);

  // Distributions stats
  const ratingsStats = useMemo(() => {
    if (!venue) return { count: 0, avg: '0', distribution: [0,0,0,0,0] };
    const base = reviews.filter(r => r.venue_id === venue.id);
    const count = base.length;
    const sum = base.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = count > 0 ? (sum / count).toFixed(1) : 'New';

    const distribution = [0, 0, 0, 0, 0]; // 5 stars down to 1
    base.forEach(r => {
      const idx = Math.max(1, Math.min(5, r.rating));
      distribution[5 - idx]++;
    });

    return {
      count,
      avg,
      distribution
    };
  }, [venue, reviews]);

  const handleOpenReplyForm = (rev: Review) => {
    setReplyInputId(rev.id);
    setReplyText(rev.owner_reply || '');
  };

  const handleSaveReply = (id: string) => {
    if (!replyText.trim()) {
      toast.error('Reply coordinates text cannot remain empty');
      return;
    }
    replyToReview(id, replyText);
    toast.success('Your response is published live and visible in the client catalog!');
    setReplyInputId(null);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      
      {/* RATING BLOCK HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#12121A] p-6 rounded-2xl border border-border-dark items-stretch">
        <div className="md:col-span-4 text-center flex flex-col justify-center items-center border-r border-[#1C1C2D] pr-4">
          <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono font-bold block mb-1">Average Reputation Score</span>
          <h3 className="text-5xl font-black text-white font-mono leading-none">{ratingsStats.avg}</h3>
          <div className="flex gap-1.5 justify-center mt-3 text-yellow-500">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className="h-5 w-5 fill-current" />
            ))}
          </div>
          <span className="text-xs text-text-secondary font-mono mt-2 block">Based on {ratingsStats.count} verified player session feedbacks</span>
        </div>

        <div className="md:col-span-8 flex flex-col justify-between pl-0 md:pl-4 space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#a8a8cf] font-bold">Acre Star Distribution Metrics</span>
          
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars, idx) => {
              const count = ratingsStats.distribution[idx];
              const percent = ratingsStats.count > 0 ? Math.round((count / ratingsStats.count) * 100) : 0;
              
              return (
                <div key={stars} className="flex items-center gap-3 text-xs text-text-secondary">
                  <span className="font-mono font-bold text-white min-w-[50px]">{stars} Stars</span>
                  <div className="flex-grow bg-[#1A1A2E] h-2.5 rounded-full overflow-hidden">
                    <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                  </div>
                  <span className="font-mono min-w-[30px] text-right">{count}</span>
                  <button
                    onClick={() => setStarFilter(starFilter === stars ? 'all' : stars)}
                    className={`font-mono text-[10px] px-2 py-0.5 rounded border transition ${starFilter === stars ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-[#12121A] text-[#a8a8cf] border-[#2A2A3E]'}`}
                  >
                    {starFilter === stars ? 'Filtered' : 'Filter'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FEED LIST REVIEW CARDS */}
      <div className="space-y-4">
        {currentVenueReviews.length === 0 ? (
          <div className="p-12 text-center text-text-secondary bg-[#1A1A2E] rounded-2xl border border-border-dark space-y-2">
            <h5 className="font-bold text-white text-base">No review feedbacks received</h5>
            <p className="text-xs text-text-secondary/60">Reviews from paid bookings show up automatically here once client files them.</p>
          </div>
        ) : (
          currentVenueReviews.map(rev => {
            const reviewer = profiles.find(p => p.id === rev.customer_id);
            const relativeB = bookings.find(b => b.id === rev.booking_id);

            return (
              <div key={rev.id} className="bg-[#1A1A2E] border border-border-dark rounded-2xl p-5 space-y-4 hover:border-[#2A2A3E] transition">
                
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand-purple/20 flex items-center justify-center font-bold font-mono text-brand-purple border border-brand-purple/20">
                      {(reviewer?.full_name || 'Client')[0].toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-base leading-snug">{reviewer?.full_name || 'Verified Gamer'}</h5>
                      <p className="text-[10px] text-text-secondary font-mono mt-0.5">
                        Session Ref: {relativeB?.booking_ref || 'Seeded slot'} · {new Date(rev.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 text-yellow-500">
                    {Array.from({ length: rev.rating }, (_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-white/95 italic bg-[#12121A]/40 p-4 border border-border-dark/60 rounded-xl leading-relaxed">
                  "{rev.comment || 'No optional comments saved by player.'}"
                </p>

                {/* OWNER REPLY BOX */}
                <div className="pl-4 border-l-2 border-brand-purple/40 space-y-3 pt-1">
                  
                  {replyInputId === rev.id ? (
                    <div className="space-y-2.5">
                      <label className="block text-[10px] text-text-secondary uppercase font-mono tracking-widest font-bold">Write response reply to reviewer</label>
                      <textarea
                        rows={3}
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white outline-none focus:border-brand-purple"
                        placeholder="Thank the customer, explain updates, or address suggestions professionally..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                      ></textarea>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setReplyInputId(null)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#12121A] border border-border-dark text-[#a8a8cf] text-xs font-bold uppercase transition"
                        >
                          Discard
                        </button>
                        <button
                          onClick={() => handleSaveReply(rev.id)}
                          className="px-4 py-1.5 btn-gradient rounded-lg text-white text-xs font-bold uppercase transition"
                        >
                          Submit Response Reply
                        </button>
                      </div>
                    </div>
                  ) : rev.owner_reply ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-brand-purple font-bold">
                        <CornerDownRight className="h-4 w-4" />
                        <span>Console Supervisor Response Reply</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed bg-[#12121A]/40 p-3.5 rounded-xl border border-border-dark/40 italic">
                        "{rev.owner_reply}"
                      </p>
                      <button
                        onClick={() => handleOpenReplyForm(rev)}
                        className="text-[10px] text-[#06B6D4] hover:underline font-bold uppercase font-mono tracking-wider ml-1 block"
                      >
                        Edit Reply
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenReplyForm(rev)}
                      className="py-1.5 px-3.5 border border-[#2a2a3e] hover:border-brand-purple bg-[#12121A] text-text-secondary hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Respond / Reply to Review</span>
                    </button>
                  )}

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
