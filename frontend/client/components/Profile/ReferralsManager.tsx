import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Loader2 } from 'lucide-react';
import { useMyReferrals, useClaimReferralCode } from '@/hooks/useReferrals';
import { toast } from 'sonner';

export function ReferralsManager() {
  const { data: referrals, refetch } = useMyReferrals();
  const claimReferralMutation = useClaimReferralCode();
  const [claimCodeInput, setClaimCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    if (referrals?.referral_code) {
      navigator.clipboard.writeText(referrals.referral_code);
      setCopiedCode(true);
      toast.success('Referral code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleClaimReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCodeInput.trim()) return;
    claimReferralMutation.mutate(claimCodeInput, {
      onSuccess: () => {
        setClaimCodeInput('');
        refetch();
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.23 }}
      className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent border border-primary/20 grid grid-cols-1 lg:grid-cols-2 gap-6 shadow-xl"
    >
      {/* Left Column: Share Referrals */}
      <div className="space-y-4 text-left">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 text-2xl flex-shrink-0">
            🎁
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
              Invite Friends, Earn XP
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Share your referral link! When a friend claims your code, you **both** immediately receive a **50 XP** learning bounty!
            </p>
          </div>
        </div>

        {/* Referral Code Field */}
        {referrals && (
          <div className="flex gap-2 max-w-md bg-background/50 border border-border p-1.5 rounded-xl">
            <input
              type="text"
              readOnly
              value={referrals.referral_code}
              className="flex-1 bg-transparent px-3 py-2 text-xs font-bold text-primary font-mono tracking-wider focus:outline-none"
            />
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        )}

        {/* Referrals Count and Total XP Earned */}
        {referrals && referrals.referrals_count > 0 && (
          <div className="text-xs text-muted-foreground font-medium pt-1">
            🎉 You have successfully referred <span className="text-primary font-bold">{referrals.referrals_count}</span> {referrals.referrals_count === 1 ? 'friend' : 'friends'} (<span className="text-primary font-bold">+{referrals.total_xp_earned} XP</span> earned!)
          </div>
        )}
      </div>

      {/* Right Column: Enter Referral Code */}
      <div className="flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-border/40 pt-6 lg:pt-0 lg:pl-6 space-y-4 text-left">
        <h4 className="font-bold text-sm text-foreground">Were you referred by a friend?</h4>
        
        {referrals?.already_claimed ? (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" />
            Referral bonus claimed (+50 XP credited to your account!)
          </div>
        ) : (
          <form onSubmit={handleClaimReferral} className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="Enter friend's referral code..."
              value={claimCodeInput}
              onChange={(e) => setClaimCodeInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-smooth text-xs"
            />
            <button
              type="submit"
              disabled={claimReferralMutation.isPending || !claimCodeInput.trim()}
              className="px-5 bg-primary text-white rounded-xl hover:bg-primary-hover font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {claimReferralMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : "Claim"}
            </button>
          </form>
        )}
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Note: Referral codes can only be claimed once per user, and self-referrals are securely neutralized on the database ledger.
        </p>
      </div>
    </motion.div>
  );
}
