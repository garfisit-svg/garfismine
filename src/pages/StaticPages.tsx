import React, { useState } from 'react';
import { Mail, Phone, Clock, FileText, CheckCircle, Shield, AlertTriangle, ArrowRight, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// 1. ABOUT PAGE
export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 font-sans">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-sm font-semibold text-brand-cyan tracking-wider uppercase block mb-3">
          🎮 India's Gaming Booking Platform
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight mb-6">
          The Story of <span className="text-gradient">GARF</span>
        </h1>
        <p className="text-lg text-text-secondary">
          We are built for India's GenZ gaming generation. From casual couch co-op campaigns to hyper-competitive elite esports setups, GARF unites matches in 60 seconds.
        </p>
      </div>

      <div className="glass-card p-8 md:p-12 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-display font-bold mb-6">Built by Gamers, For Gamers</h2>
            <p className="text-text-secondary mb-4">
              Our founder envisioned a unified gaming infrastructure in India where finding a high-performance system shouldn't require dozen phone calls, unreliable waitlists, or cash struggles. 
            </p>
            <p className="text-text-secondary mb-6">
              With real-time slot bookings, exclusive partner lounge offers, and a robust platform covering every premium gaming cafe, we are here to maximize your play time.
            </p>
            <div className="flex items-center gap-2 text-brand-cyan font-semibold">
              <span>Find your local arena now</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          <div className="relative rounded-xl overflow-hidden aspect-video">
            <img 
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800" 
              alt="Esports Arena" 
              className="object-cover w-full h-full"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. CONTACT PAGE
export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Message sent successfully to garfisit@gmail.com! Our squad will email you back.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 font-sans">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
          Contact the <span className="text-gradient">Squad</span>
        </h1>
        <p className="text-lg text-text-secondary">
          Need tech support, booking assistance, or interested in listing your arena? Drop us a ping! All messages are directly routed to <span className="text-[#06B6D4] font-medium">garfisit@gmail.com</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
        {/* Info Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8">
            <h3 className="text-xl font-semibold mb-6">Direct Channels</h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-purple/10 rounded-lg text-brand-purple">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider font-mono">SUPPORT EMAIL</p>
                  <p className="text-lg font-semibold text-white">garfisit@gmail.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-green/10 rounded-lg text-brand-green">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider font-mono">SUPPORT HOURS</p>
                  <p className="text-lg font-semibold text-white">9:00 AM - 9:00 PM</p>
                  <p className="text-sm text-text-secondary">Monday to Saturday</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Column */}
        <div className="lg:col-span-3 glass-card p-8 sm:p-10">
          <div className="mb-6">
            <h3 className="text-2xl font-bold">Send Us a Message</h3>
            <p className="text-xs text-text-secondary mt-1">Directly routed to garfisit@gmail.com</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Your Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Karan Malhotra"
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-purple"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email Address <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="karan@gmail.com"
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-purple"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input
                type="text"
                placeholder="Booking inquiry / Partners option"
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-purple"
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message <span className="text-red-500">*</span></label>
              <textarea
                required
                rows={5}
                placeholder="Shoot your query, booking reference, or details here..."
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-purple resize-none"
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
              ></textarea>
            </div>

            <button type="submit" className="w-full py-4 text-center text-white font-semibold rounded-lg btn-gradient">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// 3. FAQ PAGE
export const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How do I cancel a booking?',
      a: 'Head to "My Bookings" in your profile, find the session in your "Upcoming" tab, and click "Cancel Booking" to release your slot back to the cafe pool.'
    },
    {
      q: 'Can I change my booking time?',
      a: 'We do not support direct rescheduling yet. However, you can cancel your upcoming slot and book a fresh, convenient slot instantly.'
    },
    {
      q: 'What payment methods are accepted?',
      a: 'We accept standard UPI transfer codes, cash payments directly at the counter, and Pay-at-Venue holding. Rest assured, for Pay-at-Venue, zero balance is charged on failure or hold expiration!'
    },
    {
      q: 'How does Pay at Venue work and what happens if the timer expires?',
      a: 'If you opt for Pay-at-Venue, your slot is reserved for 15 minutes after your start time. If you do not reach and check in with the owner inside that limit, the slot releases automatically for others with no charge!'
    },
    {
      q: 'Can the owner extend my hold?',
      a: 'Yes! Owners have an "Extend Hold" command on their dashboards. This grants an extra 15 minutes max, but can only be triggered once per reservation!'
    },
    {
      q: 'How long does owner venue verification take?',
      a: 'GARF headquarters monitors queue 24/7. Standard verification of Aadhar/PAN and facility coordinates concludes in under 24 hours.'
    },
    {
      q: 'What is the platform fee or commission rate?',
      a: 'For owners, we take a standard 10% commission on online customer bookings. For customers, a humble platform fee of ₹5 is applied to secure bookings and live hold engines.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 font-sans">
      <div className="text-center mb-16">
        <HelpCircle className="h-12 w-12 text-brand-purple mx-auto mb-4" />
        <h1 className="text-4xl font-display font-bold">Frequently Asked <span className="text-gradient">Questions</span></h1>
        <p className="text-text-secondary mt-2">Get swift answers regarding bookings, holds, and venue rules.</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="glass-card overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full text-left p-6 flex justify-between items-center bg-[#12121A]/40 transition hover:bg-[#161622]"
            >
              <span className="font-semibold text-lg">{faq.q}</span>
              <span className="text-brand-cyan font-bold text-xl ml-4">
                {openIndex === idx ? '−' : '+'}
              </span>
            </button>
            {openIndex === idx && (
              <div className="p-6 pt-2 text-text-secondary border-t border-[#2a2a3e] bg-[#0c0c14]/50 leading-relaxed text-sm sm:text-base">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. PRIVACY POLICY
export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 font-sans leading-relaxed">
      <h1 className="text-3xl font-display font-bold mb-6">Privacy Policy</h1>
      <p className="text-text-secondary mb-4">Last Updated: June 2, 2026</p>
      
      <p className="mb-6 text-text-secondary">
        At GARF (Gaming Arena & Recreation Finder), we take data safety seriously. We process basic profiles, email keys, contact numbers, referral linkages, location cookies, and identity verifications (Aadhar/PAN numbers for venue owners) securely.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-4">1. Data Storage & Protection</h2>
      <p className="text-text-secondary mb-4">
        Information submitted across forms (Aadhar/PAN cards, bank route digits) is heavily hashed, preserved, and handled only within platform verification queues. We never resell your phone numbers or session histories to external advertising pools.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-4">2. Cookies and Geocoding</h2>
      <p className="text-text-secondary mb-4">
        We utilize coordinates purely to align nearest gaming cafes around your current Indian city (Mumbai, Hyderabad, Delhi, Bangalore, etc). Longterm tracking cookies are strictly omitted.
      </p>
    </div>
  );
};

// 5. TERMS OF SERVICE
export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 font-sans leading-relaxed">
      <h1 className="text-3xl font-display font-bold mb-6">Terms of Service</h1>
      <p className="text-text-secondary mb-4">Last Updated: June 2, 2026</p>

      <h2 className="text-xl font-bold mt-8 mb-4">1. User Accountability</h2>
      <p className="text-text-secondary mb-4">
        Booking slots must be utilized by the account owner. Standard GenZ code of conduct applies: zero toxic behavior or equipment damage is tolerated at the registered arenas. Violation invites permanent profile suspension.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-4">2. Owner Obligations</h2>
      <p className="text-text-secondary mb-4">
        Owners must honor booked slots in real time. Refusal to coordinate checked-in sessions results in commission audit and automated dispute refunds back to player profiles.
      </p>
    </div>
  );
};

