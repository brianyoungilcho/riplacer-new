import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Crosshair, Mail, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export default function Login() {
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  const { sendMagicLink, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const hasRedirected = useRef(false);

  // Check if user came from /start or has onboarding progress
  const getReturnPath = () => {
    // Check URL state first (passed via navigate)
    const fromState = (location.state as { from?: string })?.from;
    if (fromState === '/start') {
      return fromState;
    }

    // Check if there's onboarding progress in localStorage
    const onboardingProgress = localStorage.getItem('riplacer_onboarding_progress');
    if (onboardingProgress) {
      try {
        const parsed = JSON.parse(onboardingProgress);
        if (parsed.step && parsed.step > 1) {
          return '/start';
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    return '/app';
  };

  const returnPath = getReturnPath();

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) {
      return;
    }

    if (user) {
      hasRedirected.current = true;
      if (returnPath === '/start') {
        navigate('/start');
      } else {
        navigate('/app');
      }
    }
  }, [user, navigate, returnPath]);

  const validateForm = () => {
    try {
      authSchema.parse({ email });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') fieldErrors.email = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error } = await sendMagicLink(email);

      if (error) {
        toast({
          title: 'Authentication Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setMagicLinkSent(true);
        toast({
          title: 'Check your email!',
          description: 'We sent you a magic link to sign in.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await sendMagicLink(email);
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Email resent!',
          description: 'Check your email for the new magic link.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Extract company domain from email for display
  const emailDomain = email.includes('@') ? email.split('@')[1] : null;

  // Back link depends on domain
  const backLink = returnPath === '/start' ? '/start' : '/';
  const backLinkText = returnPath === '/start' ? 'Back to setup' : 'Back to home';

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          {/* Back button - returns to /start if user came from there */}
          <Link
            to={backLink}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLinkText}
          </Link>

          {/* Logo */}
          <Link
            to="/"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2.5 mb-10"
            aria-label="Riplacer home"
          >
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-2xl tracking-tight text-gray-900">Riplacer</span>
          </Link>

          {!magicLinkSent ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Sign in to Riplacer
                </h1>
                <p className="text-gray-600">
                  Enter your work email to continue hunting your competition
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Work Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 text-base border-gray-200 focus:border-primary focus:ring-primary"
                      required
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="glow"
                  size="lg"
                  className="w-full h-12 text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue with email
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Check your email state */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Check your email
                </h1>
                <p className="text-gray-600">
                  We sent a magic link to <span className="font-medium text-gray-900">{email}</span>
                </p>
              </div>

              {/* Email info and actions */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6 text-left">
                  <h3 className="font-semibold text-gray-900 mb-3">Next steps</h3>
                  <ul className="space-y-3 text-sm text-gray-600">
                    <li className="flex gap-2">
                      <span className="w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                      Open the email from Riplacer
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                      Click the "Sign in" link
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                      You'll be redirected to your dashboard
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <Button onClick={handleResend} variant="outline" className="w-full text-center" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Resend magic link"
                    )}
                  </Button>

                  <div className="text-sm text-gray-500 text-left space-y-2">
                    <p>Check your spam folder if you don't see it.</p>
                    <button
                      onClick={() => setMagicLinkSent(false)}
                      className="text-primary hover:underline"
                    >
                      Use a different email →
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gray-900 relative overflow-hidden">
        {/* Red glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/30 blur-[150px] rounded-full" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <blockquote className="text-3xl font-bold text-white leading-tight mb-6">
            "Make your competitors<br />
            <span className="text-primary">uncomfortable.</span>"
          </blockquote>
          <p className="text-gray-400 text-lg max-w-md">
            Riplacer helps aggressive sales reps find and win accounts from their competition.
            No more cold calling blind.
          </p>

          {/* Stats */}
          <div className="flex gap-12 mt-12">
            <div>
              <div className="text-4xl font-black text-white">5min</div>
              <div className="text-sm text-gray-500">to first prospect</div>
            </div>
            <div>
              <div className="text-4xl font-black text-primary">100%</div>
              <div className="text-sm text-gray-500">public data</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}