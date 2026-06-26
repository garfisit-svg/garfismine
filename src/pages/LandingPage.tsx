import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Gamepad2, Search, Calendar, Trophy, Zap, Shield, Gift, 
  ChevronRight, Smartphone, Bell, Mail, Users, Star, ArrowUpRight, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, notifications, detectedCity } = useApp();
  
  // Search state
  const [searchCity, setSearchCity] = useState(currentUser?.city || detectedCity || 'Mumbai');
  const [searchCategory, setSearchCategory] = useState('All');
  const [hasManuallyChanged, setHasManuallyChanged] = useState(false);

  // Newsletter state
  const [email, setEmail] = useState('');

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Sync searchCity with user preference or detectedCity on load
  useEffect(() => {
    if (!hasManuallyChanged) {
      if (currentUser?.city) {
        setSearchCity(currentUser.city);
      } else if (detectedCity) {
        setSearchCity(detectedCity);
      }
    }
  }, [currentUser, detectedCity, hasManuallyChanged]);

  const handleSearch = () => {
    let url = `/explore?city=${searchCity}`;
    if (searchCategory !== 'All') {
      url += `&type=${searchCategory}`;
    }
    navigate(url);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please specify active email address');
      return;
    }
    toast.success('Awesome! We will ping you when the Android & iOS apps go live!');
    setEmail('');
  };

  return (
    <div className="font-sans min-h-screen bg-bg-dark text-white select-none">
      
      {/* SECTION 1: HERO */}
      <section className="relative overflow-hidden py-24 sm:py-32 border-b border-border-dark">
        {/* Animated ambient blob background */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 bg-brand-purple/10 border border-brand-purple/20 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-brand-purple mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
            </span>
            🎮 India's Gaming Booking Platform
          </div>

          <h1 className="text-5xl sm:text-7xl font-display font-black tracking-tight mb-6">
            Find. Book. <span className="text-gradient">Play.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-text-secondary text-base sm:text-xl mb-12">
            Discover premier high-end gaming cafes and esports arenas near you. Secure your station, pick your hours, and book in 60 seconds.
          </p>

          {/* 3-Part Search Bar Widget */}
          <div className="max-w-4xl mx-auto bg-card-dark/80 backdrop-blur-xl border border-border-dark p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-4 items-center">
            
            {/* Part 1: City Dropdown */}
            <div className="w-full md:w-1/3 flex flex-col items-start gap-1 px-2">
              <span className="text-xs text-text-secondary font-mono">SELECT CITY</span>
              <select
                className="w-full bg-transparent text-white font-semibold py-1 focus:outline-none cursor-pointer text-sm sm:text-base border-b border-border-dark py-2 md:border-none"
                value={searchCity}
                onChange={e => {
                  setSearchCity(e.target.value);
                  setHasManuallyChanged(true);
                }}
              >
                <option value="Mumbai" className="bg-card-dark">Mumbai</option>
                <option value="Delhi" className="bg-card-dark">Delhi</option>
                <option value="Bangalore" className="bg-card-dark">Bangalore</option>
                <option value="Hyderabad" className="bg-card-dark">Hyderabad</option>
                <option value="Pune" className="bg-card-dark">Pune</option>
                <option value="Chennai" className="bg-card-dark">Chennai</option>
                <option value="Kolkata" className="bg-card-dark">Kolkata</option>
                <option value="Jaipur" className="bg-card-dark">Jaipur</option>
              </select>
            </div>

            <div className="hidden md:block h-10 w-px bg-border-dark"></div>

            {/* Part 2: Station Dropdown */}
            <div className="w-full md:w-1/3 flex flex-col items-start gap-1 px-2">
              <span className="text-xs text-text-secondary font-mono">STATION CATEGORY</span>
              <select
                className="w-full bg-transparent text-white font-semibold py-1 focus:outline-none cursor-pointer text-sm sm:text-base border-b border-border-dark py-2 md:border-none"
                value={searchCategory}
                onChange={e => setSearchCategory(e.target.value)}
              >
                <option value="All" className="bg-card-dark">All Stations</option>
                <option value="pc" className="bg-card-dark">🖥️ Esports PC Rigs</option>
                <option value="ps5" className="bg-card-dark">🎮 Console (PS5/Xbox)</option>
                <option value="vr" className="bg-card-dark">🽏 VR Station</option>
              </select>
            </div>

            {/* Part 3: Search Button */}
            <button
              onClick={handleSearch}
              className="w-full md:w-1/3 py-4 btn-gradient font-bold text-white shadow-lg flex items-center justify-center gap-2"
            >
              <Search className="h-5 w-5" />
              <span>Search Arenas</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: HOW IT WORKS */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border-dark">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Book in <span className="text-gradient">3 Simple Steps</span>
          </h2>
          <p className="text-text-secondary mt-3">Play hard without any queues or delayed reservation struggles</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 relative overflow-hidden group">
            <span className="absolute top-4 right-4 text-6xl font-display font-black text-white/5 group-hover:text-brand-purple/10 transition">01</span>
            <div className="p-3 bg-brand-purple/10 text-brand-purple rounded-xl w-fit mb-6">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Search Nearby</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Enter your Indian metropolis, toggle sports fields or PC cafes, and discover elite active listings.
            </p>
          </div>

          <div className="glass-card p-8 relative overflow-hidden group">
            <span className="absolute top-4 right-4 text-6xl font-display font-black text-white/5 group-hover:text-brand-cyan/10 transition">02</span>
            <div className="p-3 bg-brand-cyan/10 text-brand-cyan rounded-xl w-fit mb-6">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Pick Your Slot</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Select date, station size, consecutive hours, and unlock automated discount promotions.
            </p>
          </div>

          <div className="glass-card p-8 relative overflow-hidden group">
            <span className="absolute top-4 right-4 text-6xl font-display font-black text-white/5 group-hover:text-brand-green/10 transition">03</span>
            <div className="p-3 bg-brand-green/10 text-brand-green rounded-xl w-fit mb-6">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Show Up and Play</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Walk in, present your automated booking QR ticket, and instantly secure your high-performance seat!
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: CATEGORIES */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border-dark">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            What Are You <span className="text-gradient">Looking For?</span>
          </h2>
          <p className="text-text-secondary mt-3">Access India's ultimate high-end gaming cafe hubs and reserved stations</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Link 
            to="/explore"
            className="group relative rounded-2xl overflow-hidden aspect-[16/10] md:aspect-[21/9] border border-border-dark flex items-end p-8 sm:p-12 block"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/50 to-transparent z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200" 
              alt="Premium Gaming Cafes" 
              className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="relative z-20 space-y-4 max-w-xl">
              <span className="text-xs text-brand-purple font-mono uppercase tracking-wider bg-brand-purple/10 border border-brand-purple/20 px-3 py-1 rounded-full w-fit inline-block">
                GENZ ESPORTS MATRIX
              </span>
              <h3 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
                Premium Gaming Cafés
              </h3>
              <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
                Elite RTX 4080 towers, 240Hz esports displays, co-op PlayStation 5 setups, and high-fidelity VR zones in cities near you.
              </p>
              <div className="inline-flex items-center gap-2 text-brand-purple font-semibold pt-2 text-sm sm:text-base">
                <span>Browse All Active Gaming Cafes</span>
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* SECTION 4: WHY GARF */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border-dark">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Why Choose <span className="text-gradient">GARF?</span>
          </h2>
          <p className="text-text-secondary mt-3">The premium digital interface engineered for high durability matching esports standards</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: <Zap className="h-6 w-6 text-brand-purple" />, title: 'Real-time Availability', desc: 'Strict database locks prevent double booking battles instantly.' },
            { icon: <Shield className="h-6 w-6 text-brand-cyan" />, title: 'Secure Payments', desc: 'Secure UPI gateways paired with full cashback safety audits.' },
            { icon: <Trophy className="h-6 w-6 text-brand-green" />, title: 'Earn GARF Coins', desc: 'Get 10% back on play bookings. Complete streaks and reviews.' },
            { icon: <Smartphone className="h-6 w-6 text-purple-400" />, title: '60 Second Booking', desc: 'One-click consecutive slot checking, zero registration waitls.' },
            { icon: <CheckCircle className="h-6 w-6 text-cyan-400" />, title: 'Verified Arenas', desc: 'Physical verification on Aadhar/PAN guidelines ensures top gaming specs.' },
            { icon: <Star className="h-6 w-6 text-yellow-500" />, title: 'Best Prices', desc: 'Exclusive weekday rates, weekend lounge promos, and zero mystery fees.' }
          ].map((feat, idx) => (
            <div key={idx} className="glass-card p-6 flex gap-4 items-start">
              <div className="p-3 bg-[#161622] border border-[#2a2a3e] rounded-xl flex-shrink-0">
                {feat.icon}
              </div>
              <div>
                <h4 className="text-lg font-bold mb-1.5">{feat.title}</h4>
                <p className="text-text-secondary text-sm leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: COINS PROMO */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border-dark">
        <div className="glass-card bg-gradient-to-r from-brand-purple/20 via-[#12121A] to-brand-cyan/20 p-8 sm:p-12 rounded-3xl relative overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <span className="text-xs text-brand-green bg-brand-green/10 border border-brand-green/20 px-3 py-1 rounded-full font-mono uppercase tracking-wider inline-block">
              🪙 LOYALTY PROTOCOL
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-black tracking-tight leading-tight">
              Earn While <span className="text-gradient">You Play</span>
            </h2>
            <p className="text-text-secondary leading-relaxed">
              We keep the network extremely simple and budget-friendly with no high investment or complicated tasks. Enjoy instant savings with your welcome bonus on your first game!
            </p>

            <ul className="space-y-3.5 text-sm sm:text-base">
              {[
                'Get 10 Welcome Coins free instantly upon registration',
                '1 GARF Coin = 1 Rupee discount',
                'Redeem easily at checkout on your very first play slot',
                'Zero complex systems, zero hidden investments required'
              ].map((item, idx) => (
                <li key={idx} className="flex gap-2 items-center">
                  <Gift className="h-4 w-4 text-brand-cyan" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link
              to={currentUser ? '/explore' : '/signup'}
              className="inline-flex items-center gap-2 btn-gradient px-8 py-3.5 font-bold shadow-lg hover:opacity-95"
            >
              <span>{currentUser ? 'Explore Venues' : 'Register Profile'}</span>
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="flex justify-center relative">
            {/* Glowing Coin Artwork */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center bg-card-dark rounded-full border-2 border-brand-cyan/20 shadow-2xl glow-cyan animate-pulse">
              <span className="text-8xl select-none filter drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">🪙</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: FOR OWNERS */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border-dark grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl sm:text-4xl font-display font-bold">
            Own a Gaming <span className="text-gradient">Cafe?</span>
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Put your computer rigs and consoles on India's premium recreation booking channel. Fill offline empty gaps, automate slot hold timers, track payments, and access detailed revenue payout audits easily.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              '✅ Free to list with zero pre-charges',
              '✅ Real-time booking management dashboards',
              '✅ Bulk slot blocking & Walk-in lockouts',
              '✅ Interactive net revenue breakdowns',
              '✅ Custom percentage discounts & offers creator',
              '✅ Automated weekly direct settlements'
            ].map((ben, idx) => (
              <span key={idx} className="text-sm font-semibold flex items-center gap-2 text-text-secondary">
                {ben}
              </span>
            ))}
          </div>

          <div className="pt-4">
            <Link
              to="/owner/register"
              className="btn-gradient px-8 py-4 font-bold text-white shadow-lg shadow-brand-purple/20 hover:shadow-brand-purple/40"
            >
              Register Your Venue Free
            </Link>
          </div>
        </div>

        <div className="glass-card p-6 relative overflow-hidden rounded-2xl aspect-[4/3] flex flex-col justify-between border-2 border-brand-purple/20">
          <div className="flex justify-between items-center bg-[#161622] p-4 border border-border-dark rounded-xl">
            <div className="flex gap-2 items-center">
              <Gamepad2 className="h-5 w-5 text-brand-purple" />
              <span className="font-bold text-sm font-display">Owner Console Mockup</span>
            </div>
            <div className="h-2.5 w-2.5 bg-brand-green rounded-full"></div>
          </div>

          <div className="space-y-4 my-6 flex-grow flex flex-col justify-center">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#161622] p-4 rounded-xl border border-border-dark text-center">
                <span className="text-xs text-text-secondary">TODAY REVENUE</span>
                <p className="text-xl font-bold font-mono mt-1 text-brand-green">₹4,800</p>
              </div>
              <div className="bg-[#161622] p-4 rounded-xl border border-border-dark text-center">
                <span className="text-xs text-text-secondary">OCCUPANCY RATE</span>
                <p className="text-xl font-bold font-mono mt-1 text-brand-cyan">78%</p>
              </div>
              <div className="bg-[#161622] p-4 rounded-xl border border-border-dark text-center">
                <span className="text-xs text-text-secondary">PENDING HOLDS</span>
                <p className="text-xl font-bold font-mono mt-1 text-yellow-500">2 Active</p>
              </div>
            </div>
            <div className="bg-[#161622] h-20 rounded-xl border border-border-dark flex items-center justify-center text-text-secondary font-mono text-xs text-center px-4">
              ✨ Real-time dynamic visual calendar tracking PC 1, PC 2 ...
            </div>
          </div>

          <div className="bg-[#161622] px-4 py-3 rounded-xl border border-border-dark font-semibold text-xs flex justify-between items-center text-text-secondary">
            <span>Securely verified on Aadhar KYC guidelines</span>
            <ArrowUpRight className="h-4 w-4 text-brand-cyan" />
          </div>
        </div>
      </section>

      {/* SECTION 7: CITIES GRID */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border-dark">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-display font-semibold">Available In Your <span className="text-gradient">Indian Metropolis</span></h2>
          <p className="text-text-secondary text-sm mt-2">Filter and secure top specifications right on coordinates</p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          {['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Jaipur'].map((ct, idx) => (
            <button
              key={idx}
              onClick={() => navigate(`/explore?city=${ct}`)}
              className="bg-[#12121A] border border-[#2a2a3e] px-8 py-3.5 rounded-full text-sm font-semibold hover:border-brand-cyan hover:text-brand-cyan transition duration-300"
            >
              {ct}
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 8: APP COMING SOON */}
      <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="glass-card p-8 sm:p-12 space-y-6">
          <Smartphone className="h-10 w-10 text-brand-cyan mx-auto animate-bounce" />
          <h2 className="text-3xl font-display font-extrabold text-white">GARF App Coming Soon</h2>
          <p className="text-text-secondary max-w-md mx-auto text-sm">
            Sign up for the pre-release newsletter! Get exclusive discount voucher codes dispatched immediately on app store launching.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="name@gmail.com"
              className="flex-grow bg-[#161622] border border-[#2a2a3e] px-4 py-3 rounded-lg text-white font-semibold text-sm focus:outline-none focus:border-brand-purple"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button type="submit" className="px-6 py-3 btn-gradient text-sm font-bold shadow-md">
              Notify Me
            </button>
          </form>

          {/* Grayscale app stores badges */}
          <div className="flex justify-center gap-4 opacity-30 pt-4">
            <div className="h-10 w-28 bg-[#161622] rounded border border-border-dark flex items-center justify-center text-[10px] font-bold font-mono">
              App Store
            </div>
            <div className="h-10 w-28 bg-[#161622] rounded border border-border-dark flex items-center justify-center text-[10px] font-bold font-mono">
              Google Play
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
