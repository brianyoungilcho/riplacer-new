import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Crosshair, Mail, Lock, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
        toast({
          title: isSignUp ? 'Account created!' : 'Welcome back!',
          description: isSignUp ? 'Your account has been created successfully.' : 'You have been signed in.',
        });
        navigate('/');
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

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          {/* Back to home */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-2xl tracking-tight text-gray-900">Riplacer</span>
          </div>

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
