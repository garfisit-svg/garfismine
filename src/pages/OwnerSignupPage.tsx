import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Lock, Mail, AlertCircle, User, Phone, CheckCircle, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export const OwnerSignupPage: React.FC = () => {
  const { signUp, detectedCity } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState(detectedCity || 'Mumbai');
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (detectedCity) {
      setCity(detectedCity);
    }
  }, [detectedCity]);

  const CARTOON_AVATARS = [
    { name: 'Gamer Bot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix' },
    { name: 'Cat Gamer', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Karan' },
    { name: 'Neon Samurai', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Raj' },
    { name: 'Retro Droid', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sasha' },
    { name: 'Pixel Knight', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Hero' },
    { name: 'Cosmic Alien', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo' }
  ];
  const [selectedAvatar, setSelectedAvatar] = useState(CARTOON_AVATARS[0].url);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !password || !confirmPassword || !city) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Confirm password does not match password.');
      return;
    }

    if (!isConfirmed) {
      setError('You must confirm authorized representational status.');
      return;
    }

      try {
        setLoading(true);
        setError(null);
        
        // Request enrollment as owner_pending
        await signUp({
          full_name: fullName,
          email,
          phone,
          password,
          city,
          role: 'owner_pending',
          avatar_url: selectedAvatar
        });

      toast.success('Owner account created successfully! ✅ Choose your arena specification.');
      navigate('/owner/register');
    } catch (err: any) {
      setError(err.message || 'Owner signup process failed.');
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white flex items-center justify-center font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 bg-[#0E0E17]/60 border border-border-dark rounded-3xl overflow-hidden shadow-2xl">
        
        {/* LEFT COLUMN: BENEFITS PANEL (DESKTOP) */}
        <div className="md:col-span-4 bg-gradient-to-br from-[#0c1e2d] to-[#04090e] p-8 sm:p-10 flex flex-col justify-between border-r border-[#1B2D3C]/40">
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
                List Your Venue Spec List
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Reach thousands of active gamers looking for gaming cafe slots near them.
              </p>
            </div>

            {/* Benefits list */}
            <div className="space-y-3 pt-2">
              {[
                { label: 'Control hours and pricing' },
                { label: 'Add station quantities' },
                { label: 'Custom accessories specs' },
                { label: 'Live walk-in operations console' },
                { label: 'Direct partial booking advances' }
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

        {/* RIGHT COLUMN: SIGNUP FORM SECTION */}
        <div className="md:col-span-8 p-6 sm:p-10 md:p-12 bg-[#12121A]/85 flex flex-col justify-center">
          <div className="max-w-lg w-full mx-auto space-y-6">
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-[#06B6D4] text-[10px] uppercase tracking-wider font-bold">
                🏢 For Venue Owners Only
              </div>
              <h2 className="text-3xl font-display font-bold text-white">Create Owner Account</h2>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs sm:text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Your name as venue contact"
                    className="w-full bg-[#181825] border border-border-dark rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 animate-none"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[10px] text-text-secondary/60 mt-1">This will be shown on customer booking invoices</p>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Business Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      placeholder="business@email.com"
                      className="w-full bg-[#181825] border border-border-dark rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-text-secondary/60 mt-1">Used for booking notifications and settlements</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Phone Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary font-mono text-xs font-bold">
                      +91
                    </span>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      className="w-full bg-[#181825] border border-border-dark rounded-lg pl-12 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-text-secondary/60 mt-1">For verification and representative support</p>
                </div>
              </div>

              {/* City Selection dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Operating City</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <select
                    className="w-full bg-[#181825] border border-border-dark rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 select-accent cursor-pointer"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    required
                  >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Pune">Pune</option>
                  </select>
                </div>
                <p className="text-[10px] text-text-secondary/60 mt-1">Which city is your physical venue in?</p>
              </div>

              {/* Password and Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Password</label>
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

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-[#181825] border border-border-dark rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#ffffff] focus:outline-none focus:border-cyan-500"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 👾 CARTOON AVATAR CHOOSE AT START */}
              <div className="space-y-3 p-4 bg-[#181825] rounded-2xl border border-border-dark/80">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  👾 Choose Your Starting Cartoon Avatar
                </label>
                <div className="grid grid-cols-6 gap-3 pt-1">
                  {CARTOON_AVATARS.map((avatar) => {
                    const isSelected = selectedAvatar === avatar.url;
                    return (
                      <button
                        key={avatar.name}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.url)}
                        className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-1 cursor-pointer hover:scale-105 ${
                          isSelected 
                            ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10 scale-105' 
                            : 'border-border-dark bg-black/30 hover:border-text-secondary'
                        }`}
                        title={avatar.name}
                      >
                        <img 
                          src={avatar.url} 
                          alt={avatar.name} 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-cyan-500 rounded-full border border-white flex items-center justify-center text-[6px] text-white">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Representational Authorized Consent Checkbox */}
              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="confirm-ownership"
                  checked={isConfirmed}
                  onChange={e => setIsConfirmed(e.target.checked)}
                  className="rounded border-border-dark bg-[#181825] text-cyan-500 focus:ring-0 cursor-pointer h-4.5 w-4.5 mt-0.5 flex-shrink-0"
                  required
                />
                <label htmlFor="confirm-ownership" className="text-xs text-text-secondary cursor-pointer hover:text-white select-none leading-relaxed">
                  I confirm I am a venue owner or authorized representative, and consent to GARF's commercial partner operational layout specifications list.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-95 text-white rounded-lg font-bold tracking-wider uppercase text-xs transition-transform hover:scale-101 cursor-pointer flex justify-center items-center gap-1.5"
              >
                {loading ? 'Creating Profile...' : 'Create Owner Account'}
              </button>
            </form>

            <div className="border-t border-border-dark/60 my-6 pt-4 text-center space-y-2 text-xs">
              <p className="text-text-secondary">
                Already have an owner account?{' '}
                <Link to="/owner/login" className="text-cyan-400 font-semibold hover:underline">
                  Owner Login →
                </Link>
              </p>
              <p className="text-[11px] text-text-secondary/60">
                Are you a customer?{' '}
                <Link to="/signup" className="text-brand-purple font-semibold hover:underline">
                  Customer Sign Up →
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
