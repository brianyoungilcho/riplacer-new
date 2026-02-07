import { Check, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ThankYouState {
  email?: string;
  targetAccount?: string;
}

type PendingOnboarding = {
  email: string;
  data: {
    productDescription: string;
    companyName?: string;
    companyDomain?: string;
    states?: string[];
    targetCategories?: string[];
    competitors?: string[];
    targetAccount?: string;
    additionalContext?: string;
  };
};

export default function ThankYou() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const state = (location.state as ThankYouState) || {};
  const [pendingOnboarding, setPendingOnboarding] = useState<PendingOnboarding | null>(null);
  const email = state.email || pendingOnboarding?.email || 'your inbox';
  const targetAccount = state.targetAccount || pendingOnboarding?.data?.targetAccount || 'your target';
  const [isStartingResearch, setIsStartingResearch] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const hasAttemptedStart = useRef(false);

  // Clear onboarding progress from localStorage
  useEffect(() => {
    localStorage.removeItem('riplacer_onboarding_progress');
  }, []);

  const handleGoToDashboard = useCallback(async () => {
    window.location.href = '/app';
  }, []);

  useEffect(() => {
    if (!user || isStartingResearch || hasAttemptedStart.current) return;

    const startResearch = async () => {
      hasAttemptedStart.current = true;
      setIsStartingResearch(true);
      setStartError(null);

      try {
        if (!user?.email) {
          setStartError('We could not verify your session. Please sign in again.');
          setIsStartingResearch(false);
          return;
        }

        const { data: pendingData, error: pendingError } = await supabase
          .from('pending_onboarding')
          .select('email, data')
          .eq('email', user.email)
          .limit(1);

        const pending = pendingData?.[0] || null;

        if (pendingError || !pending) {
          // Check for existing request to handle page reloads gracefully
          const { data: existingRequest } = await supabase
            .from('research_requests')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

          if (existingRequest && existingRequest.length > 0) {
            await handleGoToDashboard();
            return;
          }

          console.error('Failed to load pending onboarding:', pendingError);
          setStartError('We could not find your onboarding data. Please complete onboarding again.');
          setIsStartingResearch(false);
          return;
        }

        setPendingOnboarding(pending);

        const submission = pending.data;
        const { data: request, error: insertError } = await supabase
          .from('research_requests')
          .insert({
            user_id: user.id,
            product_description: submission.productDescription,
            company_name: submission.companyName || null,
            company_domain: submission.companyDomain || null,
            territory_states: submission.states || [],
            target_categories: submission.targetCategories || [],
            competitors: submission.competitors || [],
            target_account: submission.targetAccount,
            additional_context: submission.additionalContext || null,
            status: 'pending',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Failed to create research request:', insertError);
          setStartError('We could not start your research. Please try again or contact support.');
          toast.error('We could not start your research. Please try again.');
          setIsStartingResearch(false);
          return;
        }

        const { error: invokeError } = await supabase.functions.invoke('research-target-account', {
          body: { requestId: request.id },
        });

        if (invokeError) {
          console.error('Failed to invoke research function:', invokeError);
          setStartError('We could not queue your research yet. Please try again in a moment.');
          toast.error('We could not queue your research yet. Please try again.');
          setIsStartingResearch(false);
          return;
        }

        const { error: deleteError } = await supabase
          .from('pending_onboarding')
          .delete()
          .eq('email', user.email);

        if (deleteError) {
          console.error('Failed to delete pending onboarding:', deleteError);
        }

        await handleGoToDashboard();
      } catch (error) {
        console.error('Failed to start research:', error);
        setStartError('We could not start your research. Please try again.');
        toast.error('We could not start your research. Please try again.');
        setIsStartingResearch(false);
      }
    };

    startResearch();
  }, [user, isStartingResearch, handleGoToDashboard]);

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
          We're compiling your briefing on <span className="font-medium text-gray-900">{targetAccount}</span>.
          You can view the report in your dashboard once it's ready.
        </p>

        <div className="bg-gray-50 rounded-xl p-6 text-left mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">While you wait</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>Check your spam folder just in case.</li>
            <li>Add hello@riplacer.com to your contacts.</li>
            <li>Your report will include actionable intel on {targetAccount}.</li>
            {user && <li>Explore your dashboard to track progress and insights.</li>}
          </ul>
        </div>

        {startError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-6 space-y-3">
            <p>{startError}</p>
            <Link to="/start" className="text-sm text-red-700 underline hover:text-red-800">
              Restart onboarding
            </Link>
          </div>
        )}

        {user && (
          <Button
            onClick={handleGoToDashboard}
            variant="glow"
            size="lg"
            className="w-full mb-4 h-14 text-base font-semibold"
            disabled={isStartingResearch}
          >
            {isStartingResearch ? 'Preparing your report...' : 'Go to Dashboard'}
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
