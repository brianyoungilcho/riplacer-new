import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, Zap, ArrowRight, Menu, X } from 'lucide-react';

// Toggle component for billing period
function BillingToggle({
    isAnnual,
    onToggle
}: {
    isAnnual: boolean;
    onToggle: () => void
}) {
    return (
        <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-gray-500'}`}>
                Monthly
            </span>
            <button
                onClick={onToggle}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#0F1115] ${isAnnual ? 'bg-primary' : 'bg-gray-700'
                    }`}
                role="switch"
                aria-checked={isAnnual}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${isAnnual ? 'translate-x-8' : 'translate-x-1'
                        }`}
                />
            </button>
            <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-white' : 'text-gray-500'}`}>
                Annual <span className="text-green-400">(Save 20%)</span>
            </span>
        </div>
    );
}

// Pricing tier data
const pricingTiers = [
    {
        name: 'Free',
        description: 'Start with your most important account',
        accounts: 1,
        monthlyPrice: 0,
        annualPrice: 0,
        features: [
            '1 AI Agent for 1 Account',
            'Daily intelligence briefings',
            'Riplace Score tracking',
            'Source citations',
            'Forever free, no credit card',
        ],
        cta: 'Start Free',
        ctaLink: '/start',
        popular: false,
        highlight: false,
    },
    {
        name: 'Starter',
        description: 'Perfect for a focused territory',
        accounts: 5,
        monthlyPrice: 69,
        annualPrice: 59,
        features: [
            'Everything in Free, plus:',
            '5 AI Agents (5 accounts)',
            'Priority email alerts',
            'Stakeholder mapping',
            'Export to CRM',
        ],
        cta: 'Add More Accounts',
        ctaLink: '/start',
        popular: false,
        highlight: false,
    },
    {
        name: 'Growth',
        description: 'Scale across multiple territories',
        accounts: 15,
        monthlyPrice: 149,
        annualPrice: 129,
        features: [
            'Everything in Starter, plus:',
            '15 AI Agents (15 accounts)',
            'Deep competitive analysis',
            'Budget cycle tracking',
            'API access',
        ],
        cta: 'Scale Your Territory',
        ctaLink: '/start',
        popular: true,
        highlight: true,
    },
    {
        name: 'Pro',
        description: 'Dominate your entire region',
        accounts: 50,
        monthlyPrice: 349,
        annualPrice: 299,
        features: [
            'Everything in Growth, plus:',
            '50 AI Agents (50 accounts)',
            'Custom alert rules',
            'Account prioritization AI',
            'Priority support',
        ],
        cta: 'Dominate Your Region',
        ctaLink: '/start',
        popular: false,
        highlight: false,
    },
];

