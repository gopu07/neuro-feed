import { motion } from 'framer-motion';
import { 
  Users, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  Award,
  ShieldAlert
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const MOCK_TEAM_STATS = {
  activeRate: "94.2%",
  avgMastery: "81.8%",
  modulesCompleted: 1428,
  totalXp: "142,500 XP",
  weeklyGrowth: "+12.4%"
};

const MOCK_ACTIVITY_DATA = [
  { day: 'Mon', xp: 12000, completions: 42 },
  { day: 'Tue', xp: 19000, completions: 58 },
  { day: 'Wed', xp: 15000, completions: 50 },
  { day: 'Thu', xp: 24000, completions: 72 },
  { day: 'Fri', xp: 22000, completions: 68 },
  { day: 'Sat', xp: 11000, completions: 35 },
  { day: 'Sun', xp: 14000, completions: 44 },
];

const MOCK_DOMAIN_DISTRIBUTION = [
  { domain: 'Generative AI', count: 48, fill: '#8B5CF6' },
  { domain: 'NLP & LLMs', count: 36, fill: '#3B82F6' },
  { domain: 'Neural Networks', count: 28, fill: '#10B981' },
  { domain: 'Reinforcement Learning', count: 18, fill: '#F59E0B' },
  { domain: 'AI Governance', count: 12, fill: '#EF4444' },
];

interface Learner {
  id: string;
  name: string;
  role: string;
  completed: number;
  total: number;
  xp: number;
  struggleDomain: string | null;
}

interface TeamManagerConsoleProps {
  learners: Learner[];
}

export function TeamManagerConsole({ learners }: TeamManagerConsoleProps) {
  return (
    <motion.div
      key="managers-tab"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 text-left"
    >
      {/* Aggregated KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Active Learners', val: MOCK_TEAM_STATS.activeRate, trend: '98% this month', icon: Users, color: 'text-primary' },
          { label: 'Avg Mastery Rate', val: MOCK_TEAM_STATS.avgMastery, trend: '+2.4% weekly', icon: Award, color: 'text-emerald-400' },
          { label: 'Modules Finished', val: MOCK_TEAM_STATS.modulesCompleted, trend: '14 today', icon: CheckCircle2, color: 'text-yellow-400' },
          { label: 'Organization XP', val: MOCK_TEAM_STATS.totalXp, trend: '+12K from yesterday', icon: Sparkles, color: 'text-secondary' },
          { label: 'Weekly Growth', val: MOCK_TEAM_STATS.weeklyGrowth, trend: 'Consistent curve', icon: TrendingUp, color: 'text-purple-400' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="p-5 rounded-2xl bg-card border border-border shadow-md"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{kpi.label}</span>
                <Icon className={`w-4.5 h-4.5 ${kpi.color}`} />
              </div>
              <div className="text-xl font-black text-foreground">{kpi.val}</div>
              <span className="text-[9px] font-semibold text-muted-foreground mt-1 block">{kpi.trend}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Graphic Charts Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Organization Learning Velocity Curve */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-lg">
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary animate-pulse" />
            Weekly Learning Velocity (XP & Completions)
          </h3>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_ACTIVITY_DATA}>
                <defs>
                  <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="rgba(229,231,235,0.4)" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis stroke="rgba(229,231,235,0.4)" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem' }} />
                <Area type="monotone" dataKey="xp" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorXp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Domain Distribution Ranks */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-lg">
          <h3 className="text-base font-extrabold text-foreground mb-6">
            Mastered Domains Breakdown
          </h3>
          
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_DOMAIN_DISTRIBUTION} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(229,231,235,0.4)" tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="domain" stroke="rgba(229,231,235,0.4)" width={90} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {MOCK_DOMAIN_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 text-center leading-relaxed">
            Most active domain remains <span className="font-bold">Generative AI</span> (48 completed modules), followed by <span className="font-bold">NLP & LLMs</span>.
          </p>
        </div>
      </div>

      {/* Organization Learner Roster Log */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-lg">
        <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-primary" />
          Cohort Learners Status Roster
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pb-3">
                <th className="pb-3">Learner</th>
                <th className="pb-3">Roster Title</th>
                <th className="pb-3">Overall Progress</th>
                <th className="pb-3">Total XP</th>
                <th className="pb-3 text-right">Academic Struggle Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {learners.map((learner) => {
                const progressPercent = (learner.completed / learner.total) * 100;
                return (
                  <tr key={learner.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 font-bold text-foreground flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs text-primary uppercase">
                        {learner.name.substring(0,2)}
                      </div>
                      {learner.name}
                    </td>
                    <td className="py-4 text-muted-foreground">{learner.role}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <span className="font-bold text-[10px] text-foreground">{learner.completed}/{learner.total} Cards</span>
                      </div>
                    </td>
                    <td className="py-4 font-bold text-primary">{learner.xp.toLocaleString()} XP</td>
                    <td className="py-4 text-right">
                      {learner.struggleDomain ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[10px] uppercase tracking-wider">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Struggling in {learner.struggleDomain}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          On Track
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
