import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isAppSubdomain, redirectToMain } from '@/lib/domain';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const onAppSubdomain = isAppSubdomain();

  // Track if we're intentionally signing out to prevent redirect race
  const isSigningOut = useRef(false);

  useEffect(() => {
    // Don't redirect if we're in the process of signing out
    if (isSigningOut.current) {
      return;
    }

    if (!loading && !user) {
      // Redirect to auth - use cross-domain redirect on app subdomain
      if (onAppSubdomain) {
        redirectToMain('/auth');
      }
      // On main domain, SubdomainRedirect or direct navigation handles it
    }
  }, [user, loading, onAppSubdomain]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
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
            <span className="font-bold text-xl text-gray-900">Riplacer</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-primary transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Your dashboard is being built.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder Cards */}
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

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Coming Soon</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're building a powerful dashboard to help you track your rip & replace opportunities,
            view briefings, and manage your sales intelligence. Stay tuned!
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
      </main>
    </div>
  );
}
