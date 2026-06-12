import { motion } from 'framer-motion';
import { Flame, Zap, Bookmark, Trophy, TrendingUp, Loader2, Settings, LogOut } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useUserProfile, useUserXpHistory } from '@/hooks/useUserProfile';
import { useMyRank } from '@/hooks/useLeaderboard';
import { useSettingsStore } from '@/store/useSettingsStore';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Import modularized sub-components
import { StreakStoreCard } from '@/components/Profile/StreakStoreCard';
import { ReferralsManager } from '@/components/Profile/ReferralsManager';
import { AdvancedGateways } from '@/components/Profile/AdvancedGateways';

const COLORS = ['#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#3B82F6'];

export default function Profile() {
  const { data: profile, isLoading, isError } = useUserProfile();
  const { data: xpHistory } = useUserXpHistory();
  const { data: myRank } = useMyRank();
  const setSettingsOpen = useSettingsStore((state) => state.setOpen);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Successfully logged out!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to logout');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-red-500">Failed to load profile. Are you logged in?</p>
      </div>
    );
  }

  const totalNext = profile.xp_for_next ? profile.xp_in_level + profile.xp_for_next : profile.xp + 1000;
  const xpProgress = profile.xp_for_next ? (profile.xp_in_level / totalNext) * 100 : 100;
  
  const domainsData = Object.entries(profile.domain_progress || {}).map(([name, data]: [string, any], index) => ({
    name,
    value: data.completed * 10, // approximate XP per card
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="px-6 py-8 max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground text-left">Profile</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-6xl mx-auto space-y-8">
        {/* User Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl">
                🧠
              </div>
              <div className="text-left">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-3xl font-bold text-foreground">
                    {profile.username || "Anonymous"}
                  </h2>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-1.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 text-muted-foreground hover:text-foreground border border-border transition-smooth focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex items-center justify-center"
                    title="Edit Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-smooth focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer flex items-center justify-center"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-muted-foreground mb-4">
                  {profile.email}
                </p>

                <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-lg">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary">
                      {profile.level_name} (Lvl {profile.level_index})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-secondary/20 rounded-lg">
                    <Flame className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-bold text-secondary">
                      {profile.streak_days} Day Streak
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary mb-1">
                #{myRank?.rank || '-'}
              </div>
              <p className="text-muted-foreground text-sm">Leaderboard Rank</p>
            </div>
          </div>

          {/* XP Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Level Progress
              </span>
              <span className="text-sm font-bold text-primary">
                {profile.xp_in_level} / {totalNext} XP
              </span>
            </div>
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-primary to-secondary"
              />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-xl bg-card/50 border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Total XP</h3>
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary mb-2">
              {profile.xp?.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">All-time experience</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="p-6 rounded-xl bg-card/50 border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Current Streak</h3>
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-orange-400 mb-2">
              {profile.streak_days}
            </div>
            <p className="text-sm text-muted-foreground">Days in a row</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-xl bg-card/50 border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Cards Read</h3>
              <Bookmark className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {profile.cards_completed}
            </div>
            <p className="text-sm text-muted-foreground">Topics explored</p>
          </motion.div>
        </div>

        {/* Modularized Streak Shield Store Card */}
        <StreakStoreCard profile={profile} />

        {/* Modularized Referrals Manager Card */}
        <ReferralsManager />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          {/* XP Progression */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="p-6 rounded-xl bg-card/50 border border-border"
          >
            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              XP Progression (Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={xpHistory || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis stroke="rgba(229,231,235,0.6)" />
                <YAxis stroke="rgba(229,231,235,0.6)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="xp"
                  stroke="#8B5CF6"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Learning Domains */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-xl bg-card/50 border border-border"
          >
            <h3 className="font-bold text-foreground mb-6">Strongest Domains</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={domainsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {domainsData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-3">
              {domainsData.map((domain: any) => (
                <div
                  key={domain.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: domain.color }}
                    />
                    <span className="text-muted-foreground">{domain.name}</span>
                  </div>
                  <span className="font-bold text-foreground">
                    {domain.value} XP
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Achievements & Badges Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-6 rounded-xl bg-card/50 border border-border text-left"
        >
          <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Earned Badges & Unlocks
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { id: 'streak_7', title: '7-Day Burn', desc: 'Maintain streak for 7 days', emoji: '🔥', active: (profile.streak_days || 0) >= 7 },
              { id: 'streak_30', title: '30-Day Pyro', desc: 'Maintain streak for 30 days', emoji: '🚀', active: (profile.streak_days || 0) >= 30 },
              { id: 'read_25', title: 'Master Reader', desc: 'Read 25 cognitive cards', emoji: '📚', active: (profile.cards_completed || 0) >= 25 },
              { id: 'xp_expert', title: 'Cognitive Giant', desc: 'Earn more than 1,500 XP', emoji: '💡', active: (profile.xp || 0) >= 1500 },
              { id: 'domain_3', title: 'Omnipresent', desc: 'Ingest concepts across 3 domains', emoji: '🧠', active: Object.keys(profile.domain_progress || {}).length >= 3 }
            ].map((badge) => (
              <div 
                key={badge.id} 
                className={cn(
                  "p-4 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden group",
                  badge.active
                    ? "bg-gradient-to-b from-primary/10 to-primary/5 border-primary/20 text-foreground"
                    : "bg-white/[0.01] border-white/5 text-muted-foreground/60 opacity-60"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2.5 transition-transform duration-300 group-hover:scale-110",
                  badge.active ? "bg-primary/20 border border-primary/30" : "bg-white/5 border border-white/5"
                )}>
                  {badge.emoji}
                </div>
                <h4 className="font-bold text-xs truncate max-w-full">{badge.title}</h4>
                <p className="text-[9px] text-muted-foreground mt-1 max-w-full leading-tight">{badge.desc}</p>
                {badge.active && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Modularized Advanced Features Panel */}
        <AdvancedGateways />

        <div className="h-10" />
      </div>
    </div>
  );
}
