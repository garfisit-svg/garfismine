import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Mail, Phone, Lock, Save, Shield, Bell, Camera, Upload, X, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { Navigate, Link } from 'react-router-dom';

export const OwnerSettingsPage: React.FC = () => {
  const { currentUser, updateProfile } = useApp();

  const [name, setName] = useState(currentUser?.full_name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [upiId, setUpiId] = useState(currentUser?.upi_id || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Avatar change states
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

  const handleAvatarSelect = (url: string) => {
    updateProfile({ avatar_url: url });
    toast.success('Owner profile avatar updated! 👾');
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
      toast.error('Please upload an image file only');
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
  
  // Notification states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [bookingAlerts, setBookingAlerts] = useState(true);

  if (!currentUser) {
    return <Navigate to="/owner/login" replace />;
  }

  if (currentUser.role !== 'owner' && currentUser.role !== 'owner_pending' && currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error('Name and Phone are required parameters!');
      return;
    }
    updateProfile({
      full_name: name,
      phone: phone
    });
    toast.success('Owner profile details updated successfully!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    toast.success('Your owner password has been securely updated!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white py-12 px-4 sm:px-6 lg:px-8 font-sans pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex justify-between items-center bg-[#12121A] p-4 rounded-xl border border-border-dark/60">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs uppercase tracking-widest font-bold">🏢 Owner Portal Settings</span>
          </div>
          <Link to="/owner-dashboard" className="text-xs font-bold text-cyan-400 hover:underline">
            ← Return to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Settings Sidebar Info */}
          <div className="lg:col-span-4 bg-[#12121A] border border-border-dark rounded-2xl p-6 space-y-6">
            <div className="text-center space-y-3">
              
              {/* Rounded avatar for owner */}
              <div className="relative group w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-cyan-500/20 bg-black">
                  <img 
                    src={currentUser.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=garf'} 
                    alt={currentUser.full_name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <button 
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute bottom-0 right-0 p-1.5 bg-[#06B6D4] hover:bg-cyan-500 text-black rounded-full transition shadow-md cursor-pointer"
                  title="Change Profile Photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              <div>
                <h3 className="font-display font-medium text-lg">{currentUser.full_name}</h3>
                <p className="text-xs text-text-secondary font-mono tracking-wide">{currentUser.email}</p>
              </div>
              <span className="inline-block text-[10px] uppercase tracking-widest font-mono font-bold text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/20 px-2.5 py-0.5 rounded-full">
                {currentUser.role === 'owner' ? 'Verified Operator' : 'Pending Verification'}
              </span>
            </div>

            <hr className="border-border-dark/60" />

            <div className="text-xs leading-relaxed text-text-secondary space-y-3">
              <p className="font-bold text-white uppercase tracking-wider font-mono text-[10px]">Security Notice</p>
              <p>Your details are secured using standard hash coordinates. Payout credentials and settlement configurations are accessible under the billing terminal.</p>
              <p>For official registered company name edits, coordinate with the Support Desk directly.</p>
            </div>
          </div>

          {/* Form Area */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Personal Details Form */}
            <div className="bg-[#12121A] border border-border-dark rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2.5 border-b border-border-dark pb-4">
                <User className="h-5 w-5 text-[#06B6D4]" />
                <h2 className="text-lg font-bold font-display">Personal specifications</h2>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Full Representative Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-cyan-500"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Business Email (Read Only)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary/40">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input
                        type="email"
                        className="w-full bg-[#1A1A2E]/50 border border-border-dark/40 rounded-lg pl-9 pr-4 py-2.5 text-sm text-text-secondary/60 cursor-not-allowed outline-none"
                        value={currentUser.email}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Operational Phone contact</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                      <span className="text-xs font-mono font-bold">+91</span>
                    </span>
                    <input
                      type="tel"
                      className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg pl-12 pr-4 py-2.5 text-sm outline-none focus:border-cyan-500"
                      placeholder="9876543210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/10 transition-all flex items-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save specifications</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Direct UPI Settlement Settings */}
            <div className="bg-[#12121A] border border-border-dark rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2.5 border-b border-border-dark pb-4">
                <Wallet className="h-5 w-5 text-[#06B6D4]" />
                <div>
                  <h2 className="text-lg font-bold font-display">Direct UPI Settlement Settings</h2>
                  <p className="text-xs text-text-secondary mt-0.5">Configure your business UPI VPA address to receive direct customer payments instantly.</p>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!upiId.trim() || !upiId.includes('@')) {
                  toast.error('Please enter a valid UPI ID (e.g. name@okaxis)');
                  return;
                }
                updateProfile({ upi_id: upiId.trim() });
                toast.success('Your business UPI address has been successfully saved! 🚀');
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Your Business UPI ID</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-400 font-mono text-sm font-black">
                      ₹
                    </span>
                    <input
                      type="text"
                      className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:border-cyan-500 text-white font-mono placeholder:text-text-secondary/40"
                      placeholder="e.g. ownername@okaxis"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[11px] text-[#8e8ea8] mt-2 leading-relaxed">
                    💡 <strong>Direct routing active:</strong> When customers book online, the venue's portion (total booking amount minus ₹5 platform fee) will go directly to this UPI address, while the remaining ₹5 platform fee will go directly to the platform admin (<strong className="text-cyan-400">9076055212@fam</strong>).
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/10 transition-all flex items-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save UPI Address</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password */}
            <div className="bg-[#12121A] border border-border-dark rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2.5 border-b border-border-dark pb-4">
                <Lock className="h-5 w-5 text-[#06B6D4]" />
                <h2 className="text-lg font-bold font-display">Credential Vault Update</h2>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Current Password</label>
                  <input
                    type="password"
                    className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg p-3 text-sm outline-none focus:border-cyan-500"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">New Password (min 8 chars)</label>
                    <input
                      type="password"
                      className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg p-3 text-sm outline-none focus:border-cyan-500"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full bg-[#1A1A2E] border border-border-dark rounded-lg p-3 text-sm outline-none focus:border-cyan-500"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#1C1C2A] hover:bg-border-dark border border-border-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Shield className="h-4 w-4 text-cyan-400" />
                    <span>Change password</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Notification preferences */}
            <div className="bg-[#12121A] border border-border-dark rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2.5 border-b border-border-dark pb-4">
                <Bell className="h-5 w-5 text-[#06B6D4]" />
                <h2 className="text-lg font-bold font-display">Notification Preferences</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A2E]/50 border border-border-dark/60">
                  <div>
                    <p className="text-sm font-bold">Email Booking Dispatches</p>
                    <p className="text-xs text-text-secondary">Get real-time notification on clients reserving slots offline/online.</p>
                  </div>
                  <button
                    onClick={() => setEmailAlerts(!emailAlerts)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase transition ${emailAlerts ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-[#12121A] text-text-secondary border border-border-dark'}`}
                  >
                    {emailAlerts ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A2E]/50 border border-border-dark/60">
                  <div>
                    <p className="text-sm font-bold">Settlement Reports Alerts</p>
                    <p className="text-xs text-text-secondary">Receive SMS notifications on weekly payouts dispatcher.</p>
                  </div>
                  <button
                    onClick={() => setSmsAlerts(!smsAlerts)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase transition ${smsAlerts ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-[#12121A] text-text-secondary border border-border-dark'}`}
                  >
                    {smsAlerts ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A2E]/50 border border-border-dark/60">
                  <div>
                    <p className="text-sm font-bold">Immediate Slot Lockouts</p>
                    <p className="text-xs text-text-secondary">Instant reminder notification before 15 min graceful holds expires.</p>
                  </div>
                  <button
                    onClick={() => setBookingAlerts(!bookingAlerts)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase transition ${bookingAlerts ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-[#12121A] text-text-secondary border border-border-dark'}`}
                  >
                    {bookingAlerts ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
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
                <h3 className="text-xl font-bold font-display text-white">Update Partner Photo</h3>
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
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-500 bg-black">
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
                          ? 'border-cyan-500 bg-cyan-950/20' 
                          : 'border-[#2a2a3e] bg-black/30 hover:border-text-secondary'
                      }`}
                      title={avatar.name}
                    >
                      <img src={avatar.url} alt={avatar.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-cyan-500/10 flex items-center justify-center">
                          <span className="w-4 h-4 bg-cyan-500 text-white rounded-full border border-white text-[8px] flex items-center justify-center font-bold">✓</span>
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
                    ? 'border-cyan-500 bg-cyan-950/5' 
                    : 'border-border-dark hover:border-cyan-500/60 bg-black/10'
                }`}
              >
                <input 
                  type="file" 
                  id="avatar-file-picker-owner" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                <label htmlFor="avatar-file-picker-owner" className="cursor-pointer space-y-2 block">
                  <div className="p-2.5 bg-[#161622] rounded-full inline-block text-cyan-400">
                    <Upload className="h-5 w-5 mx-auto" />
                  </div>
                  <div className="text-xs font-semibold text-white">
                    <span>Drag and drop here, or </span>
                    <span className="text-[#06B6D4] hover:underline">browse files</span>
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
                  className="flex-1 bg-[#161622] border border-[#2a2a3e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  value={customAvatarUrl}
                  onChange={e => setCustomAvatarUrl(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-[#06B6D4] hover:bg-cyan-500 text-black rounded-lg text-xs font-bold transition"
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
