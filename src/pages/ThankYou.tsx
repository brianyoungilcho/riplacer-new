import { Check, ArrowRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

interface ThankYouState {
  email?: string;
  targetAccount?: string;
}

export default function ThankYou() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const state = (location.state as ThankYouState) || {};
  const email = state.email || 'your inbox';
  const targetAccount = state.targetAccount || 'your target';

  // Clear onboarding progress from localStorage
  useEffect(() => {
    localStorage.removeItem('riplacer_onboarding_progress');
  }, []);

  const handleGoToDashboard = () => {
    // Navigate to dashboard within same app
    navigate('/app');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-8 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          You're all set!
        </h1>
        <p className="text-gray-600 mb-8">
          Check <span className="font-medium text-gray-900">{email}</span> in the next 15-30 minutes
          for your first briefing on <span className="font-medium text-gray-900">{targetAccount}</span>.
        </p>

        <div className="bg-gray-50 rounded-xl p-6 text-left mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">While you wait</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>Check your spam folder just in case.</li>
            <li>Add hello@riplacer.com to your contacts.</li>
            <li>Your briefing will include actionable intel on {targetAccount}.</li>
            {user && <li>Explore your dashboard to track progress and insights.</li>}
          </ul>
        </div>

        {user && (
          <Button
            onClick={handleGoToDashboard}
            variant="glow"
            size="lg"
            className="w-full mb-4 h-14 text-base font-semibold"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}

        <Link to="/" className="text-sm text-gray-500 hover:text-primary transition-colors">
          &larr; Back to homepage
        </Link>
      </div>
    </div>
  );
}
