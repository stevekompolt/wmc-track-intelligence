import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessView, ROLE_ACCESS } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Map,
  Radio,
  Camera,
  Users,
  Settings,
  LogOut,
  User,
  Shield,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  view: string;
}

const navItems: NavItem[] = [
  {
    id: 'editor',
    label: 'Track Editor',
    path: '/editor',
    icon: <Map className="h-4 w-4" />,
    view: 'editor',
  },
  {
    id: 'ops',
    label: 'Event Ops',
    path: '/ops',
    icon: <Radio className="h-4 w-4" />,
    view: 'ops',
  },
  {
    id: 'media',
    label: 'Media Intelligence',
    path: '/media',
    icon: <Camera className="h-4 w-4" />,
    view: 'media',
  },
  {
    id: 'fan',
    label: 'Fan Preview',
    path: '/fan',
    icon: <Users className="h-4 w-4" />,
    view: 'fan',
  },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleConfig = user?.role ? ROLE_ACCESS[user.role] : null;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card/50 px-4">
        {/* Left: Logo & Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold tracking-wider hidden sm:inline">
              WMC TRACK INTELLIGENCE
            </span>
            <span className="font-display text-lg font-bold tracking-wider sm:hidden">
              WMC
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isAccessible = canAccessView(user?.role, item.view);
              const isActive = location.pathname.startsWith(item.path);

              if (!isAccessible) return null;

              return (
                <Link key={item.id} to={item.path}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'gap-2 font-display text-xs tracking-wide',
                      isActive && 'glow-primary'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              );
            })}

            {/* Settings - Admin only */}
            {canAccessView(user?.role, 'settings') && (
              <Link to="/settings">
                <Button
                  variant={location.pathname === '/settings' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2 font-display text-xs tracking-wide"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
            )}
          </nav>
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-4">
          {/* Role Badge */}
          {roleConfig && (
            <Badge
              variant="outline"
              className="hidden md:flex border-primary/30 text-primary font-mono text-xs"
            >
              {roleConfig.label}
            </Badge>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:inline text-sm">{user?.name}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground">
                <span className="font-mono text-xs">{roleConfig?.label}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-card/95 backdrop-blur">
          <nav className="flex flex-col p-2">
            {navItems.map((item) => {
              const isAccessible = canAccessView(user?.role, item.view);
              const isActive = location.pathname.startsWith(item.path);

              if (!isAccessible) return null;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start gap-3"
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            {canAccessView(user?.role, 'settings') && (
              <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={location.pathname === '/settings' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start gap-3"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Status Bar */}
      <footer className="flex h-6 items-center justify-between border-t border-border bg-card/30 px-4 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-clear animate-pulse" />
            SYSTEM ONLINE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>MOCK DATA MODE</span>
          <span>v0.1.0</span>
        </div>
      </footer>
    </div>
  );
}
