import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Zap, ArrowRight, Menu, X } from 'lucide-react';
import { PricingCard } from '@/components/pricing/PricingCard';
import { FAQ } from '@/components/pricing/FAQ';

export default function Pricing() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isYearly, setIsYearly] = useState(true);

    const preloadOnboarding = () => {
        import('./OnboardingV2');
    };

    const handleLogoClick = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header - Dark (consistent with landing) */}
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
                                <Button variant="ghost" className="text-white bg-white/10">
                                    Pricing
                                </Button>
                            </Link>
                            <Link to="/auth">
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
                                <Button variant="ghost" className="w-full justify-start text-white bg-white/10">
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

            <main className="pt-24 pb-20">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                            Simple, transparent pricing
                        </h1>
                        <p className="text-xl text-muted-foreground mb-8">
                            Start for free. Scale when you win.
                        </p>

                        <div className="flex items-center justify-center gap-4">
                            <Label htmlFor="billing-toggle" className={!isYearly ? "text-foreground font-semibold" : "text-muted-foreground"}>
                                Monthly
                            </Label>
                            <Switch
                                id="billing-toggle"
                                checked={isYearly}
                                onCheckedChange={setIsYearly}
                            />
                            <Label htmlFor="billing-toggle" className={isYearly ? "text-foreground font-semibold" : "text-muted-foreground"}>
                                Yearly <Badge variant="secondary" className="ml-1 text-primary bg-primary/10">Save 20%</Badge>
                            </Label>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
                        <PricingCard
                            title="Starter"
                            description="For individual reps testing the waters."
                            price="Free"
                            period="forever"
                            buttonText="Get Started Free"
                            buttonVariant="outline"
                            features={[
                                { text: "1 Active Monitor", included: true },
                                { text: "Weekly Intelligence Briefings", included: true },
                                { text: "Basic Territory Mapping", included: true },
                                { text: "Community Support", included: true },
                                { text: "Real-time Alerts", included: false },
                                { text: "Multiple Team Members", included: false },
                            ]}
                        />

                        <PricingCard
                            title="Growth"
                            description="For closers who need consistent deal flow."
                            price={isYearly ? "$39" : "$49"}
                            period="per month"
                            buttonText="Start Free Trial"
                            highlighted={true}
                            popular={true}
                            features={[
                                { text: "10 Active Monitors", included: true },
                                { text: "Daily Intelligence Briefings", included: true },
                                { text: "Advanced Competitor Tracking", included: true },
                                { text: "3 Team Members", included: true },
                                { text: "Email Support", included: true },
                                { text: "CRM Integration (Waitlist)", included: false },
                            ]}
                        />

                        <PricingCard
                            title="Scale"
                            description="For teams dominating a region."
                            price={isYearly ? "$159" : "$199"}
                            period="per month"
                            buttonText="Contact Sales"
                            buttonVariant="secondary"
                            features={[
                                { text: "Unlimited Monitors", included: true },
                                { text: "Real-time Intelligence Stream", included: true },
                                { text: "Full Market Analysis", included: true },
                                { text: "Unlimited Team Members", included: true },
                                { text: "Priority 24/7 Support", included: true },
                                { text: "API Access", included: true },
                            ]}
                        />
                    </div>

                    <FAQ />
                </div>
            </main>

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
                                    <li><Link to="/terms" className="text-gray-500 hover:text-white transition-colors">Terms</Link></li>
                                    <li><Link to="/privacy" className="text-gray-500 hover:text-white transition-colors">Privacy</Link></li>
                                    <li><Link to="/cookies" className="text-gray-500 hover:text-white transition-colors">Cookies</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Product</h4>
                                <ul className="space-y-2 text-sm">
                                    <li><Link to="/pricing" className="text-gray-500 hover:text-white transition-colors">Pricing</Link></li>
                                    <li><Link to="/auth" className="text-gray-500 hover:text-white transition-colors">Login</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
