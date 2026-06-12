import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCard, useCardSimplify, useCardDeepDive, useCardConfidence } from "@/hooks/useFeed";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles, Brain, Lightbulb, Zap, HelpCircle, Check, Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { sanitizeAndParse } from "@/lib/contentSanitizer";

export default function ContentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: card, isLoading, isError } = useCard(id as string);

  const simplifyMutation = useCardSimplify();
  const deepDiveMutation = useCardDeepDive();
  const confidenceMutation = useCardConfidence();

  const [simplifiedText, setSimplifiedText] = useState<string | null>(null);
  const [deepDiveBullets, setDeepDiveBullets] = useState<string[] | null>(null);
  const [hasRated, setHasRated] = useState<boolean>(false);
  const [earnedXp, setEarnedXp] = useState<number>(0);
  const [showXpBubble, setShowXpBubble] = useState<boolean>(false);

  const isSimplifying = simplifyMutation.isPending;
  const isDeepDiving = deepDiveMutation.isPending;

  // Global keydown listener for keyboard-driven spaced repetition ratings (keys 1-4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside input, textarea, or contenteditable fields
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.hasAttribute('contenteditable')) {
        return;
      }
      
      if (!hasRated && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
        e.preventDefault();
        const rating = parseInt(e.key, 10);
        handleRateConfidence(rating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasRated, id]);


  // Sanitized body
  const parsed = card ? sanitizeAndParse(card.title, card.body, card.tldr) : null;

  const handleSimplify = () => {
    if (!id) return;
    simplifyMutation.mutate(id, {
      onSuccess: (data) => {
        setSimplifiedText(data.simplified);
        toast.success("Content simplified by AI!");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || "Failed to simplify content");
      },
    });
  };

  const handleDeepDive = () => {
    if (!id) return;
    deepDiveMutation.mutate(id, {
      onSuccess: (data) => {
        setDeepDiveBullets(data.deepdive);
        toast.success("AI Technical deep dive loaded!");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || "Failed to fetch technical insights");
      },
    });
  };

  const handleRateConfidence = (rating: number) => {
    if (!id) return;
    confidenceMutation.mutate(
      { cardId: id, rating },
      {
        onSuccess: (data) => {
          const xp = data.xp_earned || (rating === 4 ? 25 : rating === 3 ? 15 : 10);
          setEarnedXp(xp);
          setShowXpBubble(true);
          setHasRated(true);
          toast.success(`Claimed +${xp} XP! Next review scheduled.`);
          queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.detail || "Failed to submit rating");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground font-poppins">Loading cognitive canvas...</p>
        </div>
      </div>
    );
  }

  if (isError || !card) {
    return (
      <div className="flex flex-col h-screen items-center justify-center space-y-4 px-4 text-center bg-background font-poppins">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <p className="text-red-500 font-bold">Failed to load content, or content is unavailable.</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="border-white/10 text-foreground hover:bg-white/5">
          Go Back
        </Button>
      </div>
    );
  }

  const springTransition = { type: 'spring' as const, stiffness: 300, damping: 25 };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 bg-background font-poppins relative min-h-screen">
      
      {/* Floating physical XP bubble on rating */}
      <AnimatePresence>
        {showXpBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.2, y: 100 }}
            animate={{ opacity: 1, scale: 1.2, y: -200 }}
            exit={{ opacity: 0, scale: 0.5, y: -300 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            onAnimationComplete={() => setShowXpBubble(false)}
            className="fixed left-1/2 bottom-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none"
          >
            <div className="px-6 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-extrabold text-2xl shadow-lg shadow-primary/30 flex items-center gap-2 border border-white/20">
              <Zap className="w-6 h-6 animate-bounce text-amber-300" />
              <span>+{earnedXp} XP</span>
            </div>
            <span className="text-[10px] text-cyan-300 uppercase tracking-widest font-bold mt-2 drop-shadow-md">STREAK MULTIPLIER APPLIED</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back navigation control */}
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-8 -ml-3 hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-all rounded-xl border border-transparent hover:border-white/5"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Feed
      </Button>

      <motion.article 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="space-y-8"
      >
        <div className="space-y-3">
          {/* Domain Category Badge */}
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
            {card.domain}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight pt-2">
            {card.title}
          </h1>
        </div>
        
        {/* Elegant summary callout */}
        {card.tldr && (
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-card to-card/50 border border-white/10 p-6 rounded-2xl shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
            <h3 className="font-extrabold text-primary mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 fill-current text-primary" /> Core Intuition (TL;DR)
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{card.tldr}</p>
          </motion.div>
        )}

        {/* Dynamic AI Assist Option Controls */}
        <div className="flex flex-wrap gap-3 py-3 border-y border-white/5">
          <Button
            onClick={handleSimplify}
            disabled={isSimplifying}
            variant="outline"
            className="flex items-center gap-2 border-secondary/30 hover:border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary-foreground transition-all font-bold rounded-xl cursor-pointer focus:outline-none"
          >
            {isSimplifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            ELI5 Simplify
          </Button>

          <Button
            onClick={handleDeepDive}
            disabled={isDeepDiving}
            variant="outline"
            className="flex items-center gap-2 border-primary/30 hover:border-primary text-primary hover:bg-primary/10 hover:text-primary-foreground transition-all font-bold rounded-xl cursor-pointer focus:outline-none"
          >
            {isDeepDiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Technical Deep Dive
          </Button>
        </div>

        {/* Dynamic AI Results Panel */}
        <AnimatePresence>
          {(simplifiedText || deepDiveBullets) && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 gap-4 overflow-hidden"
            >
              {simplifiedText && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-secondary/5 border border-secondary/10 p-5 rounded-2xl"
                >
                  <h3 className="font-bold text-secondary flex items-center gap-2 mb-2 text-sm uppercase tracking-wider">
                    <Lightbulb className="w-5 h-5 text-yellow-400" /> Simplified Explanation
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {simplifiedText}
                  </p>
                </motion.div>
              )}

              {deepDiveBullets && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-primary/5 border border-primary/10 p-5 rounded-2xl"
                >
                  <h3 className="font-bold text-primary flex items-center gap-2 mb-3 text-sm uppercase tracking-wider">
                    <Brain className="w-5 h-5" /> Architectural Insights
                  </h3>
                  <ul className="space-y-3">
                    {deepDiveBullets.map((bullet, index) => (
                      <li key={index} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                        <span className="text-primary font-bold">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Main Markdown Content */}
        <div className="space-y-4 text-foreground/90 leading-relaxed text-sm pt-4 select-text">
          {/* Format the body using cleaned-up paragraphs */}
          {parsed?.cleanBody.split('\n\n').map((para, idx) => {
            if (para.startsWith('💡') || para.startsWith('🎯') || para.startsWith('•')) {
              return (
                <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 my-2">
                  <p className="text-sm leading-relaxed text-muted-foreground">{para}</p>
                </div>
              );
            }
            return (
              <p key={idx} className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                {para}
              </p>
            );
          })}
        </div>

        {/* Spaced Repetition study schedule feedback system */}
        <div className="p-6 rounded-2xl bg-card border border-white/10 mt-12 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-secondary" />
          <h3 className="font-extrabold text-foreground mb-2 flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" /> Spaced Repetition Study Rating
          </h3>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            Rate your understanding of this topic to program the adaptive memory scheduler. Claim up to +25 XP based on difficulty!
          </p>

          {hasRated ? (
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center"
            >
              <p className="font-bold text-emerald-400 flex items-center justify-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" /> Understood level recorded! Spaced interval scheduled.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { rating: 1, label: "Again", desc: "No recall", sched: "+1d", color: "hover:border-rose-500 hover:bg-rose-500/5 text-rose-400 border-white/5 bg-white/[0.01]" },
                { rating: 2, label: "Hard", desc: "Vague recall", sched: "+2d", color: "hover:border-amber-500 hover:bg-amber-500/5 text-amber-400 border-white/5 bg-white/[0.01]" },
                { rating: 3, label: "Good", desc: "Solid recall", sched: "+6d", color: "hover:border-emerald-500 hover:bg-emerald-500/5 text-emerald-400 border-white/5 bg-white/[0.01]" },
                { rating: 4, label: "Easy", desc: "Flawless grab", sched: "+14d", color: "hover:border-cyan-500 hover:bg-cyan-500/5 text-cyan-400 border-white/5 bg-white/[0.01]" },
              ].map((item) => (
                <button
                  key={item.rating}
                  onClick={() => handleRateConfidence(item.rating)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer hover:-translate-y-1 active:scale-95 ${item.color} focus:outline-none`}
                >
                  <span className="font-bold text-sm">{item.label}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">{item.desc}</span>
                  <span className="mt-2.5 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-bold text-muted-foreground">
                    Next: {item.sched}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.article>
      <div className="h-16" />
    </div>
  );
}
