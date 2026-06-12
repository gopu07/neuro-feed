import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  MessageSquare, 
  Send, 
  Trophy, 
  UserPlus, 
  LogOut, 
  Sparkles, 
  Info,
  Shield,
  Loader2,
  Lock
} from 'lucide-react';
import { 
  useMyGuild, 
  useGuildLeaderboard, 
  useGuildExplore, 
  useCreateGuild, 
  useJoinGuild, 
  useLeaveGuild, 
  useSendGuildMessage 
} from '@/hooks/useGuilds';

export default function Guilds() {
  const { data: myGuildData, isLoading: isLoadingMyGuild } = useMyGuild();
  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useGuildLeaderboard();
  const { data: exploreGuilds, isLoading: isLoadingExplore } = useGuildExplore();

  const createGuildMutation = useCreateGuild();
  const joinGuildMutation = useJoinGuild();
  const leaveGuildMutation = useLeaveGuild();
  const sendMessageMutation = useSendGuildMessage();

  // Create Guild Form State
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDesc, setNewGuildDesc] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Chat input
  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [myGuildData?.guild?.chat]);

  const handleCreateGuild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuildName.trim()) return;
    createGuildMutation.mutate({
      name: newGuildName,
      description: newGuildDesc
    }, {
      onSuccess: () => {
        setNewGuildName('');
        setNewGuildDesc('');
        setIsCreateOpen(false);
      }
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText, {
      onSuccess: () => {
        setMessageText('');
      }
    });
  };

  const handleLeaveGuild = () => {
    if (window.confirm("Are you sure you want to leave your learning guild? If you are the owner, ownership will be transferred or the guild dissolved.")) {
      leaveGuildMutation.mutate();
    }
  };

  if (isLoadingMyGuild) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const inGuild = myGuildData?.in_guild;
  const myGuild = myGuildData?.guild;

  return (
    <div className="min-h-screen bg-background text-foreground font-poppins">
      
      {/* Page Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="px-6 py-6 max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Learning Guilds
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Assemble with top AI engineers to conquer concepts, multiply XP, and dominate rosters.
            </p>
          </div>
          {inGuild && (
            <button
              onClick={handleLeaveGuild}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Leave Guild
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-8 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {!inGuild ? (
            /* =========================================================================
               OUT OF GUILD VIEW: Explore and Join Roster
               ========================================================================= */
            <motion.div
              key="out-of-guild"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Guild Discovery */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Hero Onboarding Card */}
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent border border-primary/20 overflow-hidden shadow-xl shadow-primary/5">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Users className="w-32 h-32 text-primary" />
                  </div>
                  <h2 className="text-xl font-black text-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Connect, Sync, and Accelerate
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                    Learning is a collaborative sport. Join a Cohort of up to 20 peers to share daily chat questions, pool your learning XP, and climb the international Guild Leaderboard.
                  </p>
                  
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => setIsCreateOpen(!isCreateOpen)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Create a New Guild
                    </button>
                  </div>
                </div>

                {/* Create Guild Form (Collapsible) */}
                <AnimatePresence>
                  {isCreateOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <form 
                        onSubmit={handleCreateGuild}
                        className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xl"
                      >
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                          <Plus className="w-4.5 h-4.5 text-primary" />
                          Establish Cohort Guild
                        </h3>
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Guild Name</label>
                          <input
                            type="text"
                            required
                            maxLength={30}
                            placeholder="e.g. Neurips Pioneers"
                            value={newGuildName}
                            onChange={(e) => setNewGuildName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-smooth text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Description</label>
                          <textarea
                            maxLength={150}
                            placeholder="Describe your learning cohort's mission, target domains, and skill limits..."
                            value={newGuildDesc}
                            onChange={(e) => setNewGuildDesc(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-smooth text-sm h-24 resize-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={createGuildMutation.isPending}
                          className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {createGuildMutation.isPending ? (
                            <Loader2 className="w-4.5 h-4.5 animate-spin" />
                          ) : "Launch Guild"}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Public Guilds List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                    Available Cohorts
                  </h3>
                  
                  {isLoadingExplore ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : exploreGuilds?.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-card/20 border border-dashed border-border text-center text-muted-foreground">
                      No study cohorts have been launched yet. Be the first to create one!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {exploreGuilds?.map((guild: any) => (
                        <div 
                          key={guild.guild_id}
                          className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between hover:border-primary/40 transition-smooth"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h4 className="font-extrabold text-foreground text-base tracking-tight truncate max-w-[70%]">
                                {guild.name}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                                {guild.member_count}/20 Members
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] mb-4">
                              {guild.description || "No description provided. Join to coordinate learning maps!"}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center pt-3 border-t border-border/60">
                            <div>
                              <div className="text-xs font-bold text-primary">{guild.xp?.toLocaleString()}</div>
                              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Total XP</div>
                            </div>
                            <button
                              onClick={() => joinGuildMutation.mutate(guild.guild_id)}
                              disabled={guild.is_full || joinGuildMutation.isPending}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                guild.is_full 
                                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                  : 'bg-primary/10 border border-primary/20 text-primary hover:bg-primary/25'
                              }`}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Join
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Side Guild Leaderboard Panel */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-card border border-border shadow-md">
                  <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-6">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Top Guilds
                  </h3>
                  
                  {isLoadingLeaderboard ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : leaderboard?.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No ranked guilds yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {leaderboard?.map((g: any) => (
                        <div key={g.guild_id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-all">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 text-xs font-bold text-muted-foreground text-center">
                              {g.rank === 1 ? '🥇' : g.rank === 2 ? '🥈' : g.rank === 3 ? '🥉' : `#${g.rank}`}
                            </span>
                            <div className="truncate max-w-[120px]">
                              <div className="font-bold text-xs text-foreground truncate">{g.name}</div>
                              <div className="text-[9px] text-muted-foreground">{g.member_count} members</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-primary">{g.xp?.toLocaleString()}</div>
                            <div className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">XP</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            /* =========================================================================
               IN GUILD VIEW: Chat, Members, and Live Stats
               ========================================================================= */
            <motion.div
              key="in-guild"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              
              {/* Left & Middle Column: Guild Hub & Chat */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Guild Info Header Dashboard */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-primary font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        Active study cohort
                      </span>
                      <h2 className="text-2xl font-black text-foreground mt-2">{myGuild?.name}</h2>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                        {myGuild?.description || "Collaborating in AI engineering, spaced repetition decks, and peer-to-peer discussions."}
                      </p>
                    </div>
                    
                    {/* XP Block */}
                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-center min-w-[120px] self-stretch md:self-auto flex flex-col justify-center">
                      <div className="text-xl font-black text-primary">{myGuild?.xp?.toLocaleString()}</div>
                      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Cohort XP</div>
                    </div>
                  </div>
                               {/* Cohort Synergistic Goal Monitor (Replaces Chat) */}
                <div className="rounded-2xl border border-border bg-card shadow-xl p-6 space-y-6 text-left">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                      Cohort Sync Goals & Synergistic Velocity
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Collaborative learning cohorts pool collective XP to out-rank other engineering guilds on the global board. Work with your peers to conquer daily spacing decks and push cognitive limits.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">XP Target Boost</span>
                        <div className="text-2xl font-black text-primary">+{myGuild?.members ? myGuild.members.length * 50 : 0} XP</div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3">Daily referral and cohort bonuses active for all {myGuild?.members?.length || 0} active members.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Active Sync Velocity</span>
                        <div className="text-2xl font-black text-secondary">High Velocity</div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3">Roster completion metrics are recalculated dynamically on every spaced review completion.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-foreground mb-1">Collaboration Guidelines</h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        NeuroFeed cohorts are designed around shared learning pools. Engage in daily vertical swipe streams, complete spaced repetition decks under 9 PM notifications, and secure level-up badges to raise your cohort's dynamic ranking!
                      </p>
                    </div>
                  </div>
                </div>   </div>

              </div>

              {/* Right Column: Roster and Sidebar Leaderboard */}
              <div className="space-y-6">
                
                {/* Cohort Roster list */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-md">
                  <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-4">
                    <Users className="w-4.5 h-4.5 text-primary" />
                    Cohort Members ({myGuild?.members?.length}/20)
                  </h3>
                  
                  <div className="space-y-3.5">
                    {myGuild?.members?.map((member: any) => (
                      <div key={member.user_id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs text-primary uppercase">
                            {member.username.substring(0,2)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              {member.username}
                              {member.role === "owner" && (
                                  <span title="Guild Leader">
                                    <Shield className="w-3 h-3 text-yellow-400" />
                                  </span>
                              )}
                            </div>
                            <div className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">
                              {member.role === "owner" ? "Leader" : "Cohort Member"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-foreground">{member.xp?.toLocaleString()}</div>
                          <div className="text-[8px] text-muted-foreground uppercase tracking-widest">XP</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sidebar Guild Leaderboard Panel */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-md">
                  <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-4">
                    <Trophy className="w-4.5 h-4.5 text-yellow-500" />
                    Leaderboard
                  </h3>
                  
                  <div className="space-y-3.5">
                    {leaderboard?.slice(0, 5).map((g: any) => {
                      const isMe = g.guild_id === myGuild?.id;
                      return (
                        <div 
                          key={g.guild_id} 
                          className={`flex items-center justify-between gap-3 p-2 rounded-xl transition-all ${
                            isMe ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/[0.01]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-4 text-[10px] font-bold text-muted-foreground text-center">
                              {g.rank === 1 ? '🥇' : g.rank === 2 ? '🥈' : g.rank === 3 ? '🥉' : `#${g.rank}`}
                            </span>
                            <div className="truncate max-w-[100px]">
                              <div className="font-bold text-[11px] text-foreground truncate">{g.name}</div>
                              <div className="text-[8px] text-muted-foreground">{g.member_count} members</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-bold text-primary">{g.xp?.toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
}
