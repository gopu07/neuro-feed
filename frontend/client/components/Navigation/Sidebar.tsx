import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Zap,
  Flame,
  BarChart3,
  Award,
  Sparkles,
  Search,
  Settings,
  LogOut,
  Brain,
  BookOpen,
  Users,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const navItems = [
  {
    icon: Zap,
    label: 'Feed',
    path: '/',
  },
  {
    icon: BookOpen,
    label: 'Review Deck',
    path: '/reviews',
  },
  {
    icon: Users,
    label: 'Guilds',
    path: '/guilds',
  },
  {
    icon: BarChart3,
    label: 'Profile',
    path: '/profile',
  },
  {
    icon: Award,
    label: 'Leaderboard',
    path: '/leaderboard',
  },
  {
    icon: Search,
    label: 'Explore',
    path: '/explore',
  },
];

const bottomItems = [
  {
    icon: Settings,
    label: 'Settings',
    path: '/settings',
  },
  {
    icon: LogOut,
    label: 'Logout',
    path: '/logout',
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const setSettingsOpen = useSettingsStore((state) => state.setOpen);

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
    <div className="fixed left-0 top-0 h-screen w-64 bg-sidebar-background/95 backdrop-blur-md border-r border-white/5 flex flex-col py-8 px-4 font-poppins z-30">
      
      {/* Brand Logo & Identifier */}
      <div className="mb-10 flex items-center gap-3 px-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Brain className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="font-black text-base text-foreground tracking-tight leading-none">NeuroFeed</h1>
          <span className="text-[9px] text-primary uppercase font-bold tracking-widest block mt-0.5">Cognitive OS</span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider relative',
                isActive
                  ? 'text-foreground bg-primary/10 border-l-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
              )}
            >
              <Icon className={cn("w-4.5 h-4.5 transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeGlow"
                  className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Configuration & Exit Controls */}
      <nav className="space-y-1 pt-6 border-t border-white/5">
        {bottomItems.map((item) => {
          const Icon = item.icon;

          if (item.label === 'Settings') {
            return (
              <button
                key={item.label}
                onClick={() => setSettingsOpen(true)}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-white/[0.02] cursor-pointer text-left focus:outline-none"
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{item.label}</span>
              </button>
            );
          }

          if (item.label === 'Logout') {
            return (
              <button
                key={item.label}
                onClick={handleLogout}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer text-left focus:outline-none"
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
