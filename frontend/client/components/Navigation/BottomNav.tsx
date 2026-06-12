import { Link, useLocation } from 'react-router-dom';
import { 
  Zap,
  BookOpen,
  Search,
  Users,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    icon: Zap,
    label: 'Feed',
    path: '/',
  },
  {
    icon: BookOpen,
    label: 'Reviews',
    path: '/reviews',
  },
  {
    icon: Search,
    label: 'Explore',
    path: '/explore',
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
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-sidebar-background/95 backdrop-blur-sm border-t border-border flex items-center justify-around px-2 safe-area-inset-bottom">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center w-14 h-14 rounded-lg transition-smooth',
              'border-t-2 border-transparent -mt-[1px]',
              isActive
                ? 'text-primary border-t-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
