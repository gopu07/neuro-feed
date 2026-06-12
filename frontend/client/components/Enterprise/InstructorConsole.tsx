import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface Learner {
  id: string;
  name: string;
  role: string;
  completed: number;
  total: number;
  xp: number;
  struggleDomain: string | null;
}

interface Track {
  id: string;
  title: string;
  enrolled: number;
  difficulty: string;
  status: string;
}

interface InstructorConsoleProps {
  learners: Learner[];
  setLearners: React.Dispatch<React.SetStateAction<Learner[]>>;
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
}

export function InstructorConsole({ learners, setLearners, tracks, setTracks }: InstructorConsoleProps) {
  // Track Creator Form State
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackDifficulty, setNewTrackDifficulty] = useState('Intermediate');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isSubmittingTrack, setIsSubmittingTrack] = useState(false);

  const handleCreateTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackTitle.trim()) return;
    
    setIsSubmittingTrack(true);
    setTimeout(() => {
      const newTrack = {
        id: (tracks.length + 1).toString(),
        title: newTrackTitle.trim(),
        enrolled: 0,
        difficulty: newTrackDifficulty,
        status: 'Active'
      };
      setTracks([newTrack, ...tracks]);
      setNewTrackTitle('');
      setIsAssignOpen(false);
      setIsSubmittingTrack(false);
      toast.success(`Successfully assigned new track: ${newTrack.title}!`);
    }, 800);
  };

  const handleResolveStruggle = (learnerId: string, name: string) => {
    setLearners(learners.map(l => {
      if (l.id === learnerId) {
        return { ...l, struggleDomain: null };
      }
      return l;
    }));
    toast.success(`Dispatched tutoring supplement and resolved struggle flag for ${name}!`);
  };

  return (
    <motion.div
      key="instructors-tab"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left"
    >
      {/* Left & Middle Column: Tracks Assignment & List */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Track Creation Banner Header */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border shadow-xl flex justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-foreground">Content Tracks Control Panel</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-lg">
              Structure and deploy conceptual study tracks. Enrolled students are automatically assigned these concepts in their review queues.
            </p>
          </div>
          <button
            onClick={() => setIsAssignOpen(!isAssignOpen)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/95 font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 transition-all cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" />
            Assign Track
          </button>
        </div>

        {/* Collapsible Track Creation Form */}
        <AnimatePresence>
          {isAssignOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form 
                onSubmit={handleCreateTrack}
                className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xl"
              >
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-4.5 h-4.5 text-primary" />
                  Assign a New Learning Track
                </h3>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Track Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reinforcement Learning from Human Feedback (RLHF)"
                    value={newTrackTitle}
                    onChange={(e) => setNewTrackTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-smooth text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Target Difficulty</label>
                  <select
                    value={newTrackDifficulty}
                    onChange={(e) => setNewTrackDifficulty(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-smooth text-sm text-foreground"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingTrack}
                  className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer border-0 flex items-center justify-center gap-2"
                >
                  {isSubmittingTrack ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : "Deploy to Cohorts"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tracks list */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            Deployed Study Tracks ({tracks.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracks.map((track) => (
              <div 
                key={track.id}
                className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between hover:border-primary/30 transition-smooth"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-extrabold text-foreground text-sm tracking-tight leading-tight max-w-[70%]">
                      {track.title}
                    </h4>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                      track.difficulty === 'Beginner' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : track.difficulty === 'Intermediate'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {track.difficulty}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Assigned to this cohort with active sync trackers.
                  </p>
                </div>
                
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-border/40">
                  <div>
                    <div className="text-sm font-bold text-foreground">{track.enrolled}</div>
                    <div className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">Enrolled Cohorts</div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {track.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Column: Instructor Struggle Warning Monitor */}
      <div className="space-y-6">
        
        <div className="p-6 rounded-2xl bg-card border border-border shadow-lg">
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
            Academic Struggle Monitor
          </h3>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            The platform automatically flags cohort learners struggling in specific sub-domains based on their spaced repetition forgetting speeds and double-quiz failure logs.
          </p>
          
          {learners.filter(l => l.struggleDomain).length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-center text-xs font-bold">
              🎉 No active struggle warnings! All learners are performing perfectly on track.
            </div>
          ) : (
            <div className="space-y-4">
              {learners.filter(l => l.struggleDomain).map((learner) => (
                <div 
                  key={learner.id}
                  className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-extrabold text-xs text-foreground">{learner.name}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{learner.role}</div>
                    </div>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-bold text-[9px] uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Struggling
                    </span>
                  </div>
                  
                  <div className="p-2.5 rounded-lg bg-black/20 text-[10px] text-muted-foreground">
                    Failed quiz attempts and high forgetting rate in: <span className="text-red-400 font-bold">{learner.struggleDomain}</span>.
                  </div>
                  
                  <button
                    onClick={() => handleResolveStruggle(learner.id, learner.name)}
                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Dispatch Supplement & Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </motion.div>
  );
}
