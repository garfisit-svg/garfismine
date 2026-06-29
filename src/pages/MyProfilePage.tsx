import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  User, Mail, Phone, Calendar, MapPin, Cake, Clipboard, CheckCircle, 
  Trash2, Lock, ArrowUpRight, Share2, Award, Users, Camera, Upload, X 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const MyProfilePage: React.FC = () => {
  const { currentUser, profiles, bookings, reviews, coinTransactions, updateProfile, deleteAccount } = useApp();

  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || '');
  const [city, setCity] = useState(currentUser?.city || 'Mumbai');
  const [dob, setDob] = useState(currentUser?.date_of_birth || '');
  const [copied, setCopied] = useState(false);

  // Avatar Choice modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const CARTOON_AVATARS = [
    { name: 'Gamer Bot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix' },
    { name: 'Cat Gamer', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Karan' },
    { name: 'Neon Samurai', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Raj' },
    { name: 'Retro Droid', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sasha' },
    { name: 'Pixel Knight', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Hero' },
    { name: 'Cosmic Alien', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo' }
  ];

  // Security password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewRaw, setConfirmNewRaw] = useState('');

  // Danger zone modal
  const [confirmDeleteText, setConfirmDeleteText] = useState('');

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4 text-white">
        <span className="text-5xl">👤</span>
        <h2 className="text-2xl font-bold font-display">Authentication Required</h2>
        <p className="text-text-secondary text-sm">Please log in to inspect your secure GARF profiles metrics.</p>
      </div>
    );
  }

  // Stats computation
  const userBookings = bookings.filter(b => b.customer_id === currentUser.id);
  const totalCompleted = userBookings.filter(b => b.booking_status === 'completed').length;
  
  // Unique venues visited
  const visitedVenuesSet = new Set(userBookings.map(b => b.venue_id));
  const totalVenuesVisited = visitedVenuesSet.size;

  // Reviews given
  const totalReviewsGiven = reviews.filter(r => r.customer_id === currentUser.id).length;

  // Lifetime coins earned
  const lifetimeEarned = coinTransactions
    .filter(tx => tx.user_id === currentUser.id && tx.amount > 0)
    .reduce((sum, current) => sum + current.amount, 0);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phoneNumber) {
      toast.error('Name and Phone are mandatory required fields');
      return;
    }
    if (phoneNumber.length !== 10 || isNaN(Number(phoneNumber))) {
      toast.error('Phone number must stretch exactly 10 digits');
      return;
    }

    updateProfile({
      full_name: fullName,
      phone: phoneNumber,
      city,
      date_of_birth: dob || null
    });

    toast.success('Onboarding profile details saved! 🚀');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentUser.referral_code);
    setCopied(true);
    toast.success('Referral code copied! 🏷️');
    setTimeout(() => setCopied(false), 2000);
  };

  const getWhatsAppShareUrl = () => {
    const text = `Hey! Book high-spec gaming cafes on GARF! Use my referral code ${currentUser.referral_code} when signing up! playgarf.com`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmNewRaw) {
      toast.error('All password keys are required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Passwords must span 8+ characters least');
      return;
    }
    if (newPassword !== confirmNewRaw) {
      toast.error("New passwords don't match");
      return;
    }
    toast.success('Password changed safely! Remember your lock index.');
    setOldPassword('');
    setNewPassword('');
    setConfirmNewRaw('');
  };

  const handleDeleteTrigger = () => {
    if (confirmDeleteText !== 'DELETE') {
      toast.error('Type DELETE explicitly to confirm removals!');
      return;
    }
    deleteAccount();
    toast.success('Account deleted successfully. We will miss you!');
  };

  const handleAvatarSelect = (url: string) => {
    updateProfile({ avatar_url: url });
    toast.success('Profile avatar updated! 👾');
  };

  const handleCustomUrlApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAvatarUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }
    updateProfile({ avatar_url: customAvatarUrl.trim() });
    toast.success('Custom photo URL applied successfully! 📸');
    setCustomAvatarUrl('');
    setShowAvatarModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file only (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        updateProfile({ avatar_url: result });
        toast.success('Custom profile photo uploaded & saved! 🚀');
        setShowAvatarModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans select-none text-white space-y-10 pb-20">
      
      {/* 1. TOP HEADER SUMMARY CARD */}
      <div className="glass-card p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        
        {/* Rounded avatar mock */}
        <div className="relative group flex-shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-brand-purple bg-[#12121A]">
            <img 
              src={currentUser.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=garf'} 
              alt={currentUser.full_name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <button 
            onClick={() => setShowAvatarModal(true)}
            className="absolute bottom-1 right-1 p-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-full transition shadow-md cursor-pointer"
            title="Change Profile Photo"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>

        <div className="text-center sm:text-left space-y-2">
          <h1 className="text-3xl font-display font-extrabold text-white">{currentUser.full_name}</h1>
          <p className="text-xs text-text-secondary font-mono">
            MEMBER SINCE {currentUser.created_at.substring(0, 10)} • role: <strong className="text-brand-cyan uppercase">{currentUser.role}</strong>
          </p>
        </div>

      </div>

      {/* 2. STATS RATIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Total Completed', val: totalCompleted, desc: 'Successful session playtimes' },
          { label: 'Venues Visited', val: totalVenuesVisited, desc: 'Different cities/arenas logged' },
          { label: 'Reviews Posted', val: totalReviewsGiven, desc: 'Feedback and feedback stars' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-[#12121A] border border-[#2a2a3e] p-5 rounded-2xl text-center">
            <span className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">{stat.label}</span>
            <p className="text-3xl font-black font-display text-white mt-1.5">{stat.val}</p>
            <p className="text-[10px] text-text-secondary/60 mt-1">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* 3. TWO COLUMN matrix DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        
        {/* EDIT PROFILE FORM (2/3 width) */}
        <div className="lg:col-span-2 glass-card p-6 sm:p-8 space-y-6">
          <h3 className="text-xl font-bold font-display text-white border-b border-border-dark pb-3">Update Profiles Data</h3>
          
          <form onSubmit={handleProfileSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-purple text-sm font-medium"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Registered Email (Read-Only)</label>
                <input
                  type="email"
                  disabled
                  title="Registered mail identifier"
                  className="w-full bg-[#0c0c14] border border-[#20202f] rounded-lg px-4 py-3 text-text-secondary/35 cursor-not-allowed text-sm"
                  value={currentUser.full_name.toLowerCase().replace(/\s+/g, '') + '@garf.com'}
                />
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium mb-2">Phone Identifier</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white font-mono text-sm leading-none select-none">
                    +91
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-brand-purple text-sm font-mono"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Selected Core City</label>
                <select
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-purple text-sm appearance-none"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                >
                  {['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Jaipur'].map(ct => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth</label>
                <input
                  type="date"
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-purple text-sm font-mono text-text-secondary"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                />
                <p className="text-[10px] text-[#8e8ea6] mt-1 font-mono">Receive exclusive promotions and early booking invites!</p>
              </div>
            </div>

            <button type="submit" className="px-6 py-3.5 btn-gradient rounded-lg text-sm font-bold shadow-md">
              Save Changes
            </button>
          </form>
        </div>

        {/* SIDE BAR MODULES: REFERRALS & CRITICAL DEFAULTS (1/3 width) */}
        <div className="space-y-6">
          
          {/* SQUAD REFERRALS SECTION */}
          <div className="bg-[#12121A] border border-border-dark p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex gap-2 items-center text-brand-cyan">
              <Users className="h-5 w-5" />
              <h4 className="font-bold font-display text-base">Invite Friends to Play 🎁</h4>
            </div>
            
            <p className="text-xs text-text-secondary leading-relaxed">
              Invite your friends to explore and register on GARF to start building squads and booking high-fidelity esport lounges together!
            </p>

            <div className="bg-[#161622] p-4 rounded-xl border border-dashed border-[#2a2a3e] flex items-center justify-between">
              <span className="font-mono text-lg font-black text-white tracking-widest uppercase">{currentUser.referral_code}</span>
              <button 
                onClick={handleCopyCode}
                className="text-brand-purple hover:text-brand-cyan font-semibold text-xs flex items-center gap-1"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* WhatsApp Pre-fill Button */}
            <a
              href={getWhatsAppShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] active:translate-y-0.5 rounded-xl font-bold text-black flex items-center justify-center gap-2 text-sm transition"
            >
              <Share2 className="h-4.5 w-4.5" />
              <span>Share to WhatsApp</span>
            </a>
          </div>

          {/* PASSWORD SECURITY FORM */}
          <div className="bg-[#12121A] border border-border-dark p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex gap-2 items-center text-brand-purple">
              <Lock className="h-5 w-5" />
              <h4 className="font-bold font-display text-base">Change Password</h4>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <input
                type="password"
                required
                placeholder="Old Password"
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-white"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
              />
              <input
                type="password"
                required
                placeholder="New Password (8+ characters)"
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-white"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                required
                placeholder="Confirm New Password"
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-white"
                value={confirmNewRaw}
                onChange={e => setConfirmNewRaw(e.target.value)}
              />
              <button type="submit" className="w-full py-2 bg-[#2a2a3e] hover:bg-brand-purple hover:text-white rounded-lg text-xs font-bold transition">
                Change Password
              </button>
            </form>
          </div>

          {/* DANGER ZONE AREA */}
          <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl shadow-md space-y-4">
            <h4 className="font-bold text-red-500 text-base">Danger Zone 🛑</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Delete account permanently. This deletes pending hold entries and profile data sheets instantly.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Type 'DELETE' to confirm"
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                value={confirmDeleteText}
                onChange={e => setConfirmDeleteText(e.target.value)}
              />
              <button 
                onClick={handleDeleteTrigger}
                type="button" 
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 font-bold rounded-lg text-xs text-white transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 🔮 AVATAR / PROFILE PHOTO MODAL */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#0e0e17] border border-border-dark rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border-dark/60">
              <div>
                <h3 className="text-xl font-bold font-display text-white">Update Profile Photo</h3>
                <p className="text-xs text-text-secondary mt-0.5">Customize your look with cartoon avatars or local uploads</p>
              </div>
              <button 
                onClick={() => setShowAvatarModal(false)}
                className="p-1.5 bg-[#161622] text-text-secondary hover:text-white rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current View */}
            <div className="flex items-center gap-4 bg-[#12121A] p-4 rounded-xl border border-border-dark/40">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-purple bg-black">
                <img 
                  src={currentUser.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=garf'} 
                  alt="current" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-xs text-text-secondary block font-mono">CURRENT PHOTO ACTIVE</span>
                <span className="text-sm font-bold text-white truncate max-w-[200px] block mt-0.5">
                  {currentUser.avatar_url?.startsWith('data:') ? 'Custom Uploaded File' : 'Cartoon / Link Avatar'}
                </span>
              </div>
            </div>

            {/* Section A: Cartoon Avatars selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">👾 Select a Cartoon Character</span>
              <div className="grid grid-cols-6 gap-3 pt-1">
                {CARTOON_AVATARS.map((avatar) => {
                  const isSelected = currentUser.avatar_url === avatar.url;
                  return (
                    <button
                      key={avatar.name}
                      onClick={() => handleAvatarSelect(avatar.url)}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-1 cursor-pointer hover:scale-105 ${
                        isSelected 
                          ? 'border-brand-purple bg-brand-purple/10' 
                          : 'border-[#2a2a3e] bg-black/30 hover:border-text-secondary'
                      }`}
                      title={avatar.name}
                    >
                      <img src={avatar.url} alt={avatar.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-brand-purple/10 flex items-center justify-center">
                          <span className="w-4 h-4 bg-brand-purple text-white rounded-full border border-white text-[8px] flex items-center justify-center font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section B: File Drag-and-Drop / Upload */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">📁 Upload Local Image</span>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${
                  isDragging 
                    ? 'border-brand-purple bg-brand-purple/5' 
                    : 'border-border-dark hover:border-brand-purple/60 bg-black/10'
                }`}
              >
                <input 
                  type="file" 
                  id="avatar-file-picker" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                <label htmlFor="avatar-file-picker" className="cursor-pointer space-y-2 block">
                  <div className="p-2.5 bg-[#161622] rounded-full inline-block text-brand-purple">
                    <Upload className="h-5 w-5 mx-auto" />
                  </div>
                  <div className="text-xs font-semibold text-white">
                    <span>Drag and drop here, or </span>
                    <span className="text-brand-purple hover:underline">browse files</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">Supports PNG, JPG, GIF up to 2MB</p>
                </label>
              </div>
            </div>

            {/* Section C: Custom Image URL paste */}
            <form onSubmit={handleCustomUrlApply} className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">🔗 Paste Web Image URL</span>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/my-photo.jpg"
                  className="flex-1 bg-[#161622] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-purple font-mono"
                  value={customAvatarUrl}
                  onChange={e => setCustomAvatarUrl(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-lg text-xs font-bold transition"
                >
                  Apply
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
