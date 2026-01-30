import { useAuth } from '@/hooks/useAuth';
import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isAppSubdomain, redirectToMain } from '@/lib/domain';
import { UserProfileCard } from '@/components/dashboard/UserProfileCard';
import { ReportsList } from '@/components/dashboard/ReportsList';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, User, Menu, X } from 'lucide-react';

type TabType = 'overview' | 'reports' | 'profile';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const onAppSubdomain = isAppSubdomain();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Track if we're intentionally signing out to prevent redirect race
  const isSigningOut = useRef(false);

  // Note: Redirect logic for unauthenticated users on app subdomain is handled by 
  // SubdomainRedirect component. We don't duplicate it here to avoid race conditions
  // when session tokens are being processed from URL.

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    // SubdomainRedirect will handle the redirect to /auth
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Determine home link based on domain
  const homeLink = onAppSubdomain ? '/' : '/app';

  const handleSignOut = async () => {
    // Mark that we're signing out to prevent redirect loops
    isSigningOut.current = true;
    // Also set in sessionStorage so SubdomainRedirect can check
    sessionStorage.setItem('riplacer_signing_out', 'true');

    // Wait for sign out to complete before redirecting
    await signOut();

    // Now redirect to home page
    if (onAppSubdomain) {
      redirectToMain('/');
    } else {
      window.location.href = '/';
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            to={homeLink}
            onClick={(e) => {
              if (location.pathname === homeLink || location.pathname === '/' || location.pathname === '/app') {
                e.preventDefault();
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-3"
            aria-label="Riplacer home"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2.5}></circle>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v8m4-4H8"></path>
              </svg>
            </div>
            <span className="font-bold text-xl text-gray-900 hidden sm:inline">Riplacer</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            <span className="text-sm text-gray-600 truncate max-w-[200px]">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-primary transition-colors"
            >
              Sign out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-3">
              <p className="text-sm text-gray-600 truncate">{user.email}</p>
              <div className="flex flex-col gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left text-sm text-gray-600 hover:text-primary px-3 py-2 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your sales intelligence overview.</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 py-3 border-b-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Targets</h3>
                <p className="text-3xl font-bold text-primary">0</p>
                <p className="text-sm text-gray-500 mt-2">Rip & replace opportunities</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Briefings Sent</h3>
                <p className="text-3xl font-bold text-primary">0</p>
                <p className="text-sm text-gray-500 mt-2">Intelligence reports delivered</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Win Rate</h3>
                <p className="text-3xl font-bold text-primary">—</p>
                <p className="text-sm text-gray-500 mt-2">Track your success</p>
              </div>
            </div>

            {/* Quick Profile Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UserProfileCard />

              {/* Recent Activity / Coming Soon */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-8 flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">More Features Coming</h2>
                <p className="text-gray-600">
                  We're building powerful tools to help you track opportunities, view briefings, and manage your sales intelligence.
                </p>
                <div className="mt-6">
                  <a
                    href="mailto:hello@riplacer.com"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Contact Us for Early Access
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Research Reports</h2>
                <p className="text-sm text-gray-500 mt-0.5">All your account research organized by session</p>
              </div>
            </div>
            <ReportsList />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Profile</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manage how Riplacer understands your business</p>
            </div>
            <UserProfileCard />
          </div>
        )}
      </main>
    </div>
  );
}

