import { useState, useRef, useEffect } from 'react';
import { LearningCard } from '@/components/Card/LearningCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeed, useCardInteraction } from '@/hooks/useFeed';
import { Loader2, Sparkles, Brain, Flame, Trophy, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDailyChallenge, useCompleteDailyChallenge } from '@/hooks/useDailyChallenge';
import { triggerConfetti } from '@/lib/confetti';

export default function Index() {
  const [offset, setOffset] = useState(0);
  const [allCards, setAllCards] = useState<any[]>([]);
  const { data: newCards, isLoading, isError, isFetching } = useFeed(offset);
  const { mutate: interact } = useCardInteraction();
  
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const activeCard = allCards[activeIndex];

  const { data: challengeData, refetch: refetchChallenge } = useDailyChallenge();
  const completeChallenge = useCompleteDailyChallenge();

  const challengeCards = challengeData?.cards || [];
  const challengeCompleted = challengeData?.is_completed;
  const challengeCompletedCount = challengeCompleted 
    ? challengeCards.length 
    : challengeCards.filter((c: any) => c.status === 'completed' || c.status === 'seen').length;
  const challengeTotalCount = challengeCards.length;
  const challengePercent = challengeTotalCount > 0 
    ? Math.round((challengeCompletedCount / challengeTotalCount) * 100) 
    : 0;

  const handleClaimChallenge = () => {
    completeChallenge.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(`Claimed ${data.xp_earned} XP! Daily streak preserved!`);
        triggerConfetti();
        refetchChallenge();
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.detail || "Failed to claim reward.");
      }
    });
  };

  // Append new cards to the feed when data is fetched
  useEffect(() => {
    if (newCards && newCards.length > 0) {
      setAllCards(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const toAdd = newCards.filter(c => !existingIds.has(c.id));
        return [...prev, ...toAdd];
      });
    }
  }, [newCards]);

  // Pre-fetch more cards when approaching the end of the loaded queue
  useEffect(() => {
    if (activeIndex >= allCards.length - 2 && !isFetching && newCards?.length !== 0) {
      setOffset(prev => prev + 10);
    }
  }, [activeIndex, allCards.length, isFetching, newCards]);

  const handleSaveCard = (id: string) => {
    setSavedCards((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
        interact({ cardId: id, action: 'unsave', dwellSeconds: 0 });
      } else {
        updated.add(id);
        interact({ cardId: id, action: 'save', dwellSeconds: 0 });
        toast.success("Card saved to profile!");
      }
      setTimeout(() => refetchChallenge(), 800);
      return updated;
    });
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 100; // Swipe threshold distance in px
    if (info.offset.y < -swipeThreshold) {
      // Swiped UP -> Advance to next concept
      if (activeIndex < allCards.length - 1) {
        setActiveIndex(prev => prev + 1);
        interact({ cardId: allCards[activeIndex].id, action: 'view', dwellSeconds: 4 });
        setTimeout(() => refetchChallenge(), 800);
      } else {
        toast.info("You've digested all curation cards for now!");
      }
    } else if (info.offset.y > swipeThreshold) {
      // Swiped DOWN -> Return to prior concept
      if (activeIndex > 0) {
        setActiveIndex(prev => prev - 1);
      }
    }
  };

  // Keyboard navigation on Swipe Feed (Up/Down for swiping, Enter to save/bookmark)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (allCards.length === 0 || !activeCard) return;

      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Go to next concept (corresponds to swiping UP)
        if (activeIndex < allCards.length - 1) {
          setActiveIndex(prev => prev + 1);
          interact({ cardId: activeCard.id, action: 'view', dwellSeconds: 4 });
          setTimeout(() => refetchChallenge(), 800);
        } else {
          toast.info("You've digested all curation cards for now!");
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Go to previous concept (corresponds to swiping DOWN)
        if (activeIndex > 0) {
          setActiveIndex(prev => prev - 1);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveCard(activeCard.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allCards, activeIndex, activeCard, interact, refetchChallenge]);

  if (isError && allCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background font-poppins text-center p-6">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-4">
          <Brain className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-2">Synaptic Link Terminated</h3>
        <p className="text-muted-foreground text-sm max-w-xs mb-6">Failed to load the feed stream due to a local network interrupt.</p>
        <button 
          onClick={() => setOffset(0)}
          className="px-6 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl transition-all hover:scale-105"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-poppins relative overflow-hidden flex flex-col justify-between h-screen">
      
      {/* Decorative backdrop blobs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10" />

      {/* Glassmorphic Header */}
      <div className="border-b border-white/5 bg-background/80 backdrop-blur-md z-20">
        <div className="px-6 py-4 md:py-5 max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Cognitive Swipe Feed</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Adaptive Feed
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-4 bg-white/5 border border-white/5 p-2 px-3.5 rounded-xl">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4.5 h-4.5 text-amber-400" />
              <span className="text-xs font-bold text-foreground">Consolidation Core</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4.5 h-4.5 text-secondary" />
              <span className="text-xs font-bold text-foreground">Interactive</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Challenge Unified Widget */}
      {challengeData && challengeTotalCount > 0 && (
        <div className="max-w-xl mx-auto w-full px-6 mt-4 z-15">
          <div className="bg-card/40 border border-white/5 p-3 rounded-2xl flex items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔥</span>
              <div className="text-left">
                <div className="text-xs font-bold text-foreground">Daily Mission</div>
                <div className="text-[10px] text-muted-foreground">{challengeCompletedCount}/{challengeTotalCount} cards digested</div>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="flex-1 max-w-[140px] h-1.5 bg-white/5 rounded-full overflow-hidden hidden sm:block">
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" 
                style={{ width: `${challengePercent}%` }} 
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest hidden xs:inline-block">
                +100 XP
              </span>
              {challengeCompleted ? (
                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Claimed
                </div>
              ) : (
                <button
                  onClick={handleClaimChallenge}
                  disabled={completeChallenge.isPending || challengeCompletedCount === 0}
                  className={cn(
                    "px-3 py-1.5 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all focus:outline-none cursor-pointer",
                    challengeCompletedCount > 0
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/95 hover:scale-105 active:scale-95"
                      : "bg-white/5 border border-white/5 text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  {completeChallenge.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Claim"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Swipe Interactive Zone */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative w-full max-w-2xl mx-auto select-none overflow-hidden touch-none">
        
        {/* Virtualized Swiper Frame */}
        <AnimatePresence mode="wait">
          {isLoading && allCards.length === 0 ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col justify-center items-center py-24 space-y-4"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Synthesizing personalized particles...</span>
            </motion.div>
          ) : activeCard ? (
            <motion.div
              key={activeCard.id}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.4}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0, y: 150, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -150, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full flex items-center justify-center cursor-grab active:cursor-grabbing absolute px-4"
              style={{ touchAction: 'none' }}
            >
              <div className="w-full pointer-events-auto">
                <LearningCard
                  {...activeCard}
                  isSaved={savedCards.has(activeCard.id)}
                  onSave={handleSaveCard}
                  index={0}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-white/[0.01] border border-white/5 rounded-2xl p-6 shadow-inner"
            >
              <p className="text-sm font-bold text-foreground mb-1">
                Feed Comprehensively Digested
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                All assigned review particles completed. Return tomorrow for new cognitive challenges!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swipe UI Indicators */}
        {allCards.length > 0 && activeCard && (
          <div className="absolute right-4 bottom-28 md:right-[-60px] md:bottom-1/2 md:translate-y-1/2 flex flex-col items-center gap-6 z-10">
            {activeIndex > 0 && (
              <button 
                onClick={() => setActiveIndex(prev => prev - 1)}
                className="p-3 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 hover:border-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center cursor-pointer shadow-md"
                aria-label="Previous concept"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            )}
            <span className="text-[10px] text-muted-foreground font-black bg-white/5 px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/5 shadow-inner">
              {activeIndex + 1} / {allCards.length}
            </span>
            {activeIndex < allCards.length - 1 && (
              <button 
                onClick={() => {
                  setActiveIndex(prev => prev + 1);
                  interact({ cardId: activeCard.id, action: 'view', dwellSeconds: 4 });
                }}
                className="p-3 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 hover:border-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center cursor-pointer shadow-md"
                aria-label="Next concept"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Responsive spacing spacer for mobile bottom nav */}
      <div className="h-2 md:h-0" />
    </div>
  );
}
