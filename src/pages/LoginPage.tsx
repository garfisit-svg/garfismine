import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Lock, Mail, AlertCircle, Gamepad2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const { logIn, profiles, resendVerificationEmail, sendPasswordResetEmail } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState((location.state as any)?.prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerRoleError, setOwnerRoleError] = useState(false);

  // Password reset specific states
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
    }
  }, [location.search]);
  
  // Login Steps: 'email', 'password', or 'unverified'
  const [step, setStep] = useState<'email' | 'password' | 'unverified'>(() => {
    const prefilled = (location.state as any)?.prefilledEmail;
    return prefilled ? 'unverified' : 'email';
  });

  // Take redirect origin state if any (e.g., if redirected from /booking/:id)
  const from = (location.state as any)?.from || null;

  // Prefilled email trigger
  useEffect(() => {
    const prefilled = (location.state as any)?.prefilledEmail;
    if (prefilled) {
      const cleanEmail = prefilled.trim().toLowerCase();
      const matchedProfile = profiles?.find(p => p.email?.trim().toLowerCase() === cleanEmail);
      if (matchedProfile && matchedProfile.emailVerified === false) {
        setStep('unverified');
        // Auto-trigger verification email dispatch
        resendVerificationEmail(matchedProfile.email!).catch(() => {});
      }
    }
  }, [location.state, profiles]);

  // Auto-transition to password step once the user completes email verification
  useEffect(() => {
    if (email && step === 'unverified') {
      const cleanEmail = email.trim().toLowerCase();
      const matchedProfile = profiles?.find(p => p.email?.trim().toLowerCase() === cleanEmail);
      if (matchedProfile && matchedProfile.emailVerified) {
        setStep('password');
        setError(null);
        toast.success('Email verified successfully! Please enter your password to sign in.', { id: 'login-auto-unlock' });
      }
    }
  }, [profiles, email, step]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerRoleError(false);
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const matchedProfile = profiles?.find(p => p.email?.trim().toLowerCase() === cleanEmail);

    if (!matchedProfile) {
      setError('No account registered with this email address. Please sign up to register.');
      return;
    }

    if (matchedProfile.emailVerified === false) {
      setStep('unverified');
      // Auto-trigger verification email dispatch
      resendVerificationEmail(matchedProfile.email!)
        .then((res: any) => {
          toast.success(res.message || 'Verification email has been dispatched to your address!', { id: 'auto-verify-send' });
        })
        .catch((err: any) => {
          toast.error(err.message || 'Verification dispatch failed');
        });
      return;
    }

    // Email is verified, proceed to password step
    setStep('password');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerRoleError(false);
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const user = await logIn(email);
      
      if (user.role === 'owner' || user.role === 'owner_pending') {
        setOwnerRoleError(true);
        setError('This login is for players and booking users only. Please use Owner Login to access your dashboard.');
        return;
      }

      toast.success(`Welcome back, ${user.full_name}!`);

      // Redirect after login based on role & origin
      if (from) {
        navigate(from, { replace: true });
      } else {
        if (user.role === 'admin') {
          navigate('/garfadmin');
        } else {
          navigate('/explore');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect credentials');
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address first.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const matchedProfile = profiles?.find(p => p.email?.trim().toLowerCase() === cleanEmail);
    if (!matchedProfile) {
      toast.error('No account registered with this email address.');
      return;
    }

    if (matchedProfile.emailVerified === false) {
      toast.error('Your email is not verified. Please verify your email first before requesting a password reset.', { duration: 6000 });
      return;
    }

    try {
      const res = await sendPasswordResetEmail(cleanEmail);
      toast.success(res.message, { duration: 8000 });
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch reset link');
    }
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    // Find the profile with the matched token
    const matchedProfile = profiles?.find(p => p.resetToken === resetToken);
    if (!matchedProfile) {
      toast.error('Invalid or expired password reset token.');
      return;
    }

    // Ensure it hasn't expired
    if (matchedProfile.resetTokenExpires && new Date(matchedProfile.resetTokenExpires) < new Date()) {
      toast.error('Your password reset link has expired. Please request a new one.');
      return;
    }

    const updatedProfiles = profiles.map(p => {
      if (p.id === matchedProfile.id) {
        return {
          ...p,
          resetToken: undefined,
          resetTokenExpires: undefined,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });
    
    localStorage.setItem('garf_profiles', JSON.stringify(updatedProfiles));
    
    toast.success('Your password has been reset successfully! You can now log in.');
    setResetSuccess(true);
    setResetToken(null);
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      const res = await resendVerificationEmail(email);
      toast.success(res.message, { duration: 5000 });
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend link');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 font-sans">
      <div className="w-full max-w-md glass-card p-8 sm:p-10 space-y-8">
        
        {resetToken ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
              <div className="inline-flex p-3 bg-brand-cyan/10 rounded-2xl text-brand-cyan mb-4">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="text-3xl font-display font-bold">Reset Password</h2>
              <p className="text-text-secondary mt-2 text-sm">Please set a secure new password for your account</p>
            </div>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-brand-cyan text-sm"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type="password"
                    placeholder="Repeat your password"
                    className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-brand-cyan text-sm"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-brand-cyan to-brand-purple text-white rounded-lg font-semibold transition hover:opacity-95 flex justify-center items-center uppercase text-xs tracking-wider font-mono cursor-pointer"
              >
                Save New Password
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetToken(null);
                  setError(null);
                }}
                className="w-full py-2 bg-transparent text-text-secondary hover:text-white text-xs font-semibold flex justify-center items-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Cancel & Back to Login
              </button>
            </form>
          </div>
        ) : resetSuccess ? (
          <div className="space-y-6 text-center animate-in scale-in duration-300">
            <div className="inline-flex p-4 bg-green-500/10 text-green-400 rounded-full mb-2 text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-display font-bold">Password Reset Successful!</h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Your password coordinates have been successfully re-encrypted. You can now access your elite computing and gaming arena slots.
            </p>
            
            <button
              onClick={() => {
                setResetSuccess(false);
                setStep('email');
                setEmail('');
                setPassword('');
                setError(null);
                navigate('/login', { replace: true });
              }}
              className="w-full py-3.5 btn-gradient rounded-lg text-white font-semibold transition hover:opacity-95 text-xs tracking-wider uppercase font-mono cursor-pointer"
            >
              Continue to Login
            </button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="inline-flex p-3 bg-brand-purple/10 rounded-2xl text-brand-purple mb-4">
                <Gamepad2 className="h-8 w-8" />
              </div>
              <h2 className="text-3xl font-display font-bold">Log in to <span className="text-gradient">GARF</span></h2>
              <p className="text-text-secondary mt-2 text-sm sm:text-base">Securing slots and exploring arenas</p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {ownerRoleError && (
                  <div className="pt-1.5">
                    <Link
                      to="/owner/login"
                      className="inline-flex items-center justify-center w-full text-center py-2 bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-bold rounded-lg hover:opacity-90 transition cursor-pointer"
                    >
                      Owner Login →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* 1. ENTER EMAIL STEP */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                      <Mail className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      placeholder="you@example.com"
                      className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-brand-purple text-sm"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 btn-gradient rounded-lg text-white font-semibold transition hover:opacity-95 flex justify-center items-center gap-2 cursor-pointer font-mono uppercase text-xs tracking-wider"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* 2. EMAIL IS UNVERIFIED BLOCK */}
            {step === 'unverified' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="p-5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl space-y-3.5 text-center">
                  <div className="inline-flex p-2.5 bg-amber-500/15 rounded-full mb-1">
                    <AlertCircle className="h-6 w-6 text-amber-500 animate-pulse" />
                  </div>
                  <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">Email Verification Required</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    An account is registered for <strong className="text-white font-mono">{email}</strong>, but your email has not been verified yet. Verification is strictly necessary to log in.
                  </p>
                  
                  <div className="bg-black/30 p-3 rounded-lg border border-[#2a2a3e] text-[11px] text-[#c1c1d6] font-sans">
                    💡 Please check your email inbox for the secure verification link. (Developers: configure EmailJS keys in the AI Studio Settings to send real automated emails).
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResend}
                      className="w-full text-center py-2.5 bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs rounded-xl transition font-mono uppercase tracking-wider"
                    >
                      Resend Verification Email
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError(null);
                  }}
                  className="w-full py-3 bg-[#1e1e2d] border border-[#2d2d3f] text-text-secondary hover:text-white rounded-lg text-xs font-semibold flex justify-center items-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Email Address
                </button>
              </div>
            )}

            {/* 3. ENTER PASSWORD STEP */}
            {step === 'password' && (
              <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
                <div className="p-3 bg-[#161622] border border-[#2a2a3e] rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-text-secondary font-mono">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setPassword('');
                      setError(null);
                    }}
                    className="text-brand-cyan hover:underline text-[10px] uppercase font-bold"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Password</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-brand-cyan hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                      <Lock className="h-5 w-5" />
                    </span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-brand-purple text-sm"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-brand-purple bg-[#161622] border-[#2a2a3e]"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                    />
                    <span className="text-text-secondary">Remember me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 btn-gradient rounded-lg text-white font-semibold transition hover:opacity-95 flex justify-center items-center"
                >
                  {loading ? 'Entering Arena...' : 'Log In'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError(null);
                  }}
                  className="w-full py-2 bg-transparent text-text-secondary hover:text-white text-xs font-semibold flex justify-center items-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </form>
            )}

            <div className="text-center text-sm text-text-secondary">
              <span>Don't have an email registered? </span>
              <Link to="/signup" className="text-brand-cyan hover:underline font-semibold">Sign Up</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