// 6. REFUND POLICY PAGE
export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 font-sans leading-relaxed">
      <div className="flex items-center gap-4 mb-6">
        <FileText className="h-10 w-10 text-brand-cyan" />
        <h1 className="text-3xl font-display font-bold">Cancellation & Refund Policy</h1>
      </div>
      <p className="text-text-secondary mb-8">We believe in full transparency and flexibility for online gamers and registered cafe players.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="glass-card p-6 border-l-4 border-brand-green">
          <CheckCircle className="h-8 w-8 text-brand-green mb-3" />
          <h3 className="font-bold mb-1">Cancellations Allowed</h3>
          <p className="text-xs text-text-secondary">You can cancel your booking anytime from "My Bookings" to free up the slot for others.</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-red-500">
          <CheckCircle className="h-8 w-8 text-red-500 mb-3" />
          <h3 className="font-bold mb-1">No Refunds ⚠️</h3>
          <p className="text-xs text-text-secondary">Please note that once a slot is booked and paid online, cancellations do NOT qualify for any refund.</p>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-bold text-lg">Notable Rules:</h3>
        <ul className="list-disc pl-5 space-y-3 text-sm text-text-secondary">
          <li><strong>Paid Online Bookings:</strong> No refunds are issued for cancellations. The slot is freed up, but the paid amount is non-refundable.</li>
          <li><strong>Pay-at-Venue Bookings:</strong> No pre-charges are ever applied. You can cancel with no charge, or failing to check-in within 15 mins of start simply releases the slot.</li>
        </ul>
      </div>
    </div>
  );
};
