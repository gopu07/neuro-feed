import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap,
  Flame,
  BarChart3,
  Award,
  Sparkles,
  Search,
  Brain,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  Users,
  Briefcase,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const navItems = [
  {
    icon: Zap,
    label: 'Swipe Feed',
    path: '/',
  },
  {
    icon: HelpCircle,
    label: 'Knowledge Quiz',
    path: '/quiz',
  },
  {
    icon: BookOpen,
    label: 'Review Deck',
    path: '/reviews',
  },
  {
    icon: Search,
    label: 'Explore',
    path: '/explore',
  },
  {
    icon: Award,
    label: 'Leaderboard',
    path: '/leaderboard',
  },
  {
    icon: Users,
    label: 'Guilds',
    path: '/guilds',
  },
  {
    icon: BarChart3,
    label: 'Profile & Stats',
    path: '/profile',
  },
];


export function MobileDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const setSettingsOpen = useSettingsStore((state) => state.setOpen);
  const { data: profile } = useUserProfile();

  // Close drawer on path change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Successfully logged out!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to logout');
    }
  };

  return (
    <>
      {/* Mobile Top Header Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-40 md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            aria-label="Open navigation menu"
            aria-expanded={isOpen}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white">
              <Brain className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-extrabold text-sm text-foreground tracking-tight">NeuroFeed</span>
          </div>
        </div>

        {/* Quick User Stats */}
        {profile && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-3 py-1 rounded-xl">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-orange-400">{profile.streak_days}</span>
            </div>
            <div className="w-[1px] h-3.5 bg-white/10" />
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">{profile.xp} XP</span>
            </div>
          </div>
        )}
      </header>

      {/* Drawer Overlay Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-sidebar-background/95 backdrop-blur-md border-r border-white/5 z-50 py-6 px-4 flex flex-col justify-between font-poppins md:hidden"
              role="dialog"
              aria-modal="true"
            >
              <div>
                {/* Header Close Trigger */}
                <div className="flex items-center justify-between mb-8 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-black text-sm text-foreground tracking-tight leading-none">NeuroFeed</h2>
                      <span className="text-[8px] text-primary uppercase font-bold tracking-widest mt-0.5 block">Cognitive OS</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Profile Widget inside Menu */}
                {profile && (
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-primary/20 flex items-center justify-center text-xl">
                      🧠
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground leading-none">{profile.username || "Learner"}</h3>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[160px]">{profile.email}</p>
                      <span className="inline-block px-1.5 py-0.5 text-[8px] font-bold bg-primary/10 text-primary border border-primary/20 rounded mt-2">
                        Level {profile.level_index}
                      </span>
                    </div>
                  </div>
                )}

                {/* Nav Links */}
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider relative',
                          isActive
                            ? 'text-foreground bg-primary/10 border-l-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
                        )}
                      >
                        <Icon className={cn("w-4.5 h-4.5 transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span>{item.label}</span>
                        {isActive && (
                          <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Bottom Actions */}
              <div className="space-y-1 pt-6 border-t border-white/5">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-white/[0.02] cursor-pointer text-left focus:outline-none"
                >
                  <Settings className="w-4.5 h-4.5" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer text-left focus:outline-none"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
