import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Crosshair, Mail, Lock, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { isAppSubdomain, redirectToApp, getMainUrl, getAppUrl } from '@/lib/domain';
import { supabase } from '@/integrations/supabase/client';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Detect redirect loops: if we redirected to app subdomain recently and came back, don't redirect again
const REDIRECT_LOOP_KEY = 'riplacer_last_redirect_to_app';
const REDIRECT_LOOP_THRESHOLD_MS = 5000; // 5 seconds

function isInRedirectLoop(): boolean {
  const lastRedirect = sessionStorage.getItem(REDIRECT_LOOP_KEY);
  if (!lastRedirect) return false;

  const timeSinceLastRedirect = Date.now() - parseInt(lastRedirect, 10);
  return timeSinceLastRedirect < REDIRECT_LOOP_THRESHOLD_MS;
}

function markRedirectToApp(): void {
  sessionStorage.setItem(REDIRECT_LOOP_KEY, Date.now().toString());
}

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const onAppSubdomain = isAppSubdomain();
  const hasRedirected = useRef(false);

  // Check if user came from /start or has onboarding progress
  const getReturnPath = () => {
    // On app subdomain, always go to dashboard (root)
    if (onAppSubdomain) {
      return '/';
    }

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

    return '/';
  };

  const returnPath = getReturnPath();

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) {
      return;
    }

    if (user) {
      hasRedirected.current = true;

      if (onAppSubdomain) {
        // Already on app subdomain, just navigate to dashboard
        navigate('/');
      } else {
        // On main domain - if returning to /start, stay on main domain
        if (returnPath === '/start') {
          navigate('/start');
        } else {
          // Check for redirect loop BEFORE redirecting to app subdomain
          if (isInRedirectLoop()) {
            console.log('[Auth] Detected redirect loop, staying on main domain');
            // Reset the redirect flag so user can try again after a moment
            hasRedirected.current = false;
            return;
          }
          // Redirect to app subdomain with session transfer
          handleRedirectToApp();
        }
      }
    }
  }, [user, navigate, returnPath, onAppSubdomain]);

  const handleRedirectToApp = async () => {
    // Mark the timestamp so we can detect loops
    markRedirectToApp();

    // Get current session to transfer
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      redirectToApp('/', {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    } else {
      // Fallback: just redirect without session (will need to re-auth)
      redirectToApp('/');
    }
  };


  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') fieldErrors.email = err.message;
          if (err.path[0] === 'password') fieldErrors.password = err.message;
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
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        let message = error.message;

        // Handle common error cases
        if (error.message.includes('User already registered')) {
          message = 'This email is already registered. Try signing in instead.';
        } else if (error.message.includes('Invalid login credentials')) {
          message = 'Invalid email or password. Please try again.';
        }

        toast({
          title: 'Authentication Error',
          description: message,
          variant: 'destructive',
        });
      } else {
        // Clear any previous redirect loop marker on successful auth
        sessionStorage.removeItem(REDIRECT_LOOP_KEY);

        toast({
          title: isSignUp ? 'Account created!' : 'Welcome back!',
          description: isSignUp ? 'Your account has been created successfully.' : 'You have been signed in.',
        });
        // Redirect is handled by the useEffect above when user state changes
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



  // Extract company domain from email for display
  const emailDomain = email.includes('@') ? email.split('@')[1] : null;

  // Back link depends on domain
  const backLink = onAppSubdomain ? getMainUrl() : (returnPath === '/start' ? '/start' : '/');
  const backLinkText = onAppSubdomain ? 'Back to homepage' : (returnPath === '/start' ? 'Back to setup' : 'Back to home');
  const isExternalBackLink = onAppSubdomain;

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          {/* Back button - returns to /start if user came from there */}
          {isExternalBackLink ? (
            <a
              href={backLink}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLinkText}
            </a>
          ) : (
            <Link
              to={backLink}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLinkText}
            </Link>
          )}

          {/* Logo */}
          {onAppSubdomain ? (
            <a
              href={getMainUrl()}
              className="flex items-center gap-2.5 mb-10"
              aria-label="Riplacer home"
            >
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-2xl tracking-tight text-gray-900">Riplacer</span>
            </a>
          ) : (
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
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isSignUp ? 'Start winning deals' : 'Welcome back'}
            </h1>
            <p className="text-gray-600">
              {isSignUp
                ? 'Create your account to find rip & replace opportunities'
                : 'Sign in to continue hunting your competition'}
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
              {isSignUp && emailDomain && !errors.email && (
                <p className="text-sm text-gray-500">
                  We'll analyze <span className="font-medium text-gray-700">{emailDomain}</span> to understand what you sell
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 text-base border-gray-200 focus:border-primary focus:ring-primary"
                  required
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
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
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>


          </form>

          {/* Toggle sign up/in */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrors({});
              }}
              className="text-sm text-gray-600 hover:text-primary transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
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
