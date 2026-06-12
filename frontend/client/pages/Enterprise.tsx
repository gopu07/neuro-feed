import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building, 
  BarChart3, 
  GraduationCap
} from 'lucide-react';
import { TeamManagerConsole } from '@/components/Enterprise/TeamManagerConsole';
import { InstructorConsole } from '@/components/Enterprise/InstructorConsole';

const INITIAL_LEARNERS = [
  { id: '1', name: 'Alice Thorne', role: 'ML Engineer Intern', completed: 42, total: 50, xp: 4200, struggleDomain: null },
  { id: '2', name: 'Bob Sterling', role: 'Junior Data Scientist', completed: 28, total: 50, xp: 2850, struggleDomain: 'Transformer Architectures' },
  { id: '3', name: 'Carla Ruiz', role: 'Software Engineer (Data)', completed: 48, total: 50, xp: 5100, struggleDomain: null },
  { id: '4', name: 'David Kim', role: 'AI Resident', completed: 15, total: 50, xp: 1450, struggleDomain: 'Gradient Descent Optimization' },
  { id: '5', name: 'Elena Rostova', role: 'ML Engineer Intern', completed: 39, total: 50, xp: 3900, struggleDomain: null },
];

const INITIAL_TRACKS = [
  { id: '1', title: 'Generative AI Foundations', enrolled: 18, difficulty: 'Beginner', status: 'Active' },
  { id: '2', title: 'Large Language Models (LLMs) in Prod', enrolled: 12, difficulty: 'Intermediate', status: 'Active' },
  { id: '3', title: 'Advanced Deep Neural Architectures', enrolled: 8, difficulty: 'Advanced', status: 'Planning' },
];

export default function Enterprise() {
  const [activeTab, setActiveTab] = useState<'managers' | 'instructors'>('managers');
  const [learners, setLearners] = useState(INITIAL_LEARNERS);
  const [tracks, setTracks] = useState(INITIAL_TRACKS);

  return (
    <div className="min-h-screen bg-background text-foreground font-poppins">
      
      {/* Top Banner and Tabs */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="px-6 py-6 max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-3">
              <Building className="w-8 h-8 text-primary" />
              Enterprise Console
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-left">
              Universities, Bootcamps, and Corporate Cohorts Learning OS Analytics.
            </p>
          </div>
          
          {/* Tab Selector Buttons */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-stretch md:self-auto">
            <button
              onClick={() => setActiveTab('managers')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-smooth cursor-pointer border-0 ${
                activeTab === 'managers' 
                  ? 'bg-primary text-white font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Team Managers
            </button>
            <button
              onClick={() => setActiveTab('instructors')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-smooth cursor-pointer border-0 ${
                activeTab === 'instructors' 
                  ? 'bg-primary text-white font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Instructors Panel
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'managers' ? (
            <TeamManagerConsole key="managers-tab" learners={learners} />
          ) : (
            <InstructorConsole 
              key="instructors-tab"
              learners={learners}
              setLearners={setLearners}
              tracks={tracks}
              setTracks={setTracks}
            />
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
