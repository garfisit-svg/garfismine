import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Lock, Mail, AlertCircle, Building2, ShieldCheck, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const OwnerLoginPage: React.FC = () => {
  const { logIn } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerRoleError, setCustomerRoleError] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerRoleError(false);
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await logIn(email);
      
      if (user.role === 'customer') {
        // Customer login error barrier on owner page
        setCustomerRoleError(true);
        setError('This account is not registered as a venue owner. Please use User Login or register your venue first.');
        return;
      }

      toast.success(`Welcome back to Owner Portal, ${user.full_name}!`);

      if (user.role === 'admin') {
        navigate('/garf-hq-2025');
      } else if (user.role === 'owner_pending') {
        navigate('/owner/register');
      } else {
        navigate('/owner-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect credentials');
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoCredentials = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setPassword('password');
    toast.success(`Selected Demo Credentials for ${selectedEmail}!`);
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white flex items-center justify-center font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 bg-[#0E0E17]/60 border border-border-dark rounded-3xl overflow-hidden shadow-2xl">
        
        {/* LEFT COLUMN: BENEFITS PANEL (DESKTOP) */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#0c1e2d] to-[#04090e] p-8 sm:p-10 flex flex-col justify-between border-r border-[#1B2D3C]/40">
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-display font-black tracking-tighter text-gradient-cyan">
                GARF
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/25">
                Owner Portal
              </span>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-bold font-display text-white leading-tight">
                Your venue, fully in control.
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Unlock higher seat density and maximize booking revenues with India's premier recreational hub system.
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-3 pt-2">
              {[
                { label: 'Manage bookings in real time' },
                { label: 'Track revenue and payouts' },
                { label: 'Control your slots and equipment' },
                { label: 'See live customer activity' },
                { label: 'Weekly bank settlements' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2.5 items-center text-xs text-text-secondary">
                  <CheckCircle className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 text-[10px] font-mono text-text-secondary/50">
            © {new Date().getFullYear()} GARF Partnerships Portal
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN FORM SECTION */}
        <div className="md:col-span-7 p-8 sm:p-12 bg-[#12121A]/85 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-[#06B6D4] text-[10px] uppercase tracking-wider font-bold">
                🏢 For Venue Owners Only
              </div>
              <h2 className="text-3xl font-display font-bold text-white">Owner Portal Login</h2>
            </div>

            {/* DEMO SWITCHER */}
            <div className="bg-[#181825] p-1 rounded-xl border border-border-dark/60 text-center text-[10px] sm:text-xs">
              <button
                type="button"
                onClick={() => selectDemoCredentials('owner@arena.com')}
                className={`w-full py-2 rounded-lg font-bold transition-all cursor-pointer ${email === 'owner@arena.com' ? 'bg-[#06B6D4]/20 border border-[#06B6D4] text-[#06B6D4]' : 'text-text-secondary hover:text-white'}`}
              >
                🏢 Load Partner Demo Credentials (owner@arena.com)
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>

                {customerRoleError && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link
                      to="/login"
                      className="text-center py-2 bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-bold rounded-lg hover:opacity-90 block"
                    >
                      User Login →
                    </Link>
                    <Link
                      to="/owner/signup"
                      className="text-center py-2 bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-xs font-bold rounded-lg hover:bg-cyan-900/30 block"
                    >
                      Register My Venue →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full bg-[#181825] border border-border-dark rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Password</label>
                  <Link
                    to="/owner/forgot-password"
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-[#181825] border border-border-dark rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* REMEMBER ME CHECKBOX */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="owner-remember"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-border-dark bg-[#181825] text-cyan-500 focus:ring-0 cursor-pointer h-4 w-4"
                />
                <label htmlFor="owner-remember" className="text-xs text-text-secondary cursor-pointer hover:text-white">
                  Remember me on this platform
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-90 text-white rounded-lg font-bold tracking-wider uppercase text-xs transition-transform hover:scale-101 cursor-pointer flex justify-center items-center gap-1.5"
              >
                {loading ? 'Authenticating...' : 'Login to Owner Portal'}
              </button>
            </form>

            <div className="border-t border-border-dark/60 my-6 pt-4 text-center space-y-2">
              <p className="text-xs text-text-secondary">
                New to GARF?{' '}
                <Link to="/owner/signup" className="text-[#06B6D4] font-semibold hover:underline">
                  Register Your Venue →
                </Link>
              </p>
              <p className="text-[11px] text-text-secondary/60">
                Are you a player?{' '}
                <Link to="/login" className="text-brand-purple font-semibold hover:underline">
                  User Login →
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
