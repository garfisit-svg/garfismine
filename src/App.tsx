import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useApp } from './context/AppContext';

// Pages Import
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ExplorePage } from './pages/ExplorePage';
import { VenueDetailPage } from './pages/VenueDetailPage';
import { BookingFlowPage } from './pages/BookingFlowPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { OwnerRegisterPage } from './pages/OwnerRegisterPage';
import { GarfAdminPage } from './pages/GarfAdminPage';
import { GarfSquadPage } from './pages/GarfSquadPage';
import { 
  AboutPage, ContactPage, FAQPage, PrivacyPage, TermsPage, RefundPolicyPage 
} from './pages/StaticPages';
import { OwnerLoginPage } from './pages/OwnerLoginPage';
import { OwnerSignupPage } from './pages/OwnerSignupPage';
import { OwnerForgotPasswordPage } from './pages/OwnerForgotPasswordPage';
import { OwnerSettingsPage } from './pages/OwnerSettingsPage';

// Icons Import
import { 
  ShieldCheck, User, Search, Gift, LogOut, LayoutDashboard, Calendar, 
  MapPin, HelpCircle, Users, Menu, X, ArrowUpRight, Gamepad2, Zap 
} from 'lucide-react';

export default function App() {
  const { currentUser, logoutUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile navbar togglor
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOwner = currentUser && (currentUser.role === 'owner' || currentUser.role === 'owner_pending');

  // 🛡️ ROLE INSULATION REDIRECTS CONTROLLER (Rule 1 & Rule 2)
  useEffect(() => {
    if (!currentUser) {
      const publicPaths = [
        '/', '/login', '/signup', '/explore', '/about', '/contact', '/faq', '/privacy', '/terms', '/refund',
        '/owner/login', '/owner/signup', '/owner/forgot-password'
      ];
      const isPublic = publicPaths.includes(location.pathname) || location.pathname.startsWith('/venue/');
      if (!isPublic) {
        navigate('/login');
      }
    } else {
      const role = currentUser.role;

      if (role === 'customer') {
        const allowedOwnerPaths = ['/owner/login', '/owner/signup', '/owner/forgot-password', '/owner/register'];
        const isForbiddenOwnerOrAdminPath = 
          (location.pathname.startsWith('/owner') && !allowedOwnerPaths.includes(location.pathname)) || 
          location.pathname === '/owner-dashboard' || 
          location.pathname === '/garf-hq-2025' || 
          location.pathname === '/admin-dashboard' ||
          location.pathname === '/garfadmin';
        if (isForbiddenOwnerOrAdminPath) {
          navigate('/');
        }
      } else if (role === 'owner' || role === 'owner_pending') {
        // Redirection away from My Profile to Owner Settings
        if (location.pathname === '/my-profile') {
          navigate('/owner/settings');
          return;
        }

        const forbiddenForOwner = [
          '/', '/explore', '/booking', '/my-bookings', '/my-profile', '/squad', '/login', '/signup', '/garfadmin'
        ];
        
        const isForbidden = forbiddenForOwner.some(path => 
          location.pathname === path || 
          location.pathname.startsWith('/venue/') || 
          location.pathname.startsWith('/booking/')
        );

        if (isForbidden) {
          toast.error('You are logged in as a venue owner. Access your Owner Dashboard here.', {
            id: 'owner-redirect-toast'
          });
          
          if (role === 'owner_pending') {
            navigate('/owner/register');
          } else {
            navigate('/owner-dashboard');
          }
        }
      }
    }
  }, [currentUser, location.pathname, navigate]);

  const handleLogout = () => {
    const wasOwner = isOwner;
    logoutUser();
    setMobileMenuOpen(false);
    if (wasOwner) {
      navigate('/owner/login');
    } else {
      navigate('/');
    }
  };

  const navLinks = isOwner ? [
    { label: 'Dashboard', path: '/owner-dashboard' },
    { label: 'Bookings', path: '/owner/bookings' },
    { label: 'Revenue', path: '/owner/revenue' }
  ] : [
    { label: 'Explore Portal', path: '/explore' },
    { label: 'GARF SQUAD 👾', path: '/squad' },
    { label: 'FAQ Feed', path: '/faq' },
    { label: 'About', path: '/about' },
    { label: 'Contact Help', path: '/contact' }
  ];

  return (
    <div className="bg-[#030303] text-white min-h-screen flex flex-col font-sans selection:bg-brand-purple/40 selection:text-white antialiased">
      {/* Dynamic Toaster Notifications */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#12121A',
            color: '#fff',
            border: '1px solid #2a2a3e'
          }
        }} 
      />

      {/* 🚀 ELECTRIC STICKY NAVBAR */}
      <header className={`sticky top-0 z-50 bg-[#030303]/85 backdrop-blur-md border-b ${isOwner ? 'border-[#06B6D4]/20' : 'border-[#1A1A2E]/80'} transition`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            
            {/* Logo */}
            <Link to={isOwner ? "/owner-dashboard" : "/"} className="flex items-center gap-2 focus:outline-none group">
              <div className={`p-1.5 sm:p-2 rounded-xl bg-gradient-to-br ${isOwner ? 'from-cyan-500/20 to-[#06B6D4]/5 border border-[#06B6D4]/30 group-hover:border-[#06B6D4]' : 'from-brand-purple/20 to-brand-pink/5 border border-brand-purple/30 group-hover:border-brand-purple'} transition-all duration-300`}>
                {isOwner ? (
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-[#06B6D4] animate-pulse" />
                ) : (
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-purple group-hover:scale-110 transition-transform duration-300" />
                )}
              </div>
              <span className={`text-2xl sm:text-3xl font-display font-black tracking-tighter ${isOwner ? 'text-[#06B6D4]' : 'text-gradient'}`}>
                GARF
              </span>
              {isOwner && (
                <span className="text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border text-cyan-400 bg-cyan-950/20 border-cyan-500/20 animate-pulse">
                  OWNER
                </span>
              )}
            </Link>

            {/* Desktop Center Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#a8a8cf]">
              {navLinks.map(link => {
                const isActive = location.pathname === link.path || (link.path === '/owner-dashboard' && location.pathname.startsWith('/owner/dashboard'));
                return (
                  <Link 
                    key={link.path} 
                    to={link.path}
                    className={`hover:text-white transition-colors py-1 relative ${isActive ? 'text-white' : ''}`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${isOwner ? 'bg-[#06B6D4] glow-cyan' : 'bg-brand-purple glow-purple'}`}></span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex items-center gap-4">
              {!currentUser ? (
                <div className="flex items-center gap-3">
                  <Link 
                    to="/login"
                    className="px-4 py-2 border border-border-dark rounded-xl text-xs font-bold uppercase tracking-wider text-[#a8a8cf] hover:text-white hover:border-[#a8a8cf] transition"
                  >
                    User Login
                  </Link>
                  <Link 
                    to="/owner/login"
                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-brand-purple to-[#06B6D4] text-white shadow-md transition hover:scale-101 hover:brightness-110"
                  >
                    Owner Login
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3.5 bg-[#12121A] py-1.5 pl-3.5 pr-1.5 border border-[#202033] rounded-full">
                  {/* Active Operator Badge near dropdown */}
                  {isOwner && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-[#06B6D4] text-[10px] uppercase font-bold tracking-wide">
                      🏢 ACTIVE OPERATOR
                    </div>
                  )}

                  {/* Operational console redirects */}
                  <div className="flex items-center gap-2">

                    <div className="relative group text-sm font-medium">
                      <button className={`flex items-center gap-1 px-2.5 py-1 bg-black/40 hover:bg-[#1A1A2E] border rounded-full ${isOwner ? 'border-cyan-500/20 text-cyan-400 hover:text-white' : 'border-[#2a2a3e] text-[#a8a8cf] hover:text-white'} transition cursor-pointer`}>
                        <User className="h-4 w-4" />
                        <span className="max-w-[80px] truncate">{(currentUser.full_name || '').split(' ')[0] || 'User'}</span>
                      </button>

                      {/* Dropdown list hover/focus */}
                      <div className="absolute right-0 top-full pt-1.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition duration-200">
                        <div className={`bg-[#12121A] border rounded-xl p-2 w-48 shadow-2xl flex flex-col gap-1 ${isOwner ? 'border-cyan-500/30' : 'border-[#2a2a3e]'}`}>
                          {!isOwner ? (
                            <>
                              <Link to="/my-bookings" className="px-3.5 py-2 hover:bg-[#1C1C2A]/60 rounded-lg text-xs font-bold tracking-wide uppercase transition block">
                                🎮 My Bookings
                              </Link>
                              <Link to="/my-profile" className="px-3.5 py-2 hover:bg-[#1C1C2A]/60 rounded-lg text-xs font-bold tracking-wide uppercase transition block">
                                👤 Edit Profile
                              </Link>
                            </>
                          ) : (
                            <>
                              <Link to="/owner/settings" className="px-3.5 py-2 hover:bg-cyan-950/45 text-cyan-400 rounded-lg text-xs font-bold tracking-wide uppercase transition block">
                                👤 My Account
                              </Link>
                              <Link to="/owner-dashboard" className="px-3.5 py-2 hover:bg-cyan-950/45 text-cyan-400 rounded-lg text-xs font-bold tracking-wide uppercase transition block">
                                🏢 Owner Console
                              </Link>
                            </>
                          )}
                          <button 
                            onClick={handleLogout}
                            className="w-full text-left px-3.5 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold tracking-wide uppercase transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded bg-[#12121A] border text-text-secondary hover:text-white cursor-pointer ${isOwner ? 'border-cyan-500/20' : 'border-[#2a2a3e]'}`}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

          </div>
        </div>

        {/* Mobile dropdown list drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0c0c14] border-b border-[#2a2a3e] p-6 space-y-6">
            <nav className="flex flex-col gap-4 text-sm font-semibold text-[#a8a8cf]">
              {navLinks.map(link => (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-[#1F1F2F] pt-6 flex flex-col gap-3.5 w-full">
              {!currentUser ? (
                <div className="flex flex-col gap-2.5">
                  <Link 
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-3 text-center border border-[#2a2a3e] hover:text-white rounded-xl text-sm font-semibold text-[#a8a8cf]"
                  >
                    User Login
                  </Link>
                  <Link 
                    to="/owner/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-3 text-center bg-gradient-to-r from-brand-purple to-[#06B6D4] font-bold text-sm text-white rounded-xl shadow-md"
                  >
                    Owner Login
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2 py-1.5 bg-[#121219] border border-border-dark rounded-xl">
                    <span className="text-xs text-text-secondary">{isOwner ? 'Operator Name:' : 'Player Name:'}</span>
                    <span className="text-sm font-bold">{currentUser.full_name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold uppercase tracking-wider text-center">
                    {!isOwner ? (
                      <>
                        <Link to="/my-bookings" onClick={() => setMobileMenuOpen(false)} className="py-3 bg-[#161622] text-[#a8a8cf] rounded-xl border border-border-dark">My Bookings</Link>
                        <Link to="/my-profile" onClick={() => setMobileMenuOpen(false)} className="py-3 bg-[#161622] text-[#a8a8cf] rounded-xl border border-border-dark">Edit Profile</Link>
                      </>
                    ) : (
                      <>
                        <Link to="/owner/settings" onClick={() => setMobileMenuOpen(false)} className="py-3 bg-cyan-950/20 text-cyan-400 rounded-xl border border-cyan-500/20">My Account</Link>
                        <Link to="/owner-dashboard" onClick={() => setMobileMenuOpen(false)} className="py-3 bg-cyan-950/20 text-cyan-400 rounded-xl border border-cyan-500/20">Console Dashboard</Link>
                      </>
                    )}
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="w-full py-3.5 bg-red-600/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold text-center cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 🔮 MAIN CANVAS ROUTE SPANS */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/venue/:id" element={<VenueDetailPage />} />
          
          {/* Customer Booking Flow and Logs pages */}
          <Route path="/booking/:venueId" element={<BookingFlowPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/my-profile" element={<MyProfilePage />} />
          
          {/* Owner Portal Routes */}
          <Route path="/owner/login" element={<OwnerLoginPage />} />
          <Route path="/owner/signup" element={<OwnerSignupPage />} />
          <Route path="/owner/forgot-password" element={<OwnerForgotPasswordPage />} />
          <Route path="/owner/settings" element={<OwnerSettingsPage />} />
          
          <Route path="/owner/dashboard" element={<OwnerDashboardPage tab="dashboard" />} />
          <Route path="/owner/bookings" element={<OwnerDashboardPage tab="bookings" />} />
          <Route path="/owner/revenue" element={<OwnerDashboardPage tab="revenue" />} />
          <Route path="/owner/slots" element={<OwnerDashboardPage tab="slots" />} />
          <Route path="/owner/resources" element={<OwnerDashboardPage tab="resources" />} />
          <Route path="/owner/reviews" element={<OwnerDashboardPage tab="reviews" />} />
          <Route path="/owner/offers" element={<OwnerDashboardPage tab="offers" />} />
          <Route path="/owner/staff" element={<OwnerDashboardPage tab="staff" />} />
          
          {/* Dashboard portals */}
          <Route path="/owner/register" element={<OwnerRegisterPage />} />
          <Route path="/owner-dashboard" element={<OwnerDashboardPage />} />
          <Route path="/garfadmin" element={<GarfAdminPage />} />
          <Route path="/squad" element={<GarfSquadPage />} />

          {/* Static Pages Info */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/refund" element={<RefundPolicyPage />} />

          {/* Fallback */}
          <Route path="*" element={
            <div className="max-w-4xl mx-auto py-20 text-center text-white font-sans space-y-4">
              <span className="text-6xl">🗺️</span>
              <h2 className="text-3xl font-display font-medium">Page Not Found</h2>
              <p className="text-text-secondary text-sm">We couldn't secure coordinates mapping the specified location path.</p>
              <Link to={isOwner ? "/owner-dashboard" : "/"} className="inline-block py-2.5 px-6 btn-gradient font-bold rounded-xl text-sm shadow-md">
                Return Home
              </Link>
            </div>
          } />
        </Routes>
      </main>

      {/* 🔌 THE PLATFORM FOOTER */}
      <footer className="bg-[#050508] border-t border-[#12121F] py-16 text-xs sm:text-sm text-text-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2 text-2xl font-display font-black tracking-tight text-white mb-2 focus:outline-none group">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-brand-purple/20 to-brand-pink/5 border border-brand-purple/30 group-hover:border-brand-purple transition">
                <Gamepad2 className="w-3.5 h-3.5 text-brand-purple" />
              </div>
              <span>GARF</span>
            </Link>
            <p className="text-xs text-text-secondary leading-relaxed max-w-xs">
              Gaming Arena & Recreation Finder. Seamless, lightning-fast on-demand reservation portal for PC lounges, console booths, and VR zones.
            </p>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-white uppercase tracking-widest font-mono text-xs">Explore Links</h5>
            <ul className="space-y-2">
              <li><Link to="/explore" className="hover:text-white transition">Explore Venues</Link></li>
              <li><Link to="/explore?type=pc" className="hover:text-white transition">Esports PCs</Link></li>
              <li><Link to="/explore?type=ps5" className="hover:text-white transition">Console Lounges</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-white uppercase tracking-widest font-mono text-xs">Help desk</h5>
            <ul className="space-y-2">
              <li><Link to="/faq" className="hover:text-white transition">General FAQs</Link></li>
              <li><Link to="/contact" className="hover:text-white transition">Contact Partner Staff</Link></li>
              <li><Link to="/about" className="hover:text-white transition">About the Team</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-white uppercase tracking-widest font-mono text-xs">Policy Index</h5>
            <ul className="space-y-2 text-xs">
              <li><Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition">Client Terms</Link></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 mt-10 border-t border-[#12121F]/80 text-center font-mono text-xs text-text-secondary/60">
          <p>© {new Date().getFullYear()} GARF Platforms Inc. All gaming coordinates secured. Built for elite computing and athletic squads.</p>
        </div>
      </footer>

    </div>
  );
}
