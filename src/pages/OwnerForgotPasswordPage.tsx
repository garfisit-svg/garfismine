import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export const OwnerForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email is required!');
      return;
    }
    setSubmitted(true);
    toast.success('Successfully dispatched owner credential reset link!');
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white flex items-center justify-center font-sans p-4">
      <div className="max-w-md w-full bg-[#12121A]/85 border border-border-dark p-8 sm:p-10 rounded-3xl space-y-6 shadow-2xl relative">
        
        {/* Back Link */}
        <Link 
          to="/owner/login" 
          className="absolute top-6 left-6 text-xs text-text-secondary hover:text-white flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </Link>

        <div className="text-center pt-4">
          <div className="inline-flex p-3 bg-[#06B6D4]/10 rounded-2xl text-cyan-400 mb-4 h-12 w-12 items-center justify-center text-2xl">
            🔑
          </div>
          <h2 className="text-2xl font-bold font-display">Reset Owner Password</h2>
          <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
            Input your registered business email and we'll dispatch an instant reset code coordinate.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Business Email Address</label>
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

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg font-bold tracking-wider uppercase text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-cyan-500/10"
            >
              Send Reset Link
            </button>
          </form>
        ) : (
          <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl text-center space-y-3">
            <CheckCircle className="h-8 w-8 text-cyan-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Reset Email Dispatched!</h4>
            <p className="text-xs text-text-secondary leading-normal">
              An encryption key coordinate was successfully dispatched to <strong className="text-cyan-400">{email}</strong>. Follow the directions payload inside to complete reset.
            </p>
          </div>
        )}

        <div className="border-t border-border-dark/60 pt-4 text-center">
          <Link to="/owner/login" className="text-xs font-semibold text-cyan-400 hover:underline">
            Back to Owner Login →
          </Link>
        </div>

      </div>
    </div>
  );
};
