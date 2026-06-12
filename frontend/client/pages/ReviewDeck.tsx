import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  TrendingUp, 
  Award, 
  Brain, 
  Sparkles, 
  Check, 
  Loader2, 
  Flame, 
  Activity, 
  Compass, 
  Clock, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function ReviewDeck() {
  const [queue, setQueue] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'analytics'>('review');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const queueRes = await api.get('/api/reviews/queue');
      const analyticsRes = await api.get('/api/reviews/analytics');
      setQueue(queueRes.data || []);
      setAnalytics(analyticsRes.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to fetch spaced reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleRate = async (rating: number) => {
    if (queue.length === 0 || hasRated) return;
    const card = queue[currentIdx];
    if (!card) return;

    setHasRated(true);
    try {
      const res = await api.post(`/api/cards/${card.id}/confidence`, { rating });
      const xp = res.data.xp_earned || (rating === 4 ? 25 : rating === 3 ? 15 : 10);
      toast.success(`Claimed +${xp} XP! Spaced repetition interval updated.`);
      
      // Move to next card after delay
      setTimeout(() => {
        if (currentIdx < queue.length - 1) {
          setCurrentIdx(prev => prev + 1);
          setShowAnswer(false);
          setHasRated(false);
        } else {
          // Finished queue
          setQueue([]);
          fetchReviews();
        }
      }, 1500);

    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save confidence rating');
      setHasRated(false);
    }
  };

  // Keyboard navigation hotkeys (1-4 keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'review' || queue.length === 0 || hasRated) return;
      
      // Ignore if user is inside form inputs
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
        e.preventDefault();
        if (!showAnswer) {
          setShowAnswer(true);
        } else {
          handleRate(parseInt(e.key));
        }
      } else if ((e.key === ' ' || e.key === 'Enter') && !showAnswer) {
        e.preventDefault();
        setShowAnswer(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queue, currentIdx, showAnswer, hasRated, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center font-poppins">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
        <span className="text-xs text-muted-foreground">Mapping recall queue...</span>
      </div>
    );
  }

  const currentCard = queue[currentIdx];

  return (
    <div className="min-h-screen bg-background font-poppins pb-16 relative overflow-hidden">
      
      {/* Dynamic background decoration */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10" />

      {/* Header Tabs */}
      <div className="sticky top-0 z-20 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="px-6 py-6 max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <BookOpen className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Memory Consolidation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">Review Deck</h1>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'review' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Recall Queue ({queue.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'analytics' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Memory Analytics
            </button>
          </div>
        </div>
      </div>

      {/* RENDER VIEW PORT BASED ON TAB */}
      <div className="px-6 py-10 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: REVIEW DECK QUEUE */}
          {activeTab === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              {queue.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.01] border border-white/5 rounded-2xl p-8 shadow-inner">
                  <Brain className="w-12 h-12 text-primary/30 mx-auto mb-4 animate-bounce" />
                  <h3 className="font-extrabold text-xl text-foreground mb-2">Memory Path Cleared</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8">
                    Congratulations! Your cognitive connections are fully synchronized. No review particles are due right now.
                  </p>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="px-6 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs transition-all hover:scale-105"
                  >
                    View Spacing Metrics
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Card wrapper */}
                  <div className="glass-premium border border-white/10 rounded-2xl p-6 min-h-[380px] flex flex-col justify-between shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider">
                          {currentCard.domain}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-bold">
                          Particle {currentIdx + 1} of {queue.length}
                        </span>
                      </div>

                      <h2 className="text-xl md:text-2xl font-extrabold text-foreground leading-tight tracking-tight pt-2">
                        {currentCard.title}
                      </h2>

                      {/* FRONT CARD CONTENT */}
                      {!showAnswer ? (
                        <div className="py-6 flex flex-col justify-center items-center border border-dashed border-white/5 bg-white/[0.01] rounded-xl text-center px-4">
                          <Brain className="w-10 h-10 text-primary/40 mb-3 animate-pulse" />
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                            Active Recall: Read the concept title above. Try to retrieve its details in your mind before flipping!
                          </p>
                          <button
                            onClick={() => setShowAnswer(true)}
                            className="mt-6 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/25 cursor-pointer"
                          >
                            Flip & Reveal Answer
                          </button>
                          <span className="text-[9px] text-muted-foreground/60 mt-3">Or press SPACE / ENTER</span>
                        </div>
                      ) : (
                        /* BACK CARD CONTENT */
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-4 pt-2"
                        >
                          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap select-text">
                            {currentCard.tldr || currentCard.body}
                          </div>
                          {currentCard.why_it_matters && (
                            <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 text-[11px] text-muted-foreground italic leading-relaxed">
                              💡 {currentCard.why_it_matters}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* CONFIDENCE RATING BAR */}
                    {showAnswer && (
                      <div className="pt-8 border-t border-white/5">
                        <p className="text-xs text-muted-foreground mb-4 text-center font-medium">
                          How successfully did you recall this particle? (Keys 1-4 supported)
                        </p>
                        
                        {hasRated ? (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center font-bold text-emerald-400 text-xs animate-pulse">
                            Consolidated! Scheduling next spacing interval...
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { val: 1, label: "Again", color: "hover:border-rose-500/30 hover:bg-rose-500/5 text-rose-400 border-white/5 bg-white/[0.01]" },
                              { val: 2, label: "Hard", color: "hover:border-amber-500/30 hover:bg-amber-500/5 text-amber-400 border-white/5 bg-white/[0.01]" },
                              { val: 3, label: "Good", color: "hover:border-emerald-500/30 hover:bg-emerald-500/5 text-emerald-400 border-white/5 bg-white/[0.01]" },
                              { val: 4, label: "Easy", color: "hover:border-cyan-500/30 hover:bg-cyan-500/5 text-cyan-400 border-white/5 bg-white/[0.01]" },
                            ].map((item) => (
                              <button
                                key={item.val}
                                onClick={() => handleRate(item.val)}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${item.color}`}
                              >
                                <span className="font-extrabold text-xs">{item.val}</span>
                                <span className="text-[9px] font-medium mt-0.5">{item.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: SPACING ANALYTICS */}
          {activeTab === 'analytics' && analytics && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card/50 border border-white/5 p-5 rounded-2xl text-center">
                  <Flame className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-3xl font-black text-primary">{analytics.recall_rate}%</div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Total Recall Success</p>
                </div>
                <div className="bg-card/50 border border-white/5 p-5 rounded-2xl text-center">
                  <Activity className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <div className="text-3xl font-black text-secondary">{analytics.retention_rate}%</div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Active Memory Retention</p>
                </div>
              </div>

              {/* Project Forgetting Curve (Recharts Line Chart) */}
              <div className="bg-card/50 border border-white/5 p-5 rounded-2xl">
                <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" /> Projected Forgetting Curve
                </h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.forgetting_curve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                      <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.4)" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ fontSize: 11, fontWeight: 'bold' }}
                        itemStyle={{ fontSize: 11 }}
                      />
                      <Line type="monotone" dataKey="retention" stroke="#8B5CF6" strokeWidth={2} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 italic text-center">
                  Based on Ebbinghaus forgetting algorithms compiled from your active spacing reviews.
                </p>
              </div>

              {/* Domain Mastery Levels (Recharts Bar Chart) */}
              <div className="bg-card/50 border border-white/5 p-5 rounded-2xl">
                <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-secondary" /> Cognitive Mastery by Domain
                </h3>
                {analytics.mastery_breakdown.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground italic">
                    Complete reviews to calculate mastery metrics.
                  </div>
                ) : (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.mastery_breakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="domain" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          labelStyle={{ fontSize: 11, fontWeight: 'bold' }}
                          itemStyle={{ fontSize: 11 }}
                        />
                        <Bar dataKey="mastery_score" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* ELI5 Cognitive Boost Analysis */}
              {analytics.eli5_impact && (
                <div className="bg-card/50 border border-white/5 p-5 rounded-2xl">
                  <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" /> ELI5 Cognitive Boost Analysis
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-center">
                      <div className="text-2xl font-black text-emerald-400">{analytics.eli5_impact.score_simplified}%</div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Simplified Concepts Accuracy</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-center">
                      <div className="text-2xl font-black text-rose-400/80">{analytics.eli5_impact.score_non_simplified}%</div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Standard Concepts Accuracy</p>
                    </div>
                  </div>

                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-2.5">
                    <div className="p-1 bg-primary/20 rounded text-primary mt-0.5 text-xs font-bold">
                      +{analytics.eli5_impact.improvement_pct}%
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      Using the <strong className="text-foreground">ELI5 Simplify</strong> feature boosts your memory retention accuracy by <strong className="text-primary">+{analytics.eli5_impact.improvement_pct}%</strong>! Your simplified review queue contains {analytics.eli5_impact.total_simplifications} telemetry trials.
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
