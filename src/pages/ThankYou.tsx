import { Check, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCallback, useEffect, useState } from 'react';
import { redirectToApp } from '@/lib/domain';
import { supabase } from '@/integrations/supabase/client';

interface ThankYouState {
  email?: string;
  targetAccount?: string;
}

export default function ThankYou() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const state = (location.state as ThankYouState) || {};
  const submissionRaw = localStorage.getItem('riplacer_onboarding_submission');
  const submission = submissionRaw ? JSON.parse(submissionRaw) : null;
  const email = state.email || submission?.email || 'your inbox';
  const targetAccount = state.targetAccount || submission?.targetAccount || 'your target';
  const [isStartingResearch, setIsStartingResearch] = useState(false);

  // Clear onboarding progress from localStorage
  useEffect(() => {
    localStorage.removeItem('riplacer_onboarding_progress');
  }, []);

  const handleGoToDashboard = useCallback(async () => {
    // Redirect to app subdomain with session transfer
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      redirectToApp('/', {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    } else {
      // Fallback: redirect without session (will need to auth on app subdomain)
      redirectToApp('/');
    }
  }, []);

  useEffect(() => {
    if (!user || isStartingResearch) return;

    const startResearch = async () => {
      setIsStartingResearch(true);

      try {
        const submissionRaw = localStorage.getItem('riplacer_onboarding_submission');
        if (!submissionRaw) {
          await handleGoToDashboard();
          return;
        }

        const existingRequestId = localStorage.getItem('riplacer_research_request_id');
        if (existingRequestId) {
          await handleGoToDashboard();
          return;
        }

        const submission = JSON.parse(submissionRaw);
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
          await handleGoToDashboard();
          return;
        }

        localStorage.setItem('riplacer_research_request_id', request.id);

        await supabase.functions.invoke('research-target-account', {
          body: { requestId: request.id },
        });

        await handleGoToDashboard();
      } catch (error) {
        console.error('Failed to start research:', error);
        await handleGoToDashboard();
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
