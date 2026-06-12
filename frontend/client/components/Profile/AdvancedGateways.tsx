import { motion } from 'framer-motion';
import { Settings, Sparkles, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdvancedGateways() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="p-6 rounded-xl bg-card/50 border border-border mt-6 text-left"
    >
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-muted-foreground" />
        Advanced & Developer Integrations
      </h3>
      <p className="text-xs text-muted-foreground mb-6 max-w-2xl leading-relaxed">
        Configure system integrations and premium features. These systems support enterprise classroom learning analytics and academic study track creations.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/ai-labs">
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-primary/30 hover:bg-white/[0.02] transition-smooth cursor-pointer text-left">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="font-bold text-xs text-foreground uppercase tracking-wider">AI Labs Integration</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Index arXiv IDs, query Groq-backed LLMs, and summarize papers.</p>
          </div>
        </Link>

        <Link to="/enterprise">
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-primary/30 hover:bg-white/[0.02] transition-smooth cursor-pointer text-left">
            <div className="flex items-center gap-2 mb-1.5">
              <Briefcase className="w-4.5 h-4.5 text-secondary" />
              <span className="font-bold text-xs text-foreground uppercase tracking-wider">Enterprise & Instructors</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Audit classroom cohorts, manage assignments, and supplement students.</p>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
