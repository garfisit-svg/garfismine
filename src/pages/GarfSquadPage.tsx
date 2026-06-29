import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, MessageSquare, Vote, Calendar, MapPin, 
  Search, Shield, CheckCircle2, XCircle, Send, Plus, 
  Trash2, CornerDownRight, PlusCircle, AlertCircle, Sparkles, 
  UserCheck, Bell, Info, ArrowUpRight, Flame, Trophy, Activity, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

export function GarfSquadPage() {
  const { 
    currentUser, 
    // SQUAD States
    squadProfiles, squads, squadMembers, messages, polls, pollVotes, 
    playerNeededPosts, playerNeededResponses, nearbyCheckins, squadInvites, squadEvents, profiles, venues,
    // SQUAD Actions
    createSquadProfile, updateSquadProfile, createSquad, joinSquadWithCode, joinPublicSquad, 
    leaveSquad, acceptSquadJoinRequest, declineSquadJoinRequest, deleteSquad, sendMessage, 
    deleteMessage, replyToMessage, createPoll, voteInPoll, createPlayerNeededPost, 
    requestToJoinPlayerNeeded, respondToPlayerNeededJoin, managePlayerNeededPost, 
    sendSquadInvite, respondToSquadInvite, createSquadEvent, rsvpToSquadEvent, 
    updateNearbyCheckinMeetStatus, checkoutNearbyCheckin
  } = useApp();

  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Core navigation tab state
  // "squads" | "global" | "listings" | "nearby" | "invites"
  const [activeTab, setActiveTab] = useState<'squads' | 'global' | 'listings' | 'nearby' | 'invites'>('squads');
  
  // Selected squad sub-view ('list' or specific squad ID)
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);

  // Form input states
  const [searchQuery, setSearchQuery] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);

  // Profile setup wizard parameters
  const [pUsername, setPUsername] = useState('');
  const [pGamerTag, setPGamerTag] = useState('');
  const [pBio, setPBio] = useState('');
  const [pPreferredCity, setPPreferredCity] = useState('');
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  // Squad Creation Form State
  const [isCreatingSquad, setIsCreatingSquad] = useState(false);
  const [sqName, setSqName] = useState('');
  const [sqDescription, setSqDescription] = useState('');
  const [sqType, setSqType] = useState<'gaming' | 'sports'>('gaming');
  const [sqCity, setSqCity] = useState('');
  const [sqGameSport, setSqGameSport] = useState('');
  const [sqMaxMembers, setSqMaxMembers] = useState(10);
  const [sqIsPrivate, setSqIsPrivate] = useState(false);
  const [sqVenueId, setSqVenueId] = useState('');
  const [sqCoverImage, setSqCoverImage] = useState('');

  // SQUAD Event Creation Modal State
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtTime, setEvtTime] = useState('');
  const [evtVenueId, setEvtVenueId] = useState('');
  const [evtGameSport, setEvtGameSport] = useState('');
  const [evtMaxParts, setEvtMaxParts] = useState(12);
  const [evtNotes, setEvtNotes] = useState('');

  // SQUAD Poll Creation State
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollExpires, setPollExpires] = useState('');

  // Player Post Creation Form State
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postCity, setPostCity] = useState('');
  const [postVenueId, setPostVenueId] = useState('');
  const [postGameSport, setPostGameSport] = useState('');
  const [postPlayersNeeded, setPostPlayersNeeded] = useState(2);
  const [postDate, setPostDate] = useState('');
  const [postTime, setPostTime] = useState('');
  const [postShareGlobal, setPostShareGlobal] = useState(true);
  const [postShareSquads, setPostShareSquads] = useState(true);

  // Invite member panel
  const [isInvitingGamer, setIsInvitingGamer] = useState(false);
  const [inviteGamerTag, setInviteGamerTag] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  // Dynamic user matching request memo
  const [matchRequestPostId, setMatchRequestPostId] = useState<string | null>(null);
  const [matchRequestMsg, setMatchRequestMsg] = useState('');

  // Current user's SQUAD profile
  const userProfile = squadProfiles.find(p => p.id === currentUser?.id);

  // Check and initialize form defaults with standard user parameters
  useEffect(() => {
    if (currentUser && !userProfile) {
      setPPreferredCity(currentUser.city || 'Bangalore');
      setPUsername(currentUser.full_name.toLowerCase().replace(/\s+/g, '_'));
    }
    if (currentUser && userProfile) {
      setPostCity(userProfile.preferred_city || currentUser.city || 'Bangalore');
      setSqCity(userProfile.preferred_city || currentUser.city || 'Bangalore');
    }
  }, [currentUser, userProfile]);

  // Handle messages scrolling
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedSquadId, activeTab]);

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="bg-[#12121E] border border-border-dark p-8 rounded-2xl max-w-md mx-auto space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-brand-purple/10 text-brand-purple rounded-full flex items-center justify-center mx-auto">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold font-display">Authentication Required</h2>
          <p className="text-text-secondary text-sm">
            Enter the multiplayer gaming dimension! Log in to join gaming squads, coordinate matches on arena boards, and track live check-ins.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purple/90 btn-gradient font-bold shadow-lg shadow-brand-purple/20 transition cursor-pointer"
          >
            Log In / Sign Up
          </button>
        </div>
      </div>
    );
  }

  // FORCE PROFILE SETUP WIZARD (Rule 1: welcome profile validation)
  if (!userProfile) {
    const defaultGames = ['Valorant', 'CS2', 'FIFA 25', 'Dota 2', 'Tekken 8', 'League of Legends'];
    const defaultSports = ['Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis', 'Volleyball'];

    const handleSetupSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!pUsername || pUsername.length < 3) {
        toast.error('Squad username must be at least 3 characters!');
        return;
      }
      try {
        createSquadProfile({
          username: pUsername,
          gamer_tag: pGamerTag || null,
          bio: pBio || null,
          favorite_games: selectedGames,
          favorite_sports: selectedSports,
          preferred_city: pPreferredCity || 'Bangalore'
        });
        toast.success(`Welcome to GARF Squads! Your player profile has been created successfully.`);
      } catch (err: any) {
        toast.error(err.message || 'Error creating profile');
      }
    };

    const toggleGame = (game: string) => {
      setSelectedGames(prev => prev.includes(game) ? prev.filter(g => g !== game) : [...prev, game]);
    };

    const toggleSport = (sport: string) => {
      setSelectedSports(prev => prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]);
    };

    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-card-dark border border-border-dark rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl -z-10" />

          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-xs font-mono font-bold">
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
              <span>SQUAD INITIALIZATION</span>
            </div>
            <h1 className="text-3xl font-black font-display tracking-tight text-white sm:text-4xl">
              Spawn Your Social Avatar
            </h1>
            <p className="text-sm text-text-secondary max-w-lg mx-auto">
              Activate your high-fidelity GARF Squad profile to match up and play with venue lobbies in Bangalore, Mumbai, and Delhi.
            </p>
          </div>

          <form onSubmit={handleSetupSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5 font-bold">Unique Username *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. garf_warrior"
                  value={pUsername}
                  onChange={e => setPUsername(e.target.value)}
                  className="w-full bg-[#07070F] border border-border-dark p-3.5 rounded-xl text-sm focus:border-brand-purple focus:outline-none transition font-sans text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5 font-bold">In-Game Nickname / Gamer Tag</label>
                <input 
                  type="text" 
                  placeholder="e.g. ShadowFiend#3901"
                  value={pGamerTag}
                  onChange={e => setPGamerTag(e.target.value)}
                  className="w-full bg-[#07070F] border border-border-dark p-3.5 rounded-xl text-sm focus:border-brand-purple focus:outline-none transition font-sans text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5 font-bold">Preferred Core City</label>
                <select 
                  value={pPreferredCity}
                  onChange={e => setPPreferredCity(e.target.value)}
                  className="w-full bg-[#07070F] border border-border-dark p-3.5 rounded-xl text-sm focus:border-brand-purple focus:outline-none transition text-white"
                >
                  <option value="Bangalore">Bangalore Arena Matrix</option>
                  <option value="Mumbai">Mumbai Circuit</option>
                  <option value="Delhi">Delhi Sector Hub</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1.5 font-bold">Custom Bio / Motto</label>
                <input 
                  type="text" 
                  placeholder="e.g. Hardcore carry player searching for regular tournament squad"
                  value={pBio}
                  onChange={e => setPBio(e.target.value)}
                  className="w-full bg-[#07070F] border border-border-dark p-3.5 rounded-xl text-sm focus:border-brand-purple focus:outline-none transition font-sans text-white"
                />
              </div>
            </div>

            {/* Favorite Esports Category */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-2 font-bold">Select Favorite Games</label>
              <div className="flex flex-wrap gap-2">
                {defaultGames.map(game => {
                  const selected = selectedGames.includes(game);
                  return (
                    <button
                      key={game}
                      type="button"
                      onClick={() => toggleGame(game)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-sans transition ${
                        selected 
                          ? 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan shadow-sm shadow-brand-cyan/10' 
                          : 'border-border-dark bg-[#07070F] text-text-secondary hover:text-white'
                      }`}
                    >
                      {game}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Favorite Athletics Section */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-2 font-bold">Select Active Sports</label>
              <div className="flex flex-wrap gap-2">
                {defaultSports.map(sport => {
                  const selected = selectedSports.includes(sport);
                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => toggleSport(sport)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-sans transition ${
                        selected 
                          ? 'border-brand-purple bg-brand-purple/10 text-brand-purple shadow-sm shadow-brand-purple/10' 
                          : 'border-border-dark bg-[#07070F] text-text-secondary hover:text-white'
                      }`}
                    >
                      {sport}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 text-sm font-bold uppercase tracking-widest btn-gradient text-white rounded-xl shadow-lg shadow-brand-purple/10 transition hover:scale-101 cursor-pointer flex items-center justify-center gap-2"
            >
              <Activity className="h-4 w-4 animate-pulse text-brand-cyan" />
              <span>Spawn Avatar & Enter Squad Lobbies</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // MEMBER SQUADS MAPPER
  const mySquadIds = squadMembers
    .filter(m => m.user_id === currentUser.id && m.status === 'active')
    .map(m => m.squad_id);

  // active squad count
  const myJoinedSquads = squads.filter(s => mySquadIds.includes(s.id));

  // Other Public Squads user can join
  const availablePublicSquads = squads.filter(s => 
    s.city === userProfile.preferred_city && 
    !mySquadIds.includes(s.id) && 
    !s.is_private
  );

  const activeSquad = selectedSquadId ? squads.find(s => s.id === selectedSquadId) : null;
  const activeSquadMembers = activeSquad 
    ? squadMembers.filter(m => m.squad_id === activeSquad.id)
    : [];
  const activeSquadAdminIds = activeSquadMembers.filter(m => m.role === 'admin').map(m => m.user_id);
  const isUserSquadAdmin = activeSquadStateCheck();

  function activeSquadStateCheck() {
    if (!activeSquad) return false;
    const rec = squadMembers.find(m => m.squad_id === activeSquad.id && m.user_id === currentUser?.id);
    return rec?.role === 'admin';
  }

  // Filter list messages for Active Space
  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'squads' && selectedSquadId) {
      return msg.type === 'squad' && msg.squad_id === selectedSquadId;
    }
    if (activeTab === 'global') {
      return msg.type === 'global_city' && msg.city === userProfile.preferred_city;
    }
    return false;
  });

  // Action methods wrappers
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;

    try {
      if (replyToId) {
        replyToMessage(replyToId, msgInput);
        setReplyToId(null);
      } else {
        sendMessage({
          type: activeTab === 'squads' ? 'squad' : 'global_city',
          squad_id: activeTab === 'squads' ? selectedSquadId : null,
          receiver_id: null,
          city: activeTab === 'global' ? userProfile.preferred_city : null,
          content: msgInput,
          message_type: 'text'
        });
      }
      setMsgInput('');
    } catch (err: any) {
      toast.error(err.message || 'Error broadcasting message');
    }
  };

  const handleCreateSquadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sqName) return;
    try {
      const created = createSquad({
        name: sqName,
        description: sqDescription || null,
        type: sqType,
        city: sqCity,
        game_or_sport: sqGameSport || null,
        max_members: sqMaxMembers,
        is_private: sqIsPrivate,
        venue_id: sqVenueId || null,
        cover_image: sqCoverImage || null
      });
      toast.success(`Squad "${sqName}" launched successfully! 🚀`);
      setSelectedSquadId(created.id);
      setIsCreatingSquad(false);
      setSqName('');
      setSqDescription('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleJoinWithCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput) return;
    joinSquadWithCode(joinCodeInput)
      .then((sq) => {
        toast.success(`Joint request issued for SQUAD: ${sq.name}!`);
        setSelectedSquadId(sq.id);
        setJoinCodeInput('');
      })
      .catch((err: any) => {
        toast.error(err.message);
      });
  };

  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle || !selectedSquadId) return;
    try {
      createSquadEvent({
        squad_id: selectedSquadId,
        title: evtTitle,
        event_date: evtDate,
        event_time: evtTime,
        venue_id: evtVenueId || null,
        game_or_sport: evtGameSport,
        max_participants: evtMaxParts,
        notes: evtNotes || null
      });
      toast.success('Squad Event Scheduled! Comrades alerted 📅');
      setIsCreatingEvent(false);
      setEvtTitle('');
      setEvtDate('');
      setEvtTime('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreatePollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion) return;
    const cleanOpts = pollOptions.filter(o => o.trim() !== '');
    if (cleanOpts.length < 2) {
      toast.error('Poll needs at least 2 choice options!');
      return;
    }
    try {
      createPoll({
        question: pollQuestion,
        options: cleanOpts,
        expires_at: pollExpires || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        allow_multiple_choice: false,
        squad_id: activeTab === 'squads' ? selectedSquadId : null,
        city: activeTab === 'global' ? userProfile.preferred_city : null
      });
      toast.success('Poll published live in stream! 📊');
      setIsCreatingPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreatePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postGameSport) return;
    try {
      createPlayerNeededPost({
        city: postCity || userProfile.preferred_city,
        venue_id: postVenueId || null,
        title: postTitle,
        description: postDesc || null,
        game_or_sport: postGameSport,
        players_needed: postPlayersNeeded,
        booking_date: postDate || null,
        booking_time: postTime || null,
        venue_booked: !!postVenueId,
        expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
        share_in_global: postShareGlobal,
        share_in_squads: postShareSquads
      });
      toast.success('Recruitment post live on Board! ⚔️');
      setIsCreatingPost(false);
      setPostTitle('');
      setPostDesc('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteGamerTag || !selectedSquadId) return;
    const foundUser = profiles.find(p => {
      const pEmail = p.email || '';
      const emailMatch = pEmail && pEmail.split('@')[0].toLowerCase() === inviteGamerTag.toLowerCase();
      const nameMatch = p.full_name ? p.full_name.toLowerCase() === inviteGamerTag.toLowerCase() : false;
      return emailMatch || nameMatch;
    });
    if (!foundUser) {
      toast.error('No gamer matching that username/email found!');
      return;
    }
    try {
      sendSquadInvite(selectedSquadId, foundUser.id, inviteMessage || 'Join our squad and dominate the ranks!');
      toast.success(`Direct recruitment invitation transmitted to ${foundUser.full_name}!`);
      setIsInvitingGamer(false);
      setInviteGamerTag('');
      setInviteMessage('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleMatchRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchRequestPostId) return;
    requestToJoinPlayerNeeded(matchRequestPostId, matchRequestMsg || 'I would love to fill this slot!');
    toast.success('Your request was safely compiled. Match host notified!');
    setMatchRequestPostId(null);
    setMatchRequestMsg('');
  };

  // Check if current user is check-in near venue
  const activeNearbyCheckin = nearbyCheckins.find(c => c.user_id === currentUser.id && c.is_active);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* HEADER BILLBOARD */}
      <div className="bg-[#0B0B14] border border-[#17172A] p-6 rounded-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-brand-purple/5 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white flex items-center gap-2">
              <Users className="h-7 sm:h-8 w-7 sm:w-8 text-brand-purple animate-pulse" />
              <span>GARF SQUAD DIVISION</span>
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              High-throughput multiplayer social matching. Join squads, chat live, run polls, draft events, and claim rewards.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-[#11111E] border border-border-dark px-4 py-2.5 rounded-xl">
            <div className="text-right">
              <span className="block text-[10px] font-mono text-[#a8a8cf] uppercase">Active Avatar</span>
              <span className="text-xs font-bold text-white">@{userProfile.username}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center font-mono text-xs text-brand-purple font-bold">
              {userProfile.username.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* TABS SELECTOR RAILS */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-[#121223] pb-4">
        {[
          { id: 'squads', label: 'My Squad Hubs', icon: Users },
          { id: 'global', label: `${userProfile.preferred_city} City Chat`, icon: MessageSquare },
          { id: 'listings', label: 'Match Finder Lobbies', icon: Trophy },
          { id: 'nearby', label: 'At Arena Now Map', icon: Radio },
          { id: 'invites', label: 'Squad Recruits / Invites', icon: Bell }
        ].map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                if (t.id !== 'squads') setSelectedSquadId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase transition block cursor-pointer ${
                active 
                  ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20 border-b-2 border-brand-cyan'
                  : 'bg-[#08080E] text-text-secondary border border-border-dark hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* BOTTOM SECTION AREA WORKSPACES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ========================================== */}
        {/* VIEW 1: MY SQUADS HUB                      */}
        {/* ========================================== */}
        {activeTab === 'squads' && (
          <>
            {/* Squads Navigation Panel */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-[#08080F] border border-border-dark p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border-dark">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-text-secondary">Lobbies List</span>
                  <button 
                    onClick={() => setIsCreatingSquad(true)}
                    className="p-1 px-2.5 bg-brand-purple/20 text-brand-purple hover:bg-brand-purple hover:text-white rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Create SQUAD</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {myJoinedSquads.length === 0 ? (
                    <div className="text-center py-4 text-xs text-text-secondary">
                      You haven't joined any squads yet. Launch one or enter Code!
                    </div>
                  ) : (
                    myJoinedSquads.map(sq => {
                      const sel = selectedSquadId === sq.id;
                      return (
                        <button
                          key={sq.id}
                          onClick={() => {
                            setSelectedSquadId(sq.id);
                            setReplyToId(null);
                          }}
                          className={`w-full text-left p-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-between ${
                            sel 
                              ? 'bg-brand-purple/15 border-l-4 border-brand-purple text-white' 
                              : 'bg-black/30 border border-[#131320] text-[#a8a8cf] hover:bg-black/50 hover:text-white'
                          }`}
                        >
                          <div className="truncate">
                            <span className="block font-bold truncate">{sq.name}</span>
                            <span className="text-[10px] text-text-secondary block font-mono capitalize">{sq.type} league • {sq.city}</span>
                          </div>
                          {sq.is_private && <Shield className="h-3.5 w-3.5 text-brand-cyan shrink-0 ml-1" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Share Code Join Box */}
              <div className="bg-[#08080F] border border-border-dark p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-mono uppercase font-bold text-white">Join by Share Code</h4>
                <form onSubmit={handleJoinWithCodeSubmit} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter 6-char lobby Code"
                    value={joinCodeInput}
                    onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="flex-grow bg-black/40 border border-border-dark p-2 rounded text-xs focus:border-brand-purple text-white font-mono"
                  />
                  <button type="submit" className="p-2 px-3 bg-brand-cyan hover:bg-brand-cyan/80 text-black font-bold rounded text-xs transition cursor-pointer">
                    Join
                  </button>
                </form>
              </div>

              {/* Public Squads Recommendation */}
              <div className="bg-[#08080F] border border-border-dark p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-mono uppercase font-bold text-white mb-2 flex items-center gap-1.5 text-brand-purple">
                  <Flame className="h-3.5 w-3.5" />
                  <span>Public Arenas in {userProfile.preferred_city}</span>
                </h4>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {availablePublicSquads.map(sq => {
                    const memberCount = squadMembers.filter(sm => sm.squad_id === sq.id && sm.status === 'active').length;
                    return (
                      <div key={sq.id} className="p-2 border border-border-dark bg-[#0a0a0f] rounded-lg text-xs space-y-1.5">
                        <div className="flex justify-between items-center gap-1">
                          <span className="font-bold text-white truncate">{sq.name}</span>
                          <span className="text-[10px] font-mono text-text-secondary shrink-0">{memberCount}/{sq.max_members}</span>
                        </div>
                        <p className="text-[10px] text-text-secondary truncate">{sq.description || 'No description'}</p>
                        <button 
                          onClick={() => {
                            joinPublicSquad(sq.id);
                            toast.success(`You joined public squad ${sq.name}!`);
                            setSelectedSquadId(sq.id);
                          }}
                          className="w-full py-1 text-center bg-[#1c1c34] hover:bg-brand-purple text-[10px] font-bold text-white rounded transition cursor-pointer"
                        >
                          Instant Join
                        </button>
                      </div>
                    );
                  })}
                  {availablePublicSquads.length === 0 && (
                    <p className="text-[10px] text-text-secondary text-center">No other public squads found nearby.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Squad Active Room Workspace */}
            <div className="lg:col-span-3 space-y-6">
              {activeSquad ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* ROOM CHAT & STREAM LOG */}
                  <div className="md:col-span-2 bg-[#08080E] border border-border-dark rounded-2xl p-4 flex flex-col h-[600px]">
                    <div className="pb-3 border-b border-border-dark flex justify-between items-center">
                      <div>
                        <h2 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase font-mono">
                          <span>{activeSquad.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple rounded">
                            {activeSquad.squad_code}
                          </span>
                        </h2>
                        <span className="text-[10px] text-text-secondary font-mono">
                          Lobby: {activeSquad.type} • City: {activeSquad.city} • Capacity: {activeSquadMembers.filter(m => m.status === 'active').length}/{activeSquad.max_members}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isUserSquadAdmin && (
                          <button
                            onClick={() => setIsInvitingGamer(true)}
                            className="p-1 px-2.5 bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan hover:text-black rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <UserPlus className="h-3 w-3" />
                            <span>Invite Gamer</span>
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            leaveSquad(activeSquad.id);
                            setSelectedSquadId(null);
                            toast.success(`Checked out of Room workspace: ${activeSquad.name}`);
                          }}
                          className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded text-[10px] font-bold transition cursor-pointer"
                        >
                          Leave SQUAD
                        </button>
                      </div>
                    </div>

                    {/* Chat Logs Window */}
                    <div className="flex-grow overflow-y-auto py-4 space-y-3 pr-2 scrollbar-thin">
                      {filteredMessages.length === 0 ? (
                        <div className="text-center py-20 text-xs text-text-secondary space-y-2">
                          <MessageSquare className="h-8 w-8 text-[#1a1a33] mx-auto" />
                          <p>The channel stream is dead silent. Write a message and spawn some action!</p>
                        </div>
                      ) : (
                        filteredMessages.map(msg => {
                          const senderProf = squadProfiles.find(p => p.id === msg.sender_id);
                          const senderFull = profiles.find(p => p.id === msg.sender_id);
                          const senderName = senderProf ? `@${senderProf.username}` : (senderFull ? senderFull.full_name : 'Arena Guest');
                          const isMe = msg.sender_id === currentUser.id;
                          const replyOrigin = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

                          return (
                            <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                              
                              {/* Reply Context Header */}
                              {msg.reply_to_id && (
                                <div className="flex items-center gap-1 text-[10px] text-text-secondary mb-1">
                                  <CornerDownRight className="h-3 w-3" />
                                  <span>Replied:</span>
                                  <span className="italic truncate max-w-[150px]">"{replyOrigin?.content || '[Post info]'}"</span>
                                </div>
                              )}

                              <div className={`p-3 rounded-2xl text-xs space-y-1 relative ${
                                isMe 
                                  ? 'bg-[#1b1030] text-white rounded-br-none border border-[#3c2a63]' 
                                  : 'bg-[#12121E] text-[#a8a8cf] rounded-bl-none border border-border-dark'
                              }`}>
                                <div className="flex justify-between items-center gap-4 text-[10px] font-mono text-text-secondary">
                                  <span className="font-bold text-brand-cyan">{senderName}</span>
                                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                {/* Custom Content Types (text | poll | player_needed | squad_invite) */}
                                {msg.message_type === 'text' && (
                                  <p className="font-sans leading-relaxed text-slate-100">{msg.content}</p>
                                )}

                                {msg.message_type === 'poll' && (
                                  <div className="bg-[#05050A] border border-[#1d1d36] p-2 rounded-lg mt-1 space-y-1">
                                    <span className="block text-[10px] font-mono font-bold text-yellow-500 uppercase flex items-center gap-1">
                                      <Vote className="h-3 w-3" /> Poll Shared
                                    </span>
                                    <p className="font-bold text-white">{msg.content}</p>
                                    <button 
                                      onClick={() => setActiveTab('squads')} // Poll details reside in sidebar
                                      className="w-full text-center py-1 mt-1 bg-brand-purple/20 text-brand-purple rounded hover:bg-brand-purple text-[10px] font-bold text-white transition block"
                                    >
                                      Vote in Poll
                                    </button>
                                  </div>
                                )}

                                {msg.message_type === 'player_needed' && (
                                  <div className="bg-[#05050A] border border-[#1d1d36] p-2 rounded-lg mt-1 space-y-1">
                                    <span className="block text-[10px] font-mono font-bold text-[#ea4335] uppercase flex items-center gap-1">
                                      <Trophy className="h-3 w-3" /> Recruitment Post
                                    </span>
                                    <p className="font-bold text-white">{msg.content}</p>
                                    <button 
                                      onClick={() => setActiveTab('listings')}
                                      className="w-full text-center py-1 mt-1 bg-brand-cyan/20 text-brand-cyan rounded text-[10px] font-bold text-white transition block"
                                    >
                                      Join Recruitment Lobby
                                    </button>
                                  </div>
                                )}

                                {/* Action Toolbar for Messages */}
                                <div className="flex items-center gap-2 mt-2 pt-1 border-t border-white/5 text-[9px] font-mono text-text-secondary select-none opacity-0 hover:opacity-100 transition">
                                  <button onClick={() => setReplyToId(msg.id)} className="hover:text-white cursor-pointer">Reply</button>
                                  {isMe && (
                                    <button onClick={() => {
                                      deleteMessage(msg.id);
                                      toast.success('Message wiped from logs.');
                                    }} className="text-red-400 hover:text-red-300 flex items-center gap-0.5 cursor-pointer">
                                      <Trash2 className="h-2.5 w-2.5" /> Wipe
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Editor Input Box */}
                    <form onSubmit={handleSendMessage} className="pt-3 border-t border-border-dark space-y-2">
                      {replyToId && (
                        <div className="flex justify-between items-center bg-[#0d0d1a] px-3 py-1.5 rounded-lg border border-border-dark text-[10px] text-[#a8a8cf]">
                          <span className="flex items-center gap-1"><CornerDownRight className="h-3 w-3" /> Replying to specific stream message</span>
                          <button onClick={() => setReplyToId(null)} className="text-red-400"><XCircle className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Input battle orders, tactical schemes, chat logs..."
                          value={msgInput}
                          onChange={e => setMsgInput(e.target.value)}
                          className="flex-grow bg-[#07070F] border border-border-dark p-3 rounded-xl text-xs focus:border-brand-purple text-white outline-none font-sans"
                        />
                        <button type="submit" className="p-3 bg-brand-purple hover:bg-brand-purple/90 rounded-xl font-bold cursor-pointer transition">
                          <Send className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* ROOM ACCORDION / POLLS, EVENTS, MEMBERS SIDEBAR */}
                  <div className="space-y-4">

                    {/* Tab 1: Polls and Decisions */}
                    <div className="bg-[#08080E] border border-border-dark rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-border-dark pb-2">
                        <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5 text-brand-cyan">
                          <Vote className="h-4 w-4" /> Ongoing Polls
                        </span>
                        <button 
                          onClick={() => setIsCreatingPoll(true)}
                          className="text-[10px] font-bold text-brand-purple hover:underline cursor-pointer"
                        >
                          + New Poll
                        </button>
                      </div>

                      <div className="space-y-3 max-h-56 overflow-y-auto">
                        {polls.filter(p => p.squad_id === activeSquad.id).map(poll => {
                          const votes = pollVotes.filter(v => v.poll_id === poll.id);
                          const userVote = votes.find(v => v.user_id === currentUser.id);

                          return (
                            <div key={poll.id} className="p-2 border border-border-dark bg-black/40 rounded-lg text-xs space-y-2">
                              <span className="text-[10px] text-text-secondary font-mono">Poll Question:</span>
                              <h5 className="font-bold text-white text-xs">{poll.question}</h5>
                              
                              <div className="space-y-1">
                                {poll.options.map((opt, oIdx) => {
                                  const optVotes = votes.filter(v => v.selected_options.includes(oIdx)).length;
                                  const pct = votes.length > 0 ? Math.round((optVotes / votes.length) * 100) : 0;
                                  const voted = userVote?.selected_options.includes(oIdx);

                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        voteInPoll(poll.id, [oIdx]);
                                        toast.success('Your vote has been counted!');
                                      }}
                                      className={`w-full text-left p-1.5 rounded relative overflow-hidden transition block cursor-pointer text-[11px] ${
                                        voted ? 'border border-brand-cyan/25' : 'border border-transparent'
                                      }`}
                                    >
                                      {/* Percent background indicator */}
                                      <div className="absolute top-0 left-0 bottom-0 bg-brand-cyan/10 transition-all duration-500" style={{ width: `${pct}%` }} />
                                      <div className="relative flex justify-between items-center">
                                        <span className={`truncate ${voted ? 'text-brand-cyan font-bold' : 'text-slate-200'}`}>
                                          {voted ? '✓ ' : ''}{opt}
                                        </span>
                                        <span className="text-[10px] font-mono text-text-secondary">{pct}% ({optVotes})</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {polls.filter(p => p.squad_id === activeSquad.id).length === 0 && (
                          <p className="text-[10px] text-text-secondary text-center">No active decisions. Spawn a poll!</p>
                        )}
                      </div>
                    </div>

                    {/* Tab 2: Events RSVP List */}
                    <div className="bg-[#08080E] border border-border-dark rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-border-dark pb-2">
                        <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5 text-brand-purple">
                          <Calendar className="h-4 w-4" /> Events schedule
                        </span>
                        <button 
                          onClick={() => setIsCreatingEvent(true)}
                          className="text-[10px] font-bold text-brand-purple hover:underline cursor-pointer"
                        >
                          + Create Event
                        </button>
                      </div>

                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {squadEvents.filter(e => e.squad_id === activeSquad.id).map(evt => {
                          const rsvpMap = evt.participants || {};
                          const currentUserRSVP = rsvpMap[currentUser.id] || 'not_going';
                          const attendees = Object.keys(rsvpMap).filter(k => rsvpMap[k] === 'going').length;

                          return (
                            <div key={evt.id} className="p-2 border border-[#1b1b31] bg-[#05050A] rounded-lg text-xs space-y-1.5">
                              <div className="flex justify-between items-start gap-1">
                                <h5 className="font-bold text-white text-xs">{evt.title}</h5>
                                <span className="text-[10px] font-mono bg-brand-purple/10 text-brand-purple px-1.5 rounded">{attendees}/{evt.max_participants}</span>
                              </div>
                              <div className="text-[10px] text-text-secondary space-y-0.5 font-mono">
                                <p>🗓 Date: {evt.event_date} - {evt.event_time}</p>
                                <p>🎮 Game/Sport: {evt.game_or_sport}</p>
                                {evt.notes && <p className="italic text-slate-400">Notes: "{evt.notes}"</p>}
                              </div>

                              {/* RSVP Choice Buttons */}
                              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/5 text-[9px] font-bold text-center uppercase">
                                {['going', 'maybe', 'not_going'].map(opt => {
                                  const act = currentUserRSVP === opt;
                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        rsvpToSquadEvent(evt.id, opt as any);
                                        toast.success(`RSVP updated: '${opt.replace('_', ' ')}'`);
                                      }}
                                      className={`py-1 rounded text-[9px] transition cursor-pointer ${
                                        act 
                                          ? 'bg-brand-purple text-white shadow-sm' 
                                          : 'bg-black/40 text-text-secondary hover:text-white'
                                      }`}
                                    >
                                      {opt.replace('_', ' ')}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {squadEvents.filter(e => e.squad_id === activeSquad.id).length === 0 && (
                          <p className="text-[10px] text-text-secondary text-center font-mono">No active meetups booked.</p>
                        )}
                      </div>
                    </div>

                    {/* Tab 3: Member List/Approvals */}
                    <div className="bg-[#08080E] border border-border-dark rounded-xl p-4 space-y-3">
                      <span className="text-xs font-mono font-bold uppercase text-white pb-2 block border-b border-border-dark">
                        Room Members ({activeSquadMembers.filter(m => m.status === 'active').length})
                      </span>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        
                        {/* Active members */}
                        {activeSquadMembers.map(m => {
                          const prof = squadProfiles.find(p => p.id === m.user_id);
                          const activeUser = profiles.find(p => p.id === m.user_id);
                          const name = prof ? `@${prof.username}` : (activeUser ? activeUser.full_name : 'Comrade player');
                          const isAdmin = m.role === 'admin';

                          return (
                            <div key={m.id} className="flex justify-between items-center gap-1.5 text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <div className="w-5 h-5 rounded-full bg-brand-cyan/20 flex items-center justify-center font-mono text-[9px] text-brand-cyan font-bold">
                                  {name.substring(1, 3).toUpperCase()}
                                </div>
                                <span className={`truncate text-slate-200 ${isAdmin ? 'text-brand-cyan font-bold' : ''}`}>
                                  {name}
                                </span>
                              </div>
                              {isAdmin && (
                                <span className="text-[8px] bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-1 rounded uppercase tracking-wider font-mono">Admin</span>
                              )}
                            </div>
                          );
                        })}

                        {/* Pending join requests approvals pane (Admins only) */}
                        {isUserSquadAdmin && (
                          <div className="mt-4 pt-3 border-t border-[#121225] space-y-2">
                            <span className="text-[10px] font-mono text-yellow-500 font-bold block uppercase">Join Requests Pending ({squadMembers.filter(m => m.squad_id === activeSquad.id && m.status === 'requested').length})</span>
                            {squadMembers.filter(m => m.squad_id === activeSquad.id && m.status === 'requested').map(m => {
                              const activeUser = profiles.find(p => p.id === m.user_id);
                              return (
                                <div key={m.id} className="p-2 border border-yellow-500/15 bg-yellow-500/5 rounded text-xs space-y-1.5">
                                  <span className="font-bold text-white block truncate">{activeUser?.full_name}</span>
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => {
                                        acceptSquadJoinRequest(m.id);
                                        toast.success('Approved join lobby!');
                                      }}
                                      className="flex-grow py-1 bg-green-600 hover:bg-green-700 font-bold text-[9px] text-white rounded transition cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      onClick={() => {
                                        declineSquadJoinRequest(m.id);
                                        toast.error('Declined request.');
                                      }}
                                      className="py-1 px-2.5 bg-red-600/20 hover:bg-red-500 text-red-500 hover:text-white font-bold text-[9px] rounded transition cursor-pointer"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="bg-[#08080E] border border-border-dark rounded-2xl p-12 text-center h-[500px] flex flex-col justify-center items-center space-y-4">
                  <div className="p-4 bg-brand-purple/5 border border-brand-purple/20 text-brand-purple rounded-full">
                    <Users className="h-10 w-10 text-brand-purple animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold uppercase tracking-wider text-white">No Selected Active Room</h3>
                  <p className="text-xs text-text-secondary max-w-sm">
                    Select one of your existing Squad channels on the left toolbar, paste a share join-code, or spawn a brand new squad.
                  </p>
                  <button 
                    onClick={() => setIsCreatingSquad(true)}
                    className="py-2.5 px-6 bg-brand-purple hover:bg-brand-purple/90 btn-gradient rounded-xl text-xs font-bold font-mono tracking-wider uppercase text-white shadow-md transition"
                  >
                    Spawn My First Squad
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================== */}
        {/* VIEW 2: GLOBAL PUBLIC CITY CHATS          */}
        {/* ========================================== */}
        {activeTab === 'global' && (
          <div className="lg:col-span-4 bg-[#08080E] border border-border-dark rounded-2xl p-4 flex flex-col h-[650px] max-w-5xl mx-auto w-full relative">
            <div className="absolute top-0 right-0 w-60 h-full bg-brand-cyan/5 rounded-full blur-3xl -z-10" />
            
            <div className="pb-3 border-b border-border-dark flex justify-between items-center sm:flex-row flex-col gap-2">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase font-mono">
                  <MessageSquare className="h-4 w-4 text-brand-cyan shrink-0 animate-bounce" />
                  <span>MATRIX HUB: {userProfile.preferred_city} PUBLIC STREAM</span>
                </h2>
                <span className="text-[10px] text-text-secondary font-mono">
                  Coordinate meetups, lookup arena spots, and chat live with everyone in your district.
                </span>
              </div>
              <div className="flex items-center gap-1.5 self-end">
                <button 
                  onClick={() => setIsCreatingPoll(true)}
                  className="p-1 px-2.5 bg-brand-purple/20 text-brand-purple hover:bg-brand-purple hover:text-white rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="h-3 w-3" />
                  <span>Publish Poll here</span>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto py-4 space-y-3 pr-2 scrollbar-thin">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-24 text-xs text-text-secondary space-y-2">
                  <Users className="h-9 w-9 text-brand-purple/20 mx-auto" />
                  <p>Stream is quiet today in {userProfile.preferred_city}. Say hello to spawn matchmaking sessions!</p>
                </div>
              ) : (
                filteredMessages.map(msg => {
                  const senderProf = squadProfiles.find(p => p.id === msg.sender_id);
                  const senderFull = profiles.find(p => p.id === msg.sender_id);
                  const senderName = senderProf ? `@${senderProf.username}` : (senderFull ? senderFull.full_name : 'Guest Player');
                  const isMe = msg.sender_id === currentUser.id;
                  const replyOrigin = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      
                      {msg.reply_to_id && (
                        <div className="flex items-center gap-1 text-[10px] text-text-secondary mb-1">
                          <CornerDownRight className="h-3 w-3" />
                          <span>Replied:</span>
                          <span className="italic truncate max-w-[150px]">"{replyOrigin?.content || '[Post info]'}"</span>
                        </div>
                      )}

                      <div className={`p-3 rounded-2xl text-xs space-y-1 relative ${
                        isMe 
                          ? 'bg-[#1b1030] text-white rounded-br-none border border-[#3c2a63]' 
                          : 'bg-[#12121E] text-[#a8a8cf] rounded-bl-none border border-border-dark'
                      }`}>
                        <div className="flex justify-between items-center gap-4 text-[10px] font-mono text-text-secondary">
                          <span className="font-bold text-brand-cyan">{senderName}</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {msg.message_type === 'text' && (
                          <p className="font-sans leading-relaxed text-slate-100">{msg.content}</p>
                        )}

                        {msg.message_type === 'poll' && (
                          <div className="bg-[#05050A] border border-[#1b1b31] p-2 rounded-lg mt-1 space-y-1">
                            <span className="block text-[10px] font-mono font-bold text-yellow-500 uppercase">📊 Community Poll Survey</span>
                            <p className="font-bold text-white">{msg.content}</p>
                            {polls.find(p => p.id === msg.poll_id) && (
                              <div className="pt-2 space-y-1">
                                {polls.find(p => p.id === msg.poll_id)!.options.map((opt, oIdx) => {
                                  const matches = pollVotes.filter(v => v.poll_id === msg.poll_id && v.selected_options.includes(oIdx));
                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        voteInPoll(msg.poll_id!, [oIdx]);
                                        toast.success('Vote Cast!');
                                      }}
                                      className="w-full text-left bg-black/40 border border-border-dark p-1 rounded text-[10px] text-white hover:border-brand-cyan transition block cursor-pointer"
                                    >
                                      {opt} ({matches.length})
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {msg.message_type === 'player_needed' && (
                          <div className="bg-[#05050A] border border-[#1b1b31] p-2 rounded-lg mt-1 space-y-1">
                            <span className="block text-[10px] font-mono font-bold text-red-400 uppercase">⚔️ Draft Recruitment</span>
                            <p className="font-bold text-white">{msg.content}</p>
                            <button 
                              onClick={() => setActiveTab('listings')}
                              className="w-full text-center py-1 mt-1 bg-brand-cyan/20 text-brand-cyan rounded text-[10px] font-bold text-white transition block"
                            >
                              Join Match Lobby
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2 pt-1 border-t border-white/5 text-[9px] font-mono text-text-secondary select-none opacity-0 hover:opacity-100 transition">
                          <button onClick={() => setReplyToId(msg.id)} className="hover:text-white cursor-pointer">Reply</button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="pt-3 border-t border-border-dark space-y-2">
              {replyToId && (
                <div className="flex justify-between items-center bg-[#0d0d1a] px-3 py-1.5 rounded-lg border border-border-dark text-[10px] text-[#a8a8cf]">
                  <span className="flex items-center gap-1"><CornerDownRight className="h-3 w-3" /> Replying to specific Global shout</span>
                  <button onClick={() => setReplyToId(null)} className="text-red-400"><XCircle className="h-3.5 w-3.5" /></button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Send live shout out to Bangalore matrix circuit...`}
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  className="flex-grow bg-[#07070F] border border-border-dark p-3 rounded-xl text-xs focus:border-brand-purple text-white outline-none font-sans"
                />
                <button type="submit" className="p-3 bg-brand-cyan text-black hover:bg-brand-cyan/80 rounded-xl font-bold cursor-pointer transition">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 3: MATCH FINDER RECRUITMENT LOBBY     */}
        {/* ========================================== */}
        {activeTab === 'listings' && (
          <div className="lg:col-span-4 max-w-5xl mx-auto w-full space-y-6">
            
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[#121223] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 uppercase font-mono">
                  <Trophy className="h-5 w-5 text-brand-purple" />
                  <span>Looking for Players (LFP) Matchmaking Board</span>
                </h2>
                <span className="text-xs text-text-secondary">
                  Running short on players? Create match board rooms, receive responder alerts, and approve lobby entries.
                </span>
              </div>
              <button
                onClick={() => setIsCreatingPost(true)}
                className="py-2.5 px-5 bg-brand-purple hover:bg-brand-purple/90 btn-gradient rounded-xl text-xs font-bold font-mono tracking-wider uppercase text-white shadow-md transition cursor-pointer"
              >
                + Post Match Opening
              </button>
            </div>

            {/* List Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playerNeededPosts.filter(p => p.city === userProfile.preferred_city).map(post => {
                const author = profiles.find(pr => pr.id === post.posted_by);
                const venue = venues.find(v => v.id === post.venue_id);
                const responses = playerNeededResponses.filter(r => r.post_id === post.id);
                const userSentReq = responses.find(r => r.responder_id === currentUser.id);
                const isMyListing = post.posted_by === currentUser.id;

                return (
                  <div key={post.id} className="p-5 border border-border-dark bg-[#08080E] rounded-2xl relative overflow-hidden flex flex-col justify-between h-72">
                    {/* Background decor */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/5 rounded-full blur-2xl" />

                    <div className="space-y-2">
                      <div className="flex justify-between items-center gap-1.5">
                        <span className="text-[10px] font-mono bg-brand-purple/10 border border-brand-purple/20 text-brand-purple px-2 py-0.5 rounded capitalize">
                          {post.game_or_sport}
                        </span>
                        <span className={`text-[10px] font-mono font-bold uppercase ${
                          post.status === 'open' ? 'text-green-400' : 'text-text-secondary'
                        }`}>
                          ● {post.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white line-clamp-1">{post.title}</h3>
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{post.description || 'No custom notes provided'}</p>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary font-mono pt-2 border-t border-white/5">
                        <p>📍 Venue: {venue ? venue.name : 'Outdoor Pitch (Unbooked)'}</p>
                        <p>📅 Schedule: {post.booking_date} • {post.booking_time}</p>
                        <p>👤 Published: {author?.full_name}</p>
                        <div className="flex items-center gap-1.5">
                          <span>Slots filled:</span>
                          <span className="font-bold text-white text-xs">{post.players_joined} / {post.players_needed}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-white/5 flex gap-2">
                      {isMyListing ? (
                        <div className="w-full space-y-2">
                          <span className="block text-[10px] font-mono text-yellow-500 font-bold uppercase">Requests stream ({responses.length})</span>
                          <div className="space-y-1.5 max-h-24 overflow-y-auto">
                            {responses.map(r => {
                              const responder = profiles.find(p => p.id === r.responder_id);
                              return (
                                <div key={r.id} className="p-2 border border-border-dark bg-[#0d0d1a] rounded text-[11px] flex justify-between items-center gap-2">
                                  <div>
                                    <span className="font-bold text-white block">{responder?.full_name}</span>
                                    <span className="text-[10px] text-text-secondary capitalize">"{r.message || 'Wants to join'}"</span>
                                  </div>
                                  {r.status === 'pending' ? (
                                    <div className="flex gap-1">
                                      <button 
                                        onClick={() => {
                                          respondToPlayerNeededJoin(r.id, 'accepted');
                                          toast.success('Approved slot entry!');
                                        }}
                                        className="px-2 py-1 bg-green-600 hover:bg-green-700 font-bold rounded text-[9px] text-white cursor-pointer"
                                      >
                                        Draft
                                      </button>
                                      <button 
                                        onClick={() => {
                                          respondToPlayerNeededJoin(r.id, 'rejected');
                                          toast.error('Declined entry request.');
                                        }}
                                        className="px-1.5 py-1 bg-red-600/20 hover:bg-red-500 text-red-500 hover:text-white font-bold rounded text-[9px] cursor-pointer"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={`text-[9px] font-mono capitalize ${
                                      r.status === 'accepted' ? 'text-green-400 font-bold' : 'text-red-400'
                                    }`}>{r.status}</span>
                                  )}
                                </div>
                              );
                            })}
                            {responses.length === 0 && <span className="text-[10px] text-text-secondary block italic">No match join requests yet.</span>}
                          </div>
                        </div>
                      ) : (
                        post.status === 'open' && (
                          userSentReq ? (
                            <div className="w-full text-center p-2 bg-[#0c0c18] border border-border-dark font-mono text-[10px] rounded-xl text-brand-purple">
                              Lobby status: <span className="font-bold underline capitalize">{userSentReq.status}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setMatchRequestPostId(post.id)}
                              className="w-full py-2.5 text-center bg-brand-cyan hover:bg-brand-cyan/80 text-black font-semibold rounded-xl text-xs uppercase cursor-pointer transition block"
                            >
                              Request Match Slot
                            </button>
                          )
                        )
                      )}
                    </div>
                  </div>
                );
              })}
              {playerNeededPosts.filter(p => p.city === userProfile.preferred_city).length === 0 && (
                <div className="col-span-2 text-center p-16 bg-[#08080E] border border-border-dark rounded-2xl">
                  <Trophy className="h-10 w-10 text-[#19192f] mx-auto mb-2 animate-bounce" />
                  <p className="text-sm text-text-secondary">No tactical listings posted nearby in {userProfile.preferred_city} today.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 4: "AT VENUE NOW" MATCHMAKING MAP      */}
        {/* ========================================== */}
        {activeTab === 'nearby' && (
          <div className="lg:col-span-4 max-w-5xl mx-auto w-full space-y-6">
            <div className="border-b border-[#121223] pb-4 flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 uppercase font-mono">
                  <Radio className="h-5 w-5 text-brand-cyan animate-pulse animate-spin" />
                  <span>Real-time "At Venue Now" Matching Loop</span>
                </h2>
                <span className="text-xs text-text-secondary">
                  Rule 5: Instantly discover, chat, and form local lobbies right inside play arenas check-ins.
                </span>
              </div>
              
              {/* Checkin trigger status buttons */}
              {activeNearbyCheckin ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      updateNearbyCheckinMeetStatus(!activeNearbyCheckin.want_to_meet);
                      toast.success(`Social status switched to ${!activeNearbyCheckin.want_to_meet ? 'AVAILABLE' : 'SOLO'}`);
                    }}
                    className={`py-2 px-4 text-xs font-mono font-bold uppercase rounded-xl border transition Block cursor-pointer ${
                      activeNearbyCheckin.want_to_meet 
                        ? 'bg-green-600/10 border-green-500/20 text-green-400' 
                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                    }`}
                  >
                    Status: {activeNearbyCheckin.want_to_meet ? '🟢 Ready to Match' : '🟡 Playing Solo'}
                  </button>
                  <button 
                    onClick={() => {
                      checkoutNearbyCheckin();
                      toast.success('Gamer checked out of Arena Social map.');
                    }}
                    className="py-2 px-4 bg-red-600/20 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Check Out Venue
                  </button>
                </div>
              ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/15 p-2 rounded-xl text-[10px] text-yellow-500 max-w-sm flex items-center gap-1.5 font-mono">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>Your venue check-in is logged automatically when offfline hosts/owners execute checked-in QR bookings!</span>
                </div>
              )}
            </div>

            {/* List Active Gamers at Venues Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Venue checked-in users */}
              <div className="md:col-span-2 space-y-4">
                <span className="text-xs font-mono uppercase tracking-wider text-[#a8a8cf] font-bold block">Active Gamers Inside Arenas Now ({nearbyCheckins.filter(c => c.is_active).length})</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nearbyCheckins.filter(c => c.is_active).map(check => {
                    const guest = profiles.find(p => p.id === check.user_id);
                    const isMe = check.user_id === currentUser.id;
                    const v = venues.find(ven => ven.id === check.venue_id);
                    const pr = squadProfiles.find(s => s.id === check.user_id);

                    return (
                      <div key={check.id} className="p-4 border border-border-dark bg-[#08080E] rounded-xl relative overflow-hidden flex flex-col justify-between h-44">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="font-bold text-sm text-white flex items-center gap-1">
                              <span>{guest?.full_name}</span>
                              {isMe && <span className="text-[9px] bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-1 rounded uppercase">Me</span>}
                            </h4>
                            <span className={`text-[10px] font-bold font-mono uppercase px-1.5 py-0.5 rounded ${
                              check.want_to_meet 
                                ? 'bg-green-600/15 text-green-400 border border-green-500/20' 
                                : 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/20'
                            }`}>
                              {check.want_to_meet ? '🟢 Ready' : '🟡 Solo'}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-text-secondary font-mono">🏢 Arena: {v ? v.name : 'Play Station Lounge'}</p>
                          {pr && <p className="text-[10px] text-slate-300 italic truncate font-sans">"Motto: {pr.bio || 'Wants game challenges!'}"</p>}
                        </div>

                        {!isMe && (
                          <button 
                            onClick={() => {
                              sendMessage({
                                type: 'direct',
                                squad_id: null,
                                receiver_id: check.user_id,
                                city: null,
                                content: `Hey! Met you at ${v ? v.name : 'the arena'} with Meet Lobby. Let's draft a match!`,
                                message_type: 'text'
                              });
                              toast.success('Direct Message draft sent! Check threads list.');
                            }}
                            className="w-full py-1.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                          >
                            Send Direct Message Chat
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {nearbyCheckins.filter(c => c.is_active).length === 0 && (
                    <div className="col-span-2 text-center p-12 bg-black/45 border border-border-dark rounded-xl">
                      <Users className="h-8 w-8 text-[#14142f] mx-auto mb-1" />
                      <p className="text-xs text-text-secondary font-mono">No other playerschecked-in physically inside cities now.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Direct messages threads */}
              <div className="bg-[#08080E] border border-border-dark rounded-xl p-4 space-y-4">
                <span className="text-xs font-mono text-white font-bold block uppercase border-b border-border-dark pb-2">Arena Match Whisper Channels</span>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {/* Find direct messages threads list */}
                  {/* For user, thread lists */}
                  {messages.filter(m => m.type === 'direct' && (m.sender_id === currentUser.id || m.receiver_id === currentUser.id))
                    .reduce((acc: any[], cur) => {
                      const otherId = cur.sender_id === currentUser.id ? cur.receiver_id : cur.sender_id;
                      if (!acc.some(x => x.otherId === otherId)) {
                        acc.push({ otherId, lastMsg: cur.content, date: cur.created_at });
                      }
                      return acc;
                  }, []).map(t => {
                    const otherU = profiles.find(p => p.id === t.otherId);
                    return (
                      <div key={t.otherId} className="p-3 bg-black/40 border border-border-dark rounded-lg text-xs space-y-2">
                        <div className="flex justify-between items-center gap-1">
                          <span className="font-bold text-white">{otherU?.full_name}</span>
                          <span className="text-[9px] text-text-secondary font-mono">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[10px] text-text-secondary italic line-clamp-1">"{t.lastMsg}"</p>
                        <button 
                          onClick={() => {
                            const chatInput = prompt(`Whisper chat reply to ${otherU?.full_name}:`);
                            if (chatInput) {
                              sendMessage({
                                type: 'direct',
                                squad_id: null,
                                receiver_id: t.otherId,
                                city: null,
                                content: chatInput,
                                message_type: 'text'
                              });
                              toast.success('Whisper sent successfully!');
                            }
                          }}
                          className="w-full text-center py-1 mt-1 bg-brand-cyan/15 text-brand-cyan hover:bg-brand-cyan hover:text-black rounded text-[9px] uppercase font-bold transition block cursor-pointer"
                        >
                          Reply whisper
                        </button>
                      </div>
                    );
                  })}
                  {messages.filter(m => m.type === 'direct' && (m.sender_id === currentUser.id || m.receiver_id === currentUser.id)).length === 0 && (
                    <p className="text-[10px] text-text-secondary text-center">No active whispers. Start one with gamers checked-in near you!</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 5: SQUAD RECRUITMENT / INVITES LIST   */}
        {/* ========================================== */}
        {activeTab === 'invites' && (
          <div className="lg:col-span-4 max-w-5xl mx-auto w-full space-y-6">
            <div className="border-b border-[#121223] pb-4 flex justify-between items-start gap-1">
              <div>
                <h2 className="text-lg font-bold text-white uppercase font-mono flex items-center gap-2">
                  <Bell className="h-5 w-5 text-yellow-400" />
                  <span>My Squad recruitment lists & Inbound Invitations</span>
                </h2>
                <span className="text-xs text-text-secondary">
                  Review and accept invitations sent from team captains or track responses to active request drafts.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Recruitment invites received */}
              <div className="bg-[#08080E] border border-border-dark rounded-xl p-5 space-y-4">
                <span className="text-sm font-mono text-white tracking-wider font-bold block border-b border-border-dark pb-2">Inbound Recruitment Invitations</span>
                
                <div className="space-y-3">
                  {squadInvites.filter(i => i.invited_user_id === currentUser.id).map(inv => {
                    const host = profiles.find(p => p.id === inv.invited_by);
                    const targetSquad = squads.find(s => s.id === inv.squad_id);

                    return (
                      <div key={inv.id} className="p-3 border border-border-dark bg-[#0a0a14] rounded-xl text-xs space-y-3">
                        <div className="flex justify-between items-start gap-1.5">
                          <div>
                            <span className="text-[10px] text-brand-purple font-mono uppercase tracking-wider font-bold">RECRUITMENT TACTIC</span>
                            <h4 className="font-bold text-white text-sm">{targetSquad?.name}</h4>
                            <span className="text-[10px] text-text-secondary italic">Invited by: {host?.full_name}</span>
                          </div>
                          <span className={`text-[9px] font-mono capitalize ${
                            inv.status === 'pending' ? 'text-yellow-400' : 'text-slate-400'
                          }`}>{inv.status}</span>
                        </div>
                        {inv.message && <p className="text-[10px] text-text-secondary bg-black/40 p-2 rounded italic">"{inv.message}"</p>}

                        {inv.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                respondToSquadInvite(inv.id, 'accepted');
                                toast.success('You have successfully enlisted with the squad!');
                              }}
                              className="flex-grow py-2 bg-brand-purple hover:bg-brand-purple/90 font-bold text-white text-xs rounded transition cursor-pointer text-center block"
                            >
                              Enlist with squad
                            </button>
                            <button
                              onClick={() => {
                                respondToSquadInvite(inv.id, 'declined');
                                toast.error('Invite declined.');
                              }}
                              className="py-2 px-4 bg-red-600/20 text-red-400 hover:bg-red-500 rounded text-xs transition cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {squadInvites.filter(i => i.invited_user_id === currentUser.id).length === 0 && (
                    <p className="text-xs text-text-secondary text-center py-8">No invitation logs registered. Use Match Finder to find crews!</p>
                  )}
                </div>
              </div>

              {/* Box 2: Invites user has sent */}
              <div className="bg-[#08080E] border border-border-dark rounded-xl p-5 space-y-4">
                <span className="text-sm font-mono text-white tracking-wider font-bold block border-b border-border-dark pb-2">Outbound Sent Recruitment Invites</span>
                
                <div className="space-y-3">
                  {squadInvites.filter(i => i.invited_by === currentUser.id).map(inv => {
                    const guest = profiles.find(p => p.id === inv.invited_user_id);
                    const targetSquad = squads.find(s => s.id === inv.squad_id);

                    return (
                      <div key={inv.id} className="p-3 border border-border-dark bg-[#0a0a14] rounded-xl text-xs space-y-1">
                        <div className="flex justify-between items-center gap-1.5">
                          <span className="font-bold text-slate-100">{guest?.full_name}</span>
                          <span className={`text-[9px] font-mono capitalize ${
                            inv.status === 'accepted' ? 'text-green-400 font-bold' : 'text-yellow-500'
                          }`}>{inv.status}</span>
                        </div>
                        <p className="text-[10px] text-text-secondary font-mono">Invited to join: {targetSquad?.name}</p>
                      </div>
                    );
                  })}
                  {squadInvites.filter(i => i.invited_by === currentUser.id).length === 0 && (
                    <p className="text-xs text-[#a8a8cf] text-center py-8">You haven't issued any direct recuits lobby invitations.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* DIALOG CHANNELS / MODALS WRITING CONTROLS                */}
      {/* ======================================================== */}
      
      {/* MODAL 1: SQUAD CREATION DIALOG */}
      <AnimatePresence>
        {isCreatingSquad && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card-dark border border-border-dark rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center border-b border-border-dark pb-2">
                <h3 className="font-bold text-base text-white uppercase font-mono">Spawn New Squad League</h3>
                <button onClick={() => setIsCreatingSquad(false)} className="text-[#a8a8cf] hover:text-white"><XCircle className="h-6 w-6" /></button>
              </div>

              <form onSubmit={handleCreateSquadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Squad Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={sqName}
                    onChange={e => setSqName(e.target.value)}
                    placeholder="e.g. Bangalore FIFA Vipers"
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs font-sans focus:border-brand-purple text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">League Mode</label>
                  <select 
                    value={sqType}
                    onChange={e => setSqType(e.target.value as any)}
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  >
                    <option value="gaming">Gaming / PC Esports Lounge</option>
                    <option value="console">Console & VR Arcade Lounge</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#a8a8cf] mb-1">Game or Sport Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Counter Strike 2"
                      value={sqGameSport}
                      onChange={e => setSqGameSport(e.target.value)}
                      className="w-full bg-[#07070F] border border-[#1d1d36] p-3 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Max capacity</label>
                    <input 
                      type="number" 
                      min={2}
                      max={40}
                      value={sqMaxMembers}
                      onChange={e => setSqMaxMembers(parseInt(e.target.value) || 10)}
                      className="w-full bg-[#07070F] border border-[#1d1d36] p-3 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Description / Motto</label>
                  <textarea 
                    value={sqDescription}
                    onChange={e => setSqDescription(e.target.value)}
                    placeholder="Describe team practices or gaming times"
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Custom Cover Picture URL (Optional)</label>
                  <input 
                    type="url" 
                    value={sqCoverImage}
                    onChange={e => setSqCoverImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input 
                    type="checkbox" 
                    id="isprivate"
                    checked={sqIsPrivate}
                    onChange={e => setSqIsPrivate(e.target.checked)}
                    className="h-4 w-4 bg-black/40 border border-border-dark"
                  />
                  <label htmlFor="isprivate" className="text-xs text-slate-300 font-mono">Private / Recruitment Approval Required</label>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-purple hover:bg-brand-purple/90 btn-gradient rounded-xl font-bold uppercase tracking-widest text-[#fff] text-xs cursor-pointer shadow-md"
                >
                  Confirm Squad Launch
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EVENT CREATION */}
      <AnimatePresence>
        {isCreatingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card-dark border border-border-dark rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-border-dark pb-2">
                <h3 className="font-bold text-base text-white uppercase font-mono">Book Squad Event</h3>
                <button onClick={() => setIsCreatingEvent(false)} className="text-[#a8a8cf] hover:text-white"><XCircle className="h-6 w-6" /></button>
              </div>

              <form onSubmit={handleCreateEventSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Event Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={evtTitle}
                    onChange={e => setEvtTitle(e.target.value)}
                    placeholder="e.g. Sunday Valorant Scrims League"
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Date</label>
                    <input 
                      type="date" 
                      required
                      value={evtDate}
                      onChange={e => setEvtDate(e.target.value)}
                      className="w-full bg-[#07070F] border border-[#1b1b31] p-3 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Time</label>
                    <input 
                      type="time" 
                      required
                      value={evtTime}
                      onChange={e => setEvtTime(e.target.value)}
                      className="w-full bg-[#07070F] border border-[#1b1b31] p-3 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">discipline theme</label>
                    <input 
                      type="text" 
                      required
                      value={evtGameSport}
                      onChange={e => setEvtGameSport(e.target.value)}
                      placeholder="e.g. Football"
                      className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Max capacity</label>
                    <input 
                      type="number" 
                      value={evtMaxParts}
                      onChange={e => setEvtMaxParts(parseInt(e.target.value) || 10)}
                      className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Venue Linked (Optional)</label>
                  <select
                    value={evtVenueId}
                    onChange={e => setEvtVenueId(e.target.value)}
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  >
                    <option value="">No venue link / External custom field</option>
                    {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Optional Notes</label>
                  <input 
                    type="text" 
                    value={evtNotes}
                    onChange={e => setEvtNotes(e.target.value)}
                    placeholder="We will coordinate PC spots check in"
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-purple hover:bg-brand-purple/90 btn-gradient rounded-xl font-bold uppercase tracking-widest text-[#fff] text-xs cursor-pointer shadow-md"
                >
                  Create Squad Event
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: POLL PUBLISHING */}
      <AnimatePresence>
        {isCreatingPoll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card-dark border border-border-dark rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-border-dark pb-2">
                <h3 className="font-bold text-base text-white uppercase font-mono">Host Community Poll</h3>
                <button onClick={() => setIsCreatingPoll(false)} className="text-[#a8a8cf] hover:text-white"><XCircle className="h-6 w-6" /></button>
              </div>

              <form onSubmit={handleCreatePollSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Question Description *</label>
                  <input 
                    type="text" 
                    required 
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    placeholder="e.g. Which play arena fits scrim schedules?"
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Options</label>
                  {pollOptions.map((opt, oIdx) => (
                    <input 
                      key={oIdx}
                      type="text" 
                      required={oIdx < 2}
                      value={opt}
                      onChange={e => {
                        const copy = [...pollOptions];
                        copy[oIdx] = e.target.value;
                        setPollOptions(copy);
                      }}
                      placeholder={`Choice ${oIdx + 1}`}
                      className="w-full bg-[#07070F] border border-[#1b1b31] p-2.5 rounded text-xs text-white"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-[10px] font-bold text-brand-cyan hover:underline mt-1 cursor-pointer"
                  >
                    + Add More Choice Options
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Expires Date</label>
                  <input 
                    type="date"
                    value={pollExpires}
                    onChange={e => setPollExpires(e.target.value)}
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-cyan text-black hover:bg-brand-cyan/80 font-bold uppercase tracking-widest text-xs cursor-pointer rounded-xl"
                >
                  Launch Poll stream
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: DRAFT RECRUITMENT POST */}
      <AnimatePresence>
        {isCreatingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card-dark border border-border-dark rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center border-b border-border-dark pb-2">
                <h3 className="font-bold text-base text-white uppercase font-mono">Broadcast "Player Need" Post</h3>
                <button onClick={() => setIsCreatingPost(false)} className="text-[#a8a8cf] hover:text-white"><XCircle className="h-6 w-6" /></button>
              </div>

              <form onSubmit={handleCreatePostSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#a8a8cf] mb-1">Match LFP Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={postTitle}
                    onChange={e => setPostTitle(e.target.value)}
                    placeholder="e.g. Need dual-duo partner for Valorant competitive session"
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Detailed Description / Requirements</label>
                  <textarea 
                    value={postDesc}
                    onChange={e => setPostDesc(e.target.value)}
                    placeholder="Mention practice timings or gamer capability details"
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Discipline Category *</label>
                    <input 
                      type="text" 
                      required
                      value={postGameSport}
                      onChange={e => setPostGameSport(e.target.value)}
                      placeholder="e.g. FIFA / Valorant / Football"
                      className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Players slots recruitment draft *</label>
                    <input 
                      type="number" 
                      min={1}
                      max={22}
                      required
                      value={postPlayersNeeded}
                      onChange={e => setPostPlayersNeeded(parseInt(e.target.value) || 2)}
                      className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Date</label>
                    <input 
                      type="date"
                      value={postDate}
                      onChange={e => setPostDate(e.target.value)}
                      className="w-full bg-[#07070F] border border-[#1b1b31] p-3 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Time</label>
                    <input 
                      type="time"
                      value={postTime}
                      onChange={e => setPostTime(e.target.value)}
                      className="w-full bg-[#07070F] border border-[#1b1b31] p-3 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Link Play Arena Arena (Optional)</label>
                  <select
                    value={postVenueId}
                    onChange={e => setPostVenueId(e.target.value)}
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  >
                    <option value="">No linked venue (Outdoor session)</option>
                    {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2 py-1">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="shareglob"
                      checked={postShareGlobal}
                      onChange={e => setPostShareGlobal(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="shareglob" className="text-xs text-slate-300 font-mono">Automatically share post in {userProfile.preferred_city} City Chat</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="sharesquads"
                      checked={postShareSquads}
                      onChange={e => setPostShareSquads(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="sharesquads" className="text-xs text-slate-300 font-mono">Automatically share post in all my Joined Squad rooms</label>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-purple hover:bg-brand-purple/90 btn-gradient rounded-xl font-bold uppercase tracking-widest text-[#fff] text-xs cursor-pointer shadow-md"
                >
                  Broadcast Draft Openings
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: INVITE GAMER DIALOG */}
      <AnimatePresence>
        {isInvitingGamer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card-dark border border-border-dark rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-border-dark pb-2">
                <h3 className="font-bold text-base text-white uppercase font-mono">Send Recruit Squad Invitation</h3>
                <button onClick={() => setIsInvitingGamer(false)} className="text-[#a8a8cf] hover:text-white"><XCircle className="h-6 w-6" /></button>
              </div>

              <form onSubmit={handleSendInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Gamer Email split / Username / Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={inviteGamerTag}
                    onChange={e => setInviteGamerTag(e.target.value)}
                    placeholder="e.g. john or john_doe"
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                  <span className="text-[10px] text-text-secondary block mt-1">Target gamer's register accounts. e.g. 'owner', 'customer', 'admin'</span>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Captain's Message</label>
                  <input 
                    type="text" 
                    value={inviteMessage}
                    onChange={e => setInviteMessage(e.target.value)}
                    placeholder="We practice Sunday esports scrims. Join us!"
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-cyan text-black hover:bg-brand-cyan/85 font-mono font-bold uppercase tracking-widest text-xs cursor-pointer rounded-xl"
                >
                  Transmit Recruit Invite
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: SEND REQUEST MESSAGE ONRecruitment FINDER BOARD */}
      <AnimatePresence>
        {matchRequestPostId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card-dark border border-border-dark rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-border-dark pb-2">
                <h3 className="font-bold text-base text-white uppercase font-mono">Draft Match Join Request</h3>
                <button onClick={() => setMatchRequestPostId(null)} className="text-[#a8a8cf] hover:text-white"><XCircle className="h-6 w-6" /></button>
              </div>

              <form onSubmit={handleMatchRequestSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Message to Host</label>
                  <textarea 
                    value={matchRequestMsg}
                    onChange={e => setMatchRequestMsg(e.target.value)}
                    placeholder="Describe your role or position. e.g. I play hard carry or I am a central midfielder!"
                    required
                    className="w-full bg-[#07070F] border border-border-dark p-3 rounded-lg text-xs text-white"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-cyan text-black hover:bg-brand-cyan/85 font-mono font-bold uppercase tracking-widest text-xs cursor-pointer rounded-xl"
                >
                  Submit Request Entry
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
