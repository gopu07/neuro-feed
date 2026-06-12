import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { triggerConfetti } from '@/lib/confetti';
import { toast } from 'sonner';

interface StreakStoreCardProps {
  profile: any;
}

export function StreakStoreCard({ profile }: StreakStoreCardProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchaseShield = async () => {
    setIsPurchasing(true);
    try {
      await api.post('/api/user/purchase-shield');
      toast.success('Successfully purchased a Streak Shield!');
      triggerConfetti();
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to purchase Streak Shield');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-6"
    >
      <div className="flex items-center gap-4 text-left">
        <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30 text-2xl flex-shrink-0">
          🛡️
        </div>
        <div>
          <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
            Streak Freeze Store
            {profile.streak_shield && (
              <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md uppercase tracking-wider flex items-center gap-0.5">
                Active
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Equip a **Streak Shield** to protect your daily learning streak even if you miss a day! Costs 100 XP to purchase.
          </p>
        </div>
      </div>
      <button
        disabled={profile.streak_shield || isPurchasing || (profile.xp || 0) < 100}
        onClick={handlePurchaseShield}
        className={cn(
          "px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2 border shadow-lg shadow-orange-500/10",
          profile.streak_shield
            ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400 cursor-not-allowed"
            : (profile.xp || 0) < 100
            ? "bg-white/5 border-white/5 text-muted-foreground cursor-not-allowed opacity-50"
            : "bg-orange-500 hover:bg-orange-600 text-white border-orange-600 hover:scale-105 active:scale-95"
        )}
      >
        {isPurchasing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Purchasing...
          </>
        ) : profile.streak_shield ? (
          <>
            <Shield className="w-4 h-4 text-emerald-400" />
            Shield Equipped
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-amber-300" />
            Buy Shield (100 XP)
          </>
        )}
      </button>
    </motion.div>
  );
}
