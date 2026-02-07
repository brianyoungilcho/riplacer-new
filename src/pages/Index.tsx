import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, Crosshair, Eye, Users, TrendingUp, X, Check, Zap, Menu } from 'lucide-react';

// Preload the onboarding page when user hovers over CTA buttons
const preloadOnboarding = () => {
  import('./OnboardingV2');
};

function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogoClick = (e: React.MouseEvent) => {
    // Clicking the logo should behave like "scroll to top" even if you're already on "/".
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Dark */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" onClick={handleLogoClick}>
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Riplacer</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-4">
              <Link to="/pricing">
                <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5">
                  Pricing
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5">
                  Sign In
                </Button>
              </Link>
              <Link to="/start" onMouseEnter={preloadOnboarding}>
                <Button variant="glow" size="lg">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-label="Toggle navigation menu"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0F1115]/95 backdrop-blur-md">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-2">
              <Link to="/pricing" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5">
                  Pricing
                </Button>
              </Link>
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5">
                  Sign In
                </Button>
              </Link>
              <Link to="/start" onMouseEnter={preloadOnboarding} onClick={() => setIsMenuOpen(false)}>
                <Button variant="glow" className="w-full justify-between">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section - Dark */}
      <section className="pt-24 sm:pt-28 pb-16 sm:pb-20 lg:pt-40 lg:pb-32 relative overflow-hidden bg-[#0F1115] text-white">
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-10 max-w-7xl mx-auto">
            {/* Left side - Copy */}
            <div className="lg:w-[65%] space-y-8 max-w-none">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
                <span className="text-primary font-bold uppercase tracking-wide text-xs">Force Multiplier</span>
                <span className="text-gray-400 ml-2 text-xs">For elite government sales reps</span>
              </div>

              {/* Main headline */}
              <h1 className="text-5xl sm:text-6xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight">
                Rip out your{" "}
                <br className="hidden sm:block" />
                competition.{" "}
                <span className="text-primary">Win.</span>
              </h1>

              <div className="space-y-2">
                <p className="text-lg text-gray-400 leading-relaxed max-w-2xl">
                  <span className="font-semibold text-white">Sales is human. The grunt work shouldn't be.</span>
                </p>
                <p className="text-lg text-gray-400 leading-relaxed max-w-2xl">
                  Your AI Chief of Staff reads every city council PDF, tracks every budget vote, and maps the politics. You get the intel to close the deal.
                </p>
              </div>

              <div className="flex flex-col items-start gap-4 pt-2">
                <Link to="/start" onMouseEnter={preloadOnboarding}>
                  <Button variant="glow" size="xl">
                    Start Ripping
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>

                {/* Social proof */}
                <div className="flex items-center gap-3 px-1">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#0F1115] flex items-center justify-center overflow-hidden">
                      <img
                        src="https://rpkcwosacdsadclyhyuv.supabase.co/storage/v1/object/public/home/logo/logo_axon.png"
                        alt="Axon"
                        className="h-5 w-5 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#0F1115] flex items-center justify-center overflow-hidden">
                      <img
                        src="https://rpkcwosacdsadclyhyuv.supabase.co/storage/v1/object/public/home/logo/logo_flock.png"
                        alt="Flock"
                        className="h-5 w-5 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#0F1115] flex items-center justify-center overflow-hidden">
                      <img
                        src="https://rpkcwosacdsadclyhyuv.supabase.co/storage/v1/object/public/home/logo/logo_motorola.png"
                        alt="Motorola"
                        className="h-5 w-5 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#0F1115] flex items-center justify-center overflow-hidden">
                      <img
                        src="https://rpkcwosacdsadclyhyuv.supabase.co/storage/v1/object/public/home/logo/logo_skydio.png"
                        alt="Skydio"
                        className="h-5 w-5 object-contain"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">
                    Used by aggressive reps from top companies
                  </span>
                </div>
              </div>
            </div>

            {/* Right side - Gmail iPhone Preview */}
            <div className="lg:w-[35%] relative flex justify-start">
              {/* Glow effect */}
              <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full opacity-40" />

              {/* iPhone 15 Pro frame - cropped to show top half */}
              <div className="relative w-full max-w-[390px] bg-[#1d1d1f] rounded-t-[3.5rem] p-2.5 shadow-2xl overflow-hidden" style={{ boxShadow: '0 0 0 12px #1d1d1f, 0 0 60px rgba(0,0,0,0.8)' }}>
                {/* Screen - cropped height showing top portion */}
                <div className="bg-white rounded-t-[3rem] overflow-hidden relative" style={{ height: '420px' }}>
                  {/* Dynamic Island */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-full z-50" />

                  {/* Gmail Header with Red */}
                  <div className="bg-[#c5221f] px-6 pt-16 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                        <span className="text-white text-[22px] font-normal">Primary</span>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm">
                        2
                      </div>
                    </div>
                  </div>

                  {/* Email List */}
                  <div className="bg-white">
                    {/* Unread Email 1 */}
                    <div className="px-5 py-4 border-b border-gray-200 bg-white">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0">
                          R
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="font-bold text-black text-[16px]">Riplacer</span>
                            <span className="text-gray-600 text-[13px]">9:41 AM</span>
                          </div>
                          <div className="text-black font-semibold text-[15px] mb-1 line-clamp-1">
                            ⚠️ Hot Lead: Town of Gilbert
                          </div>
                          <div className="text-gray-700 text-[14px] line-clamp-2 leading-snug">
                            Council meeting—Rogers complained about vendor crashes. Contract expires October...
                          </div>
                        </div>
                        <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                    </div>

                    {/* Unread Email 2 */}
                    <div className="px-5 py-4 border-b border-gray-200 bg-white">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0">
                          R
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="font-bold text-black text-[16px]">Riplacer</span>
                            <span className="text-gray-600 text-[13px]">9:36 AM</span>
                          </div>
                          <div className="text-black font-semibold text-[15px] mb-1 line-clamp-1">
                            💰 Phoenix PD - Budget Alert
                          </div>
                          <div className="text-gray-700 text-[14px] line-clamp-2 leading-snug">
                            $2.3M approved for equipment. Window closing soon...
                          </div>
                        </div>
                        <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating status - positioned on left side */}
              <div className="absolute -bottom-4 left-2 sm:-left-6 bg-[#0F1115] border border-gray-700 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <p className="text-sm font-semibold text-white">AI agent researching live</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* The Riplacer Thesis - Light */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Riplacer Thesis</h2>
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed font-light">
              "Sales will always be human buying from human. But the rep with the most context wins.{" "}
              <span className="text-gray-900 font-semibold">Your job is the handshake. Our job is to make you omniscient.</span>"
            </p>
          </div>
        </div>
      </section>

      {/* Features Section - Dark */}
      <section className="py-24 bg-[#0F1115] text-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-4xl font-bold text-white mb-4">
              Your unfair advantage
            </h2>
            <p className="text-lg text-gray-400">
              Stop searching databases. Start receiving intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-white/[0.03] backdrop-blur-sm p-8 rounded-2xl border border-white/10">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Never miss an opportunity</h3>
              <p className="text-gray-400 leading-relaxed">
                Your AI monitors 1,000+ government meetings 24/7. Get instant alerts when prospects mention problems you solve.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/[0.03] backdrop-blur-sm p-8 rounded-2xl border border-white/10">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Know who holds power</h3>
              <p className="text-gray-400 leading-relaxed">
                Understand the politics before you pitch. See decision-makers, budget holders, and swing votes mapped automatically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/[0.03] backdrop-blur-sm p-8 rounded-2xl border border-white/10">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Displace competitors</h3>
              <p className="text-gray-400 leading-relaxed">
                Find incumbent failures in public records. Get the exact "wedge" to replace entrenched vendors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section - Light */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              From grunt work to force multiplier
            </h2>
            <p className="text-lg text-gray-600">
              See why top reps are hiring an AI Chief of Staff.
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-0 border-4 border-black rounded-3xl overflow-hidden shadow-2xl">
            {/* Average Rep */}
            <div className="bg-gray-100 p-6 sm:p-8 md:p-10 border-b md:border-b-0 md:border-r border-gray-300">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6">The Average Rep</h3>
              <ul className="space-y-6">
                {[
                  'Logs into 5 different portals to manually search for keywords.',
                  'Finds out about an RFP the day it is published (too late).',
                  'Pitches features blindly without knowing internal politics.',
                  'Wastes 15 hours a week reading irrelevant documents.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={3} />
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Riplacer Rep */}
            <div className="bg-[#0F1115] p-6 sm:p-8 md:p-10 text-white relative">
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                SUPERHUMAN
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-6">The Riplacer Rep</h3>
              <ul className="space-y-6">
                {[
                  { bold: 'Zero Logins.', text: 'Gets a curated briefing via email every morning.' },
                  { bold: '6-Month Head Start.', text: 'Knows the problem before the RFP is even written.' },
                  { bold: 'Insider Context.', text: 'Knows the key players and their pain points.' },
                  { bold: '100% Focus on Relationships.', text: 'The AI does the reading; you do the closing.' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" strokeWidth={3} />
                    <span>
                      <strong>{item.bold}</strong> {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Dark */}
      <section id="how-it-works" className="py-24 bg-[#0F1115] text-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-4xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-lg text-gray-400">
              From setup to first opportunity in minutes, not months
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-12">
            {[
              { step: '1', title: 'Define your territory.', desc: "Tell us what you sell and which governments you target. That's the only setup you do." },
              { step: '2', title: 'Your Agent goes to work.', desc: 'Our autonomous agents begin scanning public records, video feeds, and meeting minutes for your keywords and competitors.', highlight: true },
              { step: '3', title: 'You wake up to Intel.', desc: 'Receive a "Morning Briefing" in your inbox. No noise. Just opportunities where displacement is possible.' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-2xl font-bold ${item.highlight
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-900'
                  }`}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Full width gradient */}
      <section className="py-24 bg-gradient-to-br from-primary to-red-700 text-white relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl lg:text-5xl font-bold mb-6">
              Ready to rip & replace?
            </h2>
            <p className="text-xl text-red-100 mb-10 max-w-2xl mx-auto">
              Your competitors are getting comfortable. Use AI to find their weak spots and take their accounts.
            </p>
            <Link to="/start" onMouseEnter={preloadOnboarding}>
              <Button
                variant="secondary"
                size="xl"
                className="bg-white text-primary hover:bg-gray-100 shadow-xl"
              >
                Start Ripping
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <p className="mt-6 text-sm text-red-200">
              No credit card required. Start finding opportunities in minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Footer - Dark */}
      <footer className="py-12 bg-[#0F1115] text-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex flex-col gap-3">
              <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2.5 w-fit">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-white">Riplacer</span>
              </Link>
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} Riplacer. Built for reps who win.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4 sm:gap-x-8 gap-y-3">
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/terms" className="text-gray-500 hover:text-white transition-colors">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="text-gray-500 hover:text-white transition-colors">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link to="/cookies" className="text-gray-500 hover:text-white transition-colors">
                      Cookies
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Policies</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/acceptable-use" className="text-gray-500 hover:text-white transition-colors">
                      Acceptable Use
                    </Link>
                  </li>
                  <li>
                    <Link to="/disclaimer" className="text-gray-500 hover:text-white transition-colors">
                      Disclaimer
                    </Link>
                  </li>
                  <li>
                    <Link to="/refund" className="text-gray-500 hover:text-white transition-colors">
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
  // Allow all users (logged in or not) to view the landing page
  return <LandingPage />;
}
