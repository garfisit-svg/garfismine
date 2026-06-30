import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { User, Phone, Lock, Mail, MapPin, Cake, AlertCircle, Gamepad2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SignupPage: React.FC = () => {
  const { signUp, detectedCity } = useApp();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState(detectedCity || 'Mumbai');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

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

  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Jaipur'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validations
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }
    if (phone.length !== 10 || isNaN(Number(phone))) {
      setError('Phone number must be exactly 10 digits');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    const hasNumber = /\d/.test(password);
    if (!hasNumber) {
      setError('Password must contain at least 1 number');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

      try {
        setLoading(true);
        await signUp({
          full_name: fullName,
          email,
          phone,
          d_o_b: dob || undefined,
          city,
          referral_code: referralCode || undefined,
          password,
          avatar_url: selectedAvatar
        });

      toast.success('Registration complete! Please verify your email to log in.', { duration: 6000 });
      navigate('/login', { state: { prefilledEmail: email } });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[95vh] flex items-center justify-center px-4 py-12 font-sans">
      <div className="w-full max-w-lg glass-card p-8 sm:p-10 space-y-8">
        <div className="text-center">
          <div className="inline-flex p-3 bg-brand-cyan/10 rounded-2xl text-brand-cyan mb-4">
            <Gamepad2 className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-display font-bold">Join the <span className="text-gradient">Squad</span></h2>
          <p className="text-text-secondary mt-2 text-sm sm:text-base">Register now to instantly book & start earning credits</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Karan Malhotra"
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-brand-purple text-sm"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-brand-purple text-sm"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white font-mono text-xs select-none">
                  +91
                </span>
                <input
                  type="text"
                  maxLength={10}
                  required
                  placeholder="9876543210"
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-12 pr-4 py-2.5 text-white focus:outline-none focus:border-brand-purple text-sm font-mono"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                  <MapPin className="h-4 w-4" />
                </span>
                <select
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-brand-purple text-sm appearance-none"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                >
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                  <Cake className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  placeholder="YYYY-MM-DD"
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-brand-purple text-sm text-text-secondary"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Referral Code (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="GARF-XXXX"
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-purple text-sm uppercase placeholder:normal-case font-mono"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 num"
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-brand-purple text-sm"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Re-type password"
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-brand-purple text-sm"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 👾 CARTOON AVATAR CHOOSE AT START */}
          <div className="space-y-3 p-4 bg-[#12121A] rounded-2xl border border-[#2a2a3e]">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              👾 Choose Your Starting Cartoon Avatar
            </label>
            <div className="grid grid-cols-6 gap-3.5 pt-1">
              {CARTOON_AVATARS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.url;
                return (
                  <button
                    key={avatar.name}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.url)}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-1 cursor-pointer hover:scale-105 ${
                      isSelected 
                        ? 'border-brand-purple bg-brand-purple/10 shadow-lg shadow-brand-purple/20 scale-105' 
                        : 'border-[#2a2a3e] bg-black/30 hover:border-text-secondary'
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
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-brand-purple rounded-full border border-white flex items-center justify-center text-[6px] text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 btn-gradient rounded-lg text-white font-semibold flex justify-center items-center"
          >
            {loading ? 'Creating Account...' : 'Complete Sign Up'}
          </button>
        </form>

        <div className="text-center text-sm text-text-secondary">
          <span>Already have an account? </span>
          <Link to="/login" className="text-brand-purple hover:underline font-semibold">Login</Link>
        </div>
      </div>
    </div>
  );
};
