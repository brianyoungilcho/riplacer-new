import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, Crosshair, ChevronRight } from 'lucide-react';

function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">Riplacer</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                Sign In
              </Button>
            </Link>
            <Link to="/start">
              <Button variant="glow" size="lg">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        {/* Red accent gradient */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-8">
              AI-Powered Competitive Intelligence
            </div>
            
            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-gray-900 leading-[1.1] mb-6">
              <span className="relative inline-block">
                <span className="relative z-10">Rip</span>
                <span className="absolute bottom-2 left-0 w-full h-3 bg-primary/20 -z-0" />
              </span>
              {" "}out your{" "}
              <br className="hidden sm:block" />
              competition.{" "}
              <span className="text-primary">Win.</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed">
              Find government accounts using your competitor's products. 
              Get AI-powered intel on <span className="font-semibold text-gray-900">why they should switch to you</span>. 
              Close more deals.
            </p>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link to="/start">
                <Button variant="glow" size="xl" className="text-lg">
                  Start Ripping
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <button 
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="group flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
              >
                <span className="font-medium">See how it works</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Social proof */}
            <div className="mt-16 pt-10 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-4">Built for aggressive sales teams targeting:</p>
              <div className="flex flex-wrap gap-3">
                {['Police Departments', 'Fire Stations', 'Schools', 'City Governments', 'State Agencies'].map((tag) => (
                  <span key={tag} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50 border-y border-gray-100">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Your unfair advantage
            </h2>
            <p className="text-lg text-gray-600">
              Real-time intelligence on every government account in your territory.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Territory Mapping</h3>
              <p className="text-gray-600 leading-relaxed">
                Define your territory. See every prospect on an interactive map. 
                No more guessing who's in your region.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Competitor Detection</h3>
              <p className="text-gray-600 leading-relaxed">
                AI scans public records to find which competitors they use. 
                Know your enemy before you call.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Win Strategies</h3>
              <p className="text-gray-600 leading-relaxed">
                Get personalized hooks and displacement strategies. 
                AI tells you exactly why they should switch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              From zero to first call in 5 minutes
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '01', title: 'Tell us what you sell', desc: 'Enter your company info or just your email' },
                { step: '02', title: 'Define your territory', desc: 'Select your state, city, or draw your region' },
                { step: '03', title: 'Pick your targets', desc: 'Government, education, municipal — you choose' },
                { step: '04', title: 'Start winning', desc: 'Get AI intel and displacement strategies' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-5xl font-black text-primary/20 mb-4">{item.step}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900 text-white relative overflow-hidden">
        {/* Red accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full" />
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              Ready to{" "}
              <span className="text-primary">rip & replace</span>
              ?
            </h2>
            <p className="text-xl text-gray-400 mb-10">
              Your competitors are getting comfortable. Make them uncomfortable.
            </p>
            <Link to="/start">
              <Button variant="glow" size="xl" className="text-lg">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <p className="mt-6 text-sm text-gray-500">
              No credit card required. Start finding opportunities in minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <Crosshair className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-gray-900">Riplacer</span>
              </div>
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} Riplacer. Built for reps who win.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/terms" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link to="/cookies" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Cookies
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Policies</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/acceptable-use" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Acceptable Use
                    </Link>
                  </li>
                  <li>
                    <Link to="/disclaimer" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Disclaimer
                    </Link>
                  </li>
                  <li>
                    <Link to="/refund" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Refund
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();

  // Redirect logged-in users appropriately
  useEffect(() => {
    if (user && !profileLoading) {
      // Always redirect to /start (consolidated workspace)
      navigate('/start');
    }
  }, [user, profileLoading, navigate]);

  // Show loading only for authenticated users checking profile
  if (user && (authLoading || profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show landing page for everyone else
  return <LandingPage />;
}
