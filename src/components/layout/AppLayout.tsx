import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { MobileGate } from './MobileGate';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Crosshair, 
  Map, 
  Target, 
  Settings, 
  LogOut,
  LogIn,
  User,
  ChevronRight
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/discover', label: 'Discover', icon: Map },
  { href: '/targets', label: 'My Targets', icon: Target },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const isGuest = !user;

  // Check if onboarding is complete (from localStorage for guests, profile for users)
  const hasCompletedOnboarding = (() => {
    if (user && profile?.onboarding_complete) return true;
    const onboardingData = localStorage.getItem('riplacer_onboarding');
    return !!onboardingData;
  })();

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      navigate('/start');
    }
  }, [hasCompletedOnboarding, navigate]);

  // Get territory from localStorage
  const territory = (() => {
    const saved = localStorage.getItem('riplacer_territory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  })();

  return (
    <MobileGate>
      <div className="min-h-screen bg-white flex dark">
        {/* Sidebar - dark themed for app interior */}
        <aside className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-800">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg text-white">Riplacer</span>
            </Link>
          </div>

          {/* Guest mode banner */}
          {isGuest && (
            <div className="mx-4 mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-primary text-sm font-medium mb-1">
                Guest Mode
              </div>
              <p className="text-xs text-gray-400 mb-2">
                Sign up to save prospects and access all features.
              </p>
              <Link to="/auth">
                <Button size="sm" variant="glow" className="w-full">
                  Create Free Account
                </Button>
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              // Disable certain nav items for guests
              const isDisabledForGuest = isGuest && (item.href === '/targets' || item.href === '/settings');
              
              if (isDisabledForGuest) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 cursor-not-allowed"
                    title="Sign up to access this feature"
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                    <span className="ml-auto text-xs text-gray-500">Pro</span>
                  </div>
                );
              }
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary/20 text-primary" 
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Territory indicator */}
          {territory && (territory.state || territory.city) && (
            <div className="mx-4 mb-4 p-3 rounded-lg bg-gray-800 border border-gray-700">
              <div className="text-xs text-gray-500 mb-1">Your Territory</div>
              <div className="text-sm font-medium text-white">
                {territory.city ? `${territory.city}, ${territory.state}` : territory.state}
              </div>
            </div>
          )}

          {/* User section */}
          <div className="p-4 border-t border-gray-800">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {profile?.company_name || 'My Company'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 justify-start text-gray-400 hover:text-white hover:bg-gray-800"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-950">
          {children}
        </main>
      </div>
    </MobileGate>
  );
}
