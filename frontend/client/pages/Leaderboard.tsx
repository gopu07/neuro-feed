import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp } from 'lucide-react';
import { useGlobalLeaderboard, useWeeklyLeaderboard, useMyRank } from '@/hooks/useLeaderboard';
import { Loader2 } from 'lucide-react';

export default function Leaderboard() {
  const [period, setPeriod] = useState<'This Week' | 'All Time'>('This Week');
  
  const { data: weeklyData, isLoading: isLoadingWeekly } = useWeeklyLeaderboard(0);
  const { data: globalData, isLoading: isLoadingGlobal } = useGlobalLeaderboard(0);
  const { data: myRank } = useMyRank();

  const entries = period === 'This Week' ? weeklyData : globalData;
  const isLoading = period === 'This Week' ? isLoadingWeekly : isLoadingGlobal;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="px-6 py-8 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-400" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground">
            Compete with AI engineers worldwide
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Weekly Filter */}
        <div className="flex gap-3 mb-8">
          {['This Week', 'All Time'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-smooth ${
                period === p 
                  ? 'bg-primary/20 border-primary text-primary' 
                  : 'bg-card/50 border-border hover:border-primary text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Leaderboard List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : entries?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No entries found for this period.
            </div>
          ) : (
            entries?.map((entry: any, index: number) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-5 rounded-xl border transition-smooth ${
                  entry.rank <= 3
                    ? 'bg-card/80 border-primary/30'
                    : 'bg-card/30 border-border hover:bg-card/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 flex items-center justify-center">
                    {entry.rank <= 3 ? (
                      <span className="text-2xl">
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        #{entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{entry.username}</h3>
                    <p className="text-xs text-muted-foreground">
                      🔥 {entry.streak_days} day streak
                    </p>
                  </div>

                  {/* XP */}
                  <div className="text-right">
                    <div className="font-bold text-primary text-lg">
                      {entry.xp?.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">XP</p>
                  </div>

                  {/* Trend */}
                  <div className="flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Your Position */}
        {myRank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your Global Position</p>
                <h3 className="text-2xl font-bold text-foreground">#{myRank.rank}</h3>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-2">Total XP</p>
                <h3 className="text-2xl font-bold text-primary">{myRank.xp?.toLocaleString()}</h3>
              </div>
            </div>
          </motion.div>
        )}

        <div className="h-10" />
      </div>
    </div>
  );
}
