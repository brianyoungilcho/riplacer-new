import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Target, Map, ArrowRight, Sparkles } from 'lucide-react';

function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">Riplacer</span>
          </div>
          <Link to="/auth">
            <Button variant="glow">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="relative z-10">
        <section className="container mx-auto px-6 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
              <Sparkles className="w-4 h-4" />
              AI-Powered Sales Intelligence
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
              Rip & Replace
              <span className="block text-primary">Your Competition</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Find prospects using your competitors' products and generate targeted outreach 
              with AI-powered insights. No pre-built databases — just real-time intelligence.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/auth">
                <Button variant="glow" size="lg" className="text-lg px-8">
                  Start Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8">
                See How It Works
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-6 py-24">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Map className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Map-Based Discovery</h3>
              <p className="text-muted-foreground">
                Search any industry and location. See prospects on an interactive map with instant results.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">AI Enrichment</h3>
              <p className="text-muted-foreground">
                AI analyzes each prospect to identify competitor usage, decision makers, and pain points.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Personalized Hooks</h3>
              <p className="text-muted-foreground">
                Get AI-generated cold email openers tailored to why each prospect should switch to you.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 py-24">
          <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-primary/5 border border-primary/20 space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold">Ready to steal your competitors' customers?</h2>
            <p className="text-lg text-muted-foreground">
              Set up in 2 minutes. No credit card required.
            </p>
            <Link to="/auth">
              <Button variant="glow" size="lg" className="text-lg px-8">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Riplacer. Built for sales reps who want to win.
        </div>
      </footer>
    </div>
  );
}

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.onboarding_complete) {
      navigate('/discover');
    }
  }, [profile, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="fixed inset-0 gradient-glow pointer-events-none" />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!user) {
    return <LandingPage />;
  }

  // Show onboarding for authenticated users without complete profile
  if (!profile?.onboarding_complete) {
    return (
      <OnboardingFlow 
        onComplete={() => {
          refetch();
          navigate('/discover');
        }} 
      />
    );
  }

  return null; // Will redirect to discover
}
