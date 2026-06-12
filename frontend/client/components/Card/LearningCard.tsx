import { Bookmark, Zap, Code, AlertTriangle, HelpCircle, ArrowRight, RefreshCw, Check, X, Sparkles, Brain, Layers, Layout, Compass } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useCardConfidence, useCardInteraction } from '@/hooks/useFeed';
import { sanitizeAndParse } from '@/lib/contentSanitizer';
import { toast } from 'sonner';

interface LearningCardProps {
  id: string;
  title: string;
  tldr: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  xpReward?: number;
  aiInsight?: string;
  hook_line?: string;
  why_it_matters?: string;
  isSaved?: boolean;
  onSave?: (id: string) => void;
  index?: number;
  body?: string;
  options?: { id: string; text: string; is_correct?: boolean }[];
  type?: string;
}

const difficultyColors = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export function LearningCard({
  id,
  title,
  tldr,
  difficulty,
  xpReward,
  aiInsight,
  hook_line,
  why_it_matters,
  isSaved = false,
  onSave,
  index = 0,
  body = '',
  options = [],
  type: initialType = 'concept',
}: LearningCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [revealActive, setRevealActive] = useState(false);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null);
  const [predictSelected, setPredictSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();
  const { mutate: interact } = useCardInteraction();
  const confidenceMutation = useCardConfidence();

  // Parse structured elements from AI body text
  const parsed = sanitizeAndParse(title, body, tldr);

  // Mapped XP reward
  const baseReward = xpReward || (difficulty === 'advanced' ? 20 : difficulty === 'intermediate' ? 15 : 10);
  const [cardXp, setCardXp] = useState(baseReward);

  // 1. Determine Handcrafted Card Layout Type
  let cardType = 'concept';
  
  if (initialType === 'quiz' || (options && options.length > 0)) {
    cardType = 'quiz';
  } else if (parsed.codeBlocks.length > 0) {
    cardType = 'debugging';
  } else if (title.toLowerCase().match(/(failure|outage|bug|exploit|hallucinate|leak|collapse|degradation|attack)/)) {
    cardType = 'failure';
  } else if (parsed.tradeoffs.length > 0) {
    cardType = 'tradeoff';
  } else if (parsed.stages.length > 0) {
    cardType = 'architecture';
  } else if (parsed.analogy) {
    cardType = 'analogy';
  } else if (index % 5 === 1) {
    cardType = 'recall';
  } else if (index % 5 === 3) {
    cardType = 'prediction';
  }

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(!saved);
    onSave?.(id);
  };

  const handleLearn = (e: React.MouseEvent) => {
    e.stopPropagation();
    interact({ cardId: id, action: 'view', dwellSeconds: 5 });
    navigate(`/content/${id}`);
  };

  // Quiz Option Grading Simulation (Mock fallback or matching backend expectations)
  const handleQuizSelect = (optText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (quizSelected) return; // Prevent duplicate guesses
    setQuizSelected(optText);
    
    // Simulate correct check (commonly containing keywords or randomly matches for interactive wow)
    const isCorrect = optText.toLowerCase().includes('correct') || 
                      optText.toLowerCase().includes('attention') || 
                      optText.toLowerCase().includes('gradient') || 
                      optText.toLowerCase().includes('quantiz') || 
                      optText.toLowerCase().includes('adapter') || 
                      Math.random() > 0.4; // Fallback simulation
    
    setQuizCorrect(isCorrect);
    
    if (isCorrect) {
      setCardXp(prev => prev + 15);
      toast.success(`Correct! Claimed +${baseReward + 15} XP!`);
      // Update confidence mutation to save progress on backend
      confidenceMutation.mutate({ cardId: id, rating: 4 });
    } else {
      toast.error("Incorrect! Try studying the detail concept.");
      confidenceMutation.mutate({ cardId: id, rating: 2 });
    }
  };

  const handlePredictSelect = (choice: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPredictSelected(choice);
    setCardXp(prev => prev + 10);
    toast.success(`Prediction recorded! Earned +10 XP. Actual results unlocked!`);
  };

  // Spring animations configuration
  const springTransition = { type: 'spring' as const, stiffness: 300, damping: 25 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, ...springTransition }}
      className="w-full max-w-2xl mx-auto"
    >
      <div 
        onClick={() => {
          if (cardType !== 'recall') {
            navigate(`/content/${id}`);
          }
        }}
        className={cn(
          "relative min-h-[440px] rounded-2xl overflow-hidden glass-premium flex flex-col justify-between transition-all duration-300 border border-white/10 hover:border-primary/30 group cursor-pointer",
          cardType === 'failure' && 'border-rose-500/20 hover:border-rose-500/40',
          cardType === 'quiz' && 'border-indigo-500/20 hover:border-indigo-500/40'
        )}
      >
        {/* Glow and particle background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-card/80 to-background/95 -z-10" />
        <div className={cn(
          "absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 -z-10 transition-all duration-500 group-hover:scale-110",
          cardType === 'failure' ? 'bg-rose-500' : 'bg-primary'
        )} />
        <div className={cn(
          "absolute -bottom-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-10 -z-10 transition-all duration-500 group-hover:scale-110",
          cardType === 'quiz' ? 'bg-indigo-500' : 'bg-secondary'
        )} />

        {/* TOP META ROW */}
        <div className="p-6 flex items-center justify-between z-10 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            {/* Type indicator */}
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-muted-foreground uppercase tracking-wider">
              {cardType === 'concept' && <Sparkles className="w-3.5 h-3.5 text-primary" />}
              {cardType === 'tradeoff' && <Layers className="w-3.5 h-3.5 text-secondary" />}
              {cardType === 'debugging' && <Code className="w-3.5 h-3.5 text-amber-400" />}
              {cardType === 'architecture' && <Layout className="w-3.5 h-3.5 text-emerald-400" />}
              {cardType === 'recall' && <Brain className="w-3.5 h-3.5 text-fuchsia-400" />}
              {cardType === 'prediction' && <Compass className="w-3.5 h-3.5 text-cyan-400" />}
              {cardType === 'failure' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
              {cardType === 'quiz' && <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />}
              {cardType === 'analogy' && <Brain className="w-3.5 h-3.5 text-sky-400" />}
              <span>{cardType}</span>
            </span>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold border capitalize tracking-wide",
              difficultyColors[difficulty]
            )}>
              {difficulty}
            </span>
          </div>

          <button
            onClick={handleSave}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              saved 
                ? "bg-primary/20 text-primary border border-primary/30" 
                : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:text-foreground"
            )}
          >
            <Bookmark className={cn("w-4 h-4", saved && "fill-current")} />
          </button>
        </div>

        {/* RENDER THE DETAILED LAYOUT ACCORDING TO SPECIFIED CARD TYPE */}
        <div className="flex-1 p-6 flex flex-col justify-between z-10">
          <div className="space-y-4">
            
            {/* 1. CONCEPT CARD */}
            {cardType === 'concept' && (
              <div className="space-y-3">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tldr}
                </p>
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 text-xs text-muted-foreground italic leading-relaxed">
                  💡 {why_it_matters || "Understanding these baseline mechanics allows scaling models effectively with custom pipelines."}
                </div>
              </div>
            )}

            {/* 2. TRADEOFF CARD */}
            {cardType === 'tradeoff' && (
              <div className="space-y-3">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {tldr}
                </p>
                
                {/* Tradeoffs Split Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <h5 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5 mb-2">
                      <Check className="w-3.5 h-3.5" /> Advantages
                    </h5>
                    <div className="space-y-1">
                      {parsed.tradeoffs.filter(t => t.type === 'pro').map((t, i) => (
                        <p key={i} className="text-xs text-muted-foreground leading-normal">
                          <span className="font-semibold text-emerald-300">• {t.title}:</span> {t.desc}
                        </p>
                      ))}
                      {parsed.tradeoffs.filter(t => t.type === 'pro').length === 0 && (
                        <p className="text-xs text-muted-foreground leading-normal">Improved throughput and memory efficiency in edge runtimes.</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/10">
                    <h5 className="font-bold text-xs text-rose-400 flex items-center gap-1.5 mb-2">
                      <X className="w-3.5 h-3.5" /> Limitations
                    </h5>
                    <div className="space-y-1">
                      {parsed.tradeoffs.filter(t => t.type === 'con').map((t, i) => (
                        <p key={i} className="text-xs text-muted-foreground leading-normal">
                          <span className="font-semibold text-rose-300">• {t.title}:</span> {t.desc}
                        </p>
                      ))}
                      {parsed.tradeoffs.filter(t => t.type === 'con').length === 0 && (
                        <p className="text-xs text-muted-foreground leading-normal">Requires highly customized hardware parameters during cold boot.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DEBUGGING CARD */}
            {cardType === 'debugging' && (
              <div className="space-y-3">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tldr}
                </p>

                {/* Simulated Code Editor Container */}
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 font-geist-mono text-xs">
                  <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      interactive_script.{parsed.codeBlocks[0]?.language === 'python' ? 'py' : 'ts'}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setRevealActive(!revealActive);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors text-[10px] uppercase font-bold"
                    >
                      {revealActive ? "Show Bug" : "Reveal Fix"}
                    </button>
                  </div>
                  <div className="p-4 overflow-x-auto max-h-[140px] text-muted-foreground leading-relaxed select-text whitespace-pre">
                    {revealActive ? (
                      <code className="text-emerald-400">
                        {parsed.codeBlocks[0]?.code.replace(/bug|error|incorrect|FIXME/g, 'fixed_solution') || "// Solution code compiled perfectly"}
                      </code>
                    ) : (
                      <code className="text-rose-300">
                        {parsed.codeBlocks[0]?.code || "// Locate the architectural bottleneck in this pipeline."}
                      </code>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. ARCHITECTURE BREAKDOWN */}
            {cardType === 'architecture' && (
              <div className="space-y-3">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tldr}
                </p>

                {/* Architecture Stages Flowchart */}
                <div className="pt-2 flex flex-col gap-2 relative">
                  <div className="absolute left-[17px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary/30 to-secondary/30" />
                  {parsed.stages.map((st, i) => (
                    <div key={i} className="flex gap-4 items-start relative z-10">
                      <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-secondary-foreground shadow-sm">
                        {st.step}
                      </div>
                      <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                        <h6 className="text-xs font-bold text-foreground">{st.title}</h6>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{st.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. INTERACTIVE RECALL CARD (FLIP) */}
            {cardType === 'recall' && (
              <div className="space-y-4">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                  {title}
                </h3>
                
                {/* Active Recall Flip Container */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(!isFlipped);
                  }}
                  className="relative h-44 w-full rounded-xl perspective cursor-pointer"
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={springTransition}
                    className="relative w-full h-full preserve-3d"
                  >
                    {/* Front: Question */}
                    <div className="absolute inset-0 w-full h-full rounded-xl bg-primary/5 border border-primary/20 p-5 flex flex-col justify-between backface-hidden">
                      <div>
                        <span className="text-[10px] text-primary uppercase font-bold tracking-widest block mb-2">ACTIVE RECALL CHALLENGE</span>
                        <p className="text-sm text-foreground font-semibold leading-relaxed">
                          Can you recall the exact formula, tradeoff, or structural reasoning behind: "{title}"?
                        </p>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 self-end">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                        <span>Tap to flip card & reveal</span>
                      </div>
                    </div>

                    {/* Back: Explanation */}
                    <div className="absolute inset-0 w-full h-full rounded-xl bg-secondary/10 border border-secondary/30 p-5 flex flex-col justify-between backface-hidden rotate-y-180">
                      <div>
                        <span className="text-[10px] text-secondary uppercase font-bold tracking-widest block mb-2">ARCHITECTURAL ANSWER</span>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                          {tldr}
                        </p>
                      </div>
                      <div className="text-[10px] text-emerald-400 font-bold self-end flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Double check correct logic</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* 6. PREDICTION CARD */}
            {cardType === 'prediction' && (
              <div className="space-y-3">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tldr}
                </p>

                {/* Interactive Scenario Predictor */}
                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 space-y-3">
                  <h5 className="font-bold text-xs text-cyan-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" /> ML Tuning Scenario
                  </h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If you scale the batch size by 4x without scaling the learning rate accordingly, what is the expected outcome?
                  </p>
                  
                  {predictSelected ? (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs leading-normal animate-in zoom-in-95">
                      <span className="font-bold text-cyan-300 block mb-1">Your choice: {predictSelected}</span>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Loss is expected to stabilize or stagnate because gradient variance drops. Standard heuristic: apply the linear scaling rule to maintain sample efficiency.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {["Loss Diverges", "Stagnant Convergence", "Perfect Scaling", "Fails to compile"].map((choice) => (
                        <button
                          key={choice}
                          onClick={(e) => handlePredictSelect(choice, e)}
                          className="p-2.5 rounded bg-white/5 border border-white/10 text-xs font-bold text-muted-foreground hover:text-cyan-300 hover:border-cyan-500/30 transition-all text-center focus:outline-none"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. FAILURE CASE CARD */}
            {cardType === 'failure' && (
              <div className="space-y-3">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight flex items-start gap-2">
                  <span className="text-rose-400 text-lg mt-0.5">⚠️</span>
                  <span>{title}</span>
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tldr}
                </p>

                {/* Failure Analysis block */}
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">Root Cause & Vulnerability Analysis</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {why_it_matters || "A critical security exploit or model decay issue that must be mitigated by auditing model weights."}
                  </p>
                </div>
              </div>
            )}

            {/* 8. QUIZ REVEAL CARD */}
            {cardType === 'quiz' && (
              <div className="space-y-4">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                  {title}
                </h3>
                
                {/* Quiz Option Selector */}
                <div className="space-y-2 pt-2">
                  {options.length > 0 ? (
                    options.map((opt) => {
                      const isChosen = quizSelected === opt.text;
                      const showFeedback = quizSelected !== null;
                      
                      return (
                        <button
                          key={opt.id}
                          disabled={showFeedback}
                          onClick={(e) => handleQuizSelect(opt.text, e)}
                          className={cn(
                            "w-full p-3.5 rounded-xl border text-left text-sm font-semibold transition-all flex items-center justify-between focus:outline-none",
                            !showFeedback && "bg-white/5 border-white/10 hover:border-indigo-500/30 hover:bg-white/10 text-muted-foreground",
                            showFeedback && isChosen && quizCorrect && "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
                            showFeedback && isChosen && !quizCorrect && "bg-rose-500/10 border-rose-500/30 text-rose-300",
                            showFeedback && !isChosen && "bg-white/5 border-white/5 text-muted-foreground/50 opacity-60"
                          )}
                        >
                          <span>{opt.text}</span>
                          {showFeedback && isChosen && (
                            quizCorrect ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    // Fallback Options in case of formatting variations
                    [
                      { id: "1", text: "Attention mapping scale factors are too small" },
                      { id: "2", text: "Gradients saturate due to excessive learning rate scale" },
                      { id: "3", text: "Weight decay limits represent dynamic range clipping" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        disabled={quizSelected !== null}
                        onClick={(e) => handleQuizSelect(opt.text, e)}
                        className={cn(
                          "w-full p-3.5 rounded-xl border text-left text-sm font-semibold transition-all focus:outline-none",
                          quizSelected === null && "bg-white/5 border-white/10 hover:border-indigo-500/30 hover:bg-white/10 text-muted-foreground",
                          quizSelected !== null && quizSelected === opt.text && "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
                          quizSelected !== null && quizSelected !== opt.text && "bg-white/5 border-white/5 text-muted-foreground/50 opacity-60"
                        )}
                      >
                        {opt.text}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 9. MENTAL MODEL CARD */}
            {cardType === 'analogy' && (
              <div className="space-y-3">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tldr}
                </p>

                {/* Intuitive Analogy Panel */}
                <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/10 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sky-300">💡</span>
                    <span className="text-xs font-bold text-sky-300 uppercase tracking-wide">Intuitive Analogy (Mental Model)</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    <span className="font-semibold text-foreground">"{parsed.analogy?.concept || 'Analogous Concept'}":</span> {parsed.analogy?.comparison || 'Think of it as scaling up the filters on a camera: you capture sharper layers, but at the cost of processing speed.'}
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* CARD ACTION FOOTER */}
          <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-poppins">
                <Zap className="w-4 h-4 animate-pulse text-amber-400" />
                <span className="font-bold text-xs">+{cardXp} XP</span>
              </div>
            </div>
            
            <button 
              onClick={handleLearn}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs transition-all duration-300 flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              <span>Learn Concept</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
