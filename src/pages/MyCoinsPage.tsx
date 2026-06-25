import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Gift, Award, Calendar, ChevronLeft, ChevronRight, HelpCircle, ArrowUpRight, ArrowDownRight, Gem } from 'lucide-react';
import toast from 'react-hot-toast';

export const MyCoinsPage: React.FC = () => {
  const { currentUser, coinTransactions } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'earned' | 'spent'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4 text-white">
        <span className="text-5xl">🪙</span>
        <h2 className="text-2xl font-bold font-display">Authentication Required</h2>
        <p className="text-text-secondary text-sm">Please log in to inspect your secure GARF Coins wallet and tier metrics.</p>
      </div>
    );
  }

  // 1. Loyalty Tier Math
  const coins = currentUser.garf_coins;
  let tier = 'Bronze';
  let nextTier = 'Silver';
  let minVal = 0;
  let maxVal = 500;

  if (coins <= 500) {
    tier = 'Bronze'; nextTier = 'Silver'; minVal = 0; maxVal = 500;
  } else if (coins <= 2000) {
    tier = 'Silver'; nextTier = 'Gold'; minVal = 500; maxVal = 2000;
  } else if (coins <= 5000) {
    tier = 'Gold'; nextTier = 'Platinum'; minVal = 2000; maxVal = 5000;
  } else {
    tier = 'Platinum'; nextTier = 'Supreme'; minVal = 5000; maxVal = 10000;
  }

  const progressPct = Math.min(100, Math.floor(((coins - minVal) / (maxVal - minVal)) * 100));
  const coinsRemaining = Math.max(0, maxVal - coins);

  // Coins to discount estimate (1 GARF Coin = ₹1)
  const rupeeEstimate = coins.toString();

  // Filter Transaction records
  const userTx = coinTransactions.filter(tx => tx.user_id === currentUser.id);
  const filteredTx = userTx.filter(tx => {
    if (filterType === 'earned') return tx.amount > 0;
    if (filterType === 'spent') return tx.amount < 0;
    return true;
  });

  // Pagination Math (10 pages)
  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredTx.length / itemsPerPage) || 1;
  const paginatedTx = filteredTx.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans select-none text-white space-y-10 pb-20">
      
      {/* 1. TOP HERO LEVEL */}
      <div className="glass-card bg-gradient-to-br from-brand-purple/20 via-[#12121A] to-brand-cyan/20 p-8 sm:p-12 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        
        <div className="space-y-4 text-center md:text-left">
          <span className="text-xs bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan px-3.5 py-1 rounded-full uppercase tracking-widest font-mono font-bold inline-block">
            🎁 WELCOME COINS
          </span>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 justify-center md:justify-start">
            <h1 className="text-6xl sm:text-7xl font-display font-black tracking-tight flex items-center justify-center gap-2">
              <span>🪙</span>
              <span className="text-white">{coins}</span>
            </h1>
            <span className="text-text-secondary text-sm sm:text-lg">GARF Coins</span>
          </div>

          <p className="text-text-secondary text-sm sm:text-base leading-relaxed max-w-sm">
            That stores as <strong className="text-brand-green">₹{rupeeEstimate} discount</strong> off your first gaming cafe session or turf match!
          </p>
          <p className="text-[11px] font-mono text-text-secondary/60">Conversion Index: 1 GARF Coin = ₹1 Discount (Welcome Bonus!)</p>
        </div>

        {/* Tier Visual */}
        <div className="bg-[#161622]/60 p-6 sm:p-8 rounded-2xl border border-[#2a2a3e] w-full md:w-[350px] relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-text-secondary font-mono">PLAYER TIER LEVEL</span>
            <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-bold">
              <Gem className="h-3.5 w-3.5" />
              <span>{tier} Tier</span>
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-sm">
              <span className="font-bold text-lg">{tier}</span>
              <span className="text-xs text-text-secondary">Progress to {nextTier}</span>
            </div>

            {/* Custom progress bar */}
            <div className="h-3 bg-[#0c0c14] rounded-full overflow-hidden border border-[#2a2a3e]">
              <div 
                className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-all duration-300" 
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[11px] text-text-secondary font-mono pt-1">
              <span>{coins} coins</span>
              <span>{maxVal} max</span>
            </div>
            {coinsRemaining > 0 ? (
              <p className="text-[11px] text-brand-green/80 mt-1">🔥 Earn {coinsRemaining} more coins to securely level up to {nextTier}!</p>
            ) : (
              <p className="text-[11px] text-brand-cyan font-bold mt-1">🚀 Max platform level achieved!</p>
            )}
          </div>
        </div>

      </div>

      {/* 2. HOW TO EARN GRID */}
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight font-display text-white">How GARF Coins Work</h3>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">Zero complexity. Zero high investments. High play value.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="glass-card p-5 space-y-4">
            <span className="text-3xl select-none filter drop-shadow">🎁</span>
            <div>
              <h4 className="font-bold text-white text-sm sm:text-base">Instant Welcome Gift</h4>
              <p className="text-xs text-text-secondary leading-relaxed mt-1.5">You automatically receive 10 GARF Coins (worth ₹10) when you register your profile. No extra actions needed.</p>
            </div>
          </div>
          <div className="glass-card p-5 space-y-4">
            <span className="text-3xl select-none filter drop-shadow">🔥</span>
            <div>
              <h4 className="font-bold text-white text-sm sm:text-base">First Order Redemption</h4>
              <p className="text-xs text-text-secondary leading-relaxed mt-1.5">Redeem your coins instantly on your very first turf or cafe booking checkout. No complex tasks or investment needed.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TRANSACTION HISTORY TABLE */}
      <div className="space-y-6 bg-[#0c0c14]/50 p-6 sm:p-8 border border-border-dark rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2a2a3e]">
          <div>
            <h4 className="text-xl font-bold font-display tracking-tight">Coins Ledger Transactions</h4>
            <p className="text-xs text-text-secondary">Historical ledger of earned and spent gaming credits</p>
          </div>

          {/* Type filters toggle slider selection */}
          <div className="flex gap-2 bg-[#12121A] p-1.5 border border-[#2a2a3e] rounded-lg">
            {['all', 'earned', 'spent'].map(item => (
              <button
                key={item}
                onClick={() => { setFilterType(item as any); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${filterType === item ? 'bg-brand-purple text-white shadow-md' : 'text-text-secondary hover:text-white'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {paginatedTx.length === 0 ? (
          <div className="text-center p-12 text-text-secondary text-sm">
            No coin transactions found matching selection.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text-secondary border-collapse">
                <thead>
                  <tr className="text-xs text-text-secondary border-b border-[#2a2a3e] font-mono">
                    <th className="py-3 px-4 uppercase font-bold">DATE</th>
                    <th className="py-3 px-4 uppercase font-bold">DESCRIPTION</th>
                    <th className="py-3 px-4 uppercase font-bold text-right">CREDIT / DEBIT</th>
                    <th className="py-3 px-4 uppercase font-bold text-right">CUMULATIVE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e2d]">
                  {paginatedTx.map((tx, idx) => {
                    const isEarn = tx.amount > 0;
                    return (
                      <tr key={tx.id || idx} className="hover:bg-[#12121A]/40 transition">
                        <td className="py-3.5 px-4 font-mono text-xs">{tx.created_at.substring(0, 10)}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <p>{tx.description}</p>
                          <span className="text-[10px] text-text-secondary font-mono tracking-widest uppercase">{tx.type}</span>
                        </td>
                        <td className={`py-3.5 px-4 font-black font-mono text-right text-base ${isEarn ? 'text-brand-green' : 'text-red-500'}`}>
                          {isEarn ? `+${tx.amount}` : tx.amount}
                        </td>
                        <td className="py-3.5 px-4 text-white font-mono text-right text-xs sm:text-sm">
                          🪙 {tx.balance_after}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Panel controllers */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-[#2a2a3e]">
                <span className="text-xs text-text-secondary font-mono">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 border border-border-dark rounded-md bg-[#161622] hover:text-white hover:border-brand-purple disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-2 border border-border-dark rounded-md bg-[#161622] hover:text-white hover:border-brand-purple disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