// Pricing card component
function PricingCard({
    tier,
    isAnnual,
}: {
    tier: typeof pricingTiers[0];
    isAnnual: boolean;
}) {
    const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
    const isFree = price === 0;

    return (
        <div
            className={`relative rounded-2xl p-8 transition-all duration-300 flex flex-col h-full ${tier.highlight
                ? 'bg-primary/10 border-2 border-primary shadow-[0_0_40px_rgba(220,38,38,0.15)]'
                : 'bg-white/[0.03] border border-white/10 hover:border-white/20'
                }`}
        >
            {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-wide shadow-lg whitespace-nowrap">
                        Most Popular
                    </span>
                </div>
            )}

            <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-sm text-gray-400 min-h-[40px]">{tier.description}</p>
            </div>

            <div className="mb-6">
                <div className="flex items-baseline gap-1 h-12">
                    {isFree ? (
                        <span className="text-4xl font-extrabold text-white">Free</span>
                    ) : (
                        <>
                            <span className="text-4xl font-extrabold text-white">${price}</span>
                            <span className="text-gray-400">/mo</span>
                        </>
                    )}
                </div>
                <div className="h-10">
                    {!isFree && isAnnual ? (
                        <p className="text-sm text-green-400 mt-1">
                            ${(tier.annualPrice * 12).toLocaleString()}/year (save ${((tier.monthlyPrice - tier.annualPrice) * 12).toLocaleString()})
                        </p>
                    ) : (
                        <p className="text-sm text-transparent mt-1">&nbsp;</p>
                    )}
                    <p className="text-sm text-gray-500">
                        {tier.accounts} {tier.accounts === 1 ? 'account' : 'accounts'} monitored
                    </p>
                </div>
            </div>

            <div className="mt-auto">
                <Link to={tier.ctaLink}>
                    <Button
                        variant={tier.highlight ? 'glow' : 'outline-power'}
                        className="w-full mb-6"
                        size="lg"
                    >
                        {tier.cta}
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </Link>

                <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <Check className={`w-5 h-5 shrink-0 mt-0.5 ${tier.highlight ? 'text-primary' : 'text-green-500'}`} />
                            <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// FAQ data
const faqs = [
    {
        question: 'What exactly is an "AI Agent"?',
        answer: 'Each AI Agent is dedicated to one target account. It monitors all public records, meeting minutes, news, and budget data for that account 24/7, sending you intelligence when something relevant happens.',
    },
    {
        question: 'Can I change which account my agent monitors?',
        answer: "Yes! You can reassign an agent to a new account anytime. Perfect for when you win an account or need to shift focus to a different target.",
    },
    {
        question: 'Why is the free plan actually free?',
        answer: "We believe the best way to show value is to deliver it first. When your agent helps you win your first deal, you'll want agents for your entire territory.",
    },
    {
        question: 'What if I need more than 50 accounts?',
        answer: 'Contact us for Enterprise pricing. We work with sales teams monitoring hundreds of accounts across multiple territories.',
    },
    {
        question: 'Can I cancel anytime?',
        answer: 'Absolutely. No long-term contracts. Cancel anytime and your agents will keep working until the end of your billing period.',
    },
];

// FAQ component
function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
                <div key={index} className="border-b border-white/10">
                    <button
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        className="w-full py-6 flex items-center justify-between text-left"
                    >
                        <span className="text-lg font-medium text-white pr-8">{faq.question}</span>
                        <span className={`text-primary transition-transform duration-300 ${openIndex === index ? 'rotate-45' : ''}`}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </span>
                    </button>
                    <div
                        className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-48 pb-6' : 'max-h-0'
                            }`}
                    >
                        <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Pricing() {
    const [isAnnual, setIsAnnual] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#0F1115]">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0F1115]/95 backdrop-blur-md border-b border-white/5">
                <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
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
                            <Link to="/auth">
                                <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5">
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
                            <Link to="/start" onClick={() => setIsMenuOpen(false)}>
                                <Button variant="glow" className="w-full justify-between">
                                    Get Started
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero */}
            <section className="pt-32 pb-8 text-center">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm mb-6">
                        <span className="text-primary font-bold uppercase tracking-wide text-xs">Simple Pricing</span>
                        <span className="text-gray-400 ml-2 text-xs">Pay only for the accounts you monitor</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
                        Your AI Chief of Staff.
                        <br />
                        <span className="text-primary">One Free Agent. Forever.</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                        Pick your best target account. We'll read every meeting, track every vote, and tell you when to strike.
                    </p>
                </div>
            </section>

            {/* Billing Toggle */}
            <section className="py-4">
                <BillingToggle isAnnual={isAnnual} onToggle={() => setIsAnnual(!isAnnual)} />
            </section>

            {/* Pricing Cards */}
            <section className="py-8 pb-24">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto items-stretch">
                        {pricingTiers.map((tier) => (
                            <PricingCard key={tier.name} tier={tier} isAnnual={isAnnual} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Enterprise CTA */}
            <section className="py-16 border-t border-white/10">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                            Need more than 50 accounts?
                        </h2>
                        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                            We offer custom Enterprise plans for sales teams monitoring hundreds of accounts across multiple territories. Get volume discounts, team dashboards, SSO, and dedicated support.
                        </p>
                        <Button variant="outline-power" size="lg">
                            Contact Sales
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Feature Comparison */}
            <section className="py-16 border-t border-white/10">
                <div className="container mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
                        Compare Plans
                    </h2>
                    <div className="max-w-5xl mx-auto overflow-x-auto">
                        <table className="w-full min-w-[640px]">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-4 px-4 text-gray-400 font-medium">Feature</th>
                                    <th className="text-center py-4 px-4 text-white font-semibold">Free</th>
                                    <th className="text-center py-4 px-4 text-white font-semibold">Starter</th>
                                    <th className="text-center py-4 px-4 text-primary font-semibold">Growth</th>
                                    <th className="text-center py-4 px-4 text-white font-semibold">Pro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { feature: 'AI Agents (Accounts)', free: '1', starter: '5', growth: '15', pro: '50' },
                                    { feature: 'Daily Briefings', free: true, starter: true, growth: true, pro: true },
                                    { feature: 'Riplace Score', free: true, starter: true, growth: true, pro: true },
                                    { feature: 'Source Citations', free: true, starter: true, growth: true, pro: true },
                                    { feature: 'Priority Alerts', free: false, starter: true, growth: true, pro: true },
                                    { feature: 'Stakeholder Mapping', free: 'Basic', starter: 'Full', growth: 'Full', pro: 'Full' },
                                    { feature: 'CRM Export', free: false, starter: true, growth: true, pro: true },
                                    { feature: 'Competitive Analysis', free: false, starter: false, growth: true, pro: true },
                                    { feature: 'Budget Cycle Tracking', free: false, starter: false, growth: true, pro: true },
                                    { feature: 'API Access', free: false, starter: false, growth: true, pro: true },
                                    { feature: 'Custom Alert Rules', free: false, starter: false, growth: false, pro: true },
                                    { feature: 'Priority Support', free: false, starter: false, growth: false, pro: true },
                                ].map((row, index) => (
                                    <tr key={index} className="border-b border-white/5">
                                        <td className="py-4 px-4 text-gray-300">{row.feature}</td>
                                        {['free', 'starter', 'growth', 'pro'].map((plan) => {
                                            const value = row[plan as keyof typeof row];
                                            return (
                                                <td key={plan} className={`text-center py-4 px-4 ${plan === 'growth' ? 'bg-primary/5' : ''}`}>
                                                    {typeof value === 'boolean' ? (
                                                        value ? (
                                                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                                                        ) : (
                                                            <span className="text-gray-600">—</span>
                                                        )
                                                    ) : (
                                                        <span className={plan === 'growth' ? 'text-primary font-semibold' : 'text-gray-300'}>
                                                            {value}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-24 border-t border-white/10">
                <div className="container mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
                        Frequently Asked Questions
                    </h2>
                    <FAQ />
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-24 bg-gradient-to-br from-primary to-red-700 text-white">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">
                            Ready to get your first AI Agent?
                        </h2>
                        <p className="text-xl text-red-100 mb-10 max-w-2xl mx-auto">
                            Start with one account. No credit card required. Your agent will start researching in minutes.
                        </p>
                        <Link to="/start">
                            <Button
                                variant="secondary"
                                size="xl"
                                className="bg-white text-primary hover:bg-gray-100 shadow-xl"
                            >
                                Start Free
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-[#0F1115] text-white border-t border-white/5">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                        <div className="flex flex-col gap-3">
                            <Link to="/" className="flex items-center gap-2.5 w-fit">
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
