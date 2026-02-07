import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingHeader } from './OnboardingHeader';
import { StepWhatYouSell } from './StepWhatYouSell';
import { StepWhereYouSell } from './StepWhereYouSell';
import { StepWhoYouSellTo } from './StepWhoYouSellTo';
import { StepCompetitors } from './StepCompetitors';
import { StepTargetAccount } from './StepTargetAccount';
import { StepAdditionalContext } from './StepAdditionalContext';
import { StepResults } from './StepResults';
import { Crosshair, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface OnboardingData {
  // Step 1
  productDescription: string;
  companyName?: string;
  companyDomain?: string;

  // Step 2
  region?: string;
  states: string[];
  cities: string[];
  territoryDescription?: string;
  isCustomTerritory?: boolean; // true if user described territory instead of selecting states

  // Step 3
  targetCategories: string[];

  // Step 4
  competitors: string[];

  // Step 5
  targetAccount?: string;

  // Step 6
  additionalContext?: string;

  // Step 7
  email?: string;

  // Filters (derived from selections)
  filters: string[];
}

const initialData: OnboardingData = {
  productDescription: '',
  states: [],
  cities: [],
  targetCategories: [],
  competitors: [],
  filters: [],
};

export function OnboardingPage() {
  const { user, loading: authLoading, sendMagicLink } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Track previous step to detect when user goes back to modify product
  const prevStepRef = useRef<number>(1);

  // Load saved progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('riplacer_onboarding_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const loadedData = parsed.data || initialData;
        const loadedStep = parsed.step || 1;
        setData(loadedData);
        setStep(loadedStep);
        // Initialize refs with loaded data
        prevStepRef.current = loadedStep;
      } catch (e) {
        console.error('Failed to parse saved onboarding progress:', e);
      }
    }
  }, []);

  // Debounced localStorage save to prevent blocking main thread
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce localStorage writes by 500ms
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('riplacer_onboarding_progress', JSON.stringify({ data, step }));
      } catch (err) {
        console.error('Failed to save to localStorage:', err);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, step]);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // Detect when user navigates back to step 1 from a later step
  useEffect(() => {
    const prevStep = prevStepRef.current;

    // If user navigated back to step 1 from step 2+
    if (step === 1 && prevStep > 1) {
      console.log('🔄 [Frontend] User navigated back to step 1 from step', prevStep);
    }

    prevStepRef.current = step;
  }, [step, updateData]);

  const nextStep = useCallback(() => {
    setStep(prev => Math.min(prev + 1, 7));
  }, []);

  const prevStep = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleSubmit = useCallback(async (email: string) => {
    setIsSaving(true);

    try {
      const submission = {
        ...data,
        email,
        submittedAt: new Date().toISOString(),
      };

      updateData({ email });
      localStorage.setItem('riplacer_onboarding_submission', JSON.stringify(submission));

      const { error: pendingError } = await supabase
        .from('pending_onboarding')
        .upsert(
          {
            email,
            data: submission,
          },
          { onConflict: 'email', returning: 'minimal' }
        );

      if (pendingError) {
        console.error('Failed to save onboarding data:', pendingError);
        const details = pendingError.message || pendingError.code || 'Unknown error';
        toast.error(`Could not save your onboarding data: ${details}`);
        setIsSaving(false);
        return;
      }

      // If user is already logged in, go directly to thank-you
      if (user) {
        navigate('/thank-you', { state: { email, targetAccount: data.targetAccount } });
        return;
      }

      const { error: authError } = await sendMagicLink(email, window.location.origin + '/thank-you');

      if (authError) throw authError;

      navigate('/verification-pending', { state: { email, targetAccount: data.targetAccount } });
    } catch (error) {
      console.error('Failed to submit onboarding:', error);
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [data, navigate, updateData, user]);

  // Redirect logged-in users who have a research request to dashboard
  useEffect(() => {
    const redirectToDashboard = async () => {
      if (!authLoading && user) {
        const { data: existingRequest } = await supabase
          .from('research_requests')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (existingRequest) {
          window.location.href = '/app';
        }
      }
    };

    redirectToDashboard();
  }, [user, authLoading]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Unified layout for onboarding only
  const showFullHeader = step >= 2;

  // Onboarding steps for sidebar
  const onboardingSteps = [
    { num: 1, label: 'Product' },
    { num: 2, label: 'Territory' },
    { num: 3, label: 'Buyers' },
    { num: 4, label: 'Competitors' },
    { num: 5, label: 'Target' },
    { num: 6, label: 'Context' },
    { num: 7, label: 'Review' },
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden w-full">
      {/* Collapsible Sidebar - SAME SHELL, different menu items */}
      <aside className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 relative",
        sidebarExpanded ? "w-64" : "w-16"
      )}>
        <div className={cn(
          "flex flex-col h-full py-4",
          sidebarExpanded ? "items-stretch px-0" : "items-center px-0"
        )}>
          {/* Logo and App Name */}
          <div className={cn(
            "flex items-center mb-6",
            sidebarExpanded ? "px-4 gap-2.5" : "justify-center"
          )}>
            <Link
              to="/"
              className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0"
              title="Go to Home"
            >
              <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
            </Link>
            {sidebarExpanded && (
              <span className="font-bold text-xl tracking-tight text-gray-900">
                Riplacer
              </span>
            )}
          </div>

          {/* Menu Items */}
          <div className={cn(
            "flex-1",
            sidebarExpanded ? "w-full px-4" : "w-full flex flex-col items-center"
          )}>
            <nav className={cn(
              sidebarExpanded ? "space-y-1" : "space-y-2 flex flex-col items-center"
            )}>
              {onboardingSteps.map((item) => {
                const isClickable = item.num <= step;
                const isCurrentStep = step === item.num;

                return (
                  <button
                    key={item.num}
                    onClick={() => {
                      if (isClickable) {
                        setStep(item.num);
                      }
                    }}
                    disabled={!isClickable}
                    className={cn(
                      "transition-all duration-200 w-full text-left",
                      sidebarExpanded
                        ? "flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                        : "w-8 h-8 flex items-center justify-center rounded-md",
                      isClickable
                        ? "hover:bg-gray-50 cursor-pointer"
                        : "cursor-not-allowed opacity-50",
                      isCurrentStep && sidebarExpanded
                        ? "bg-primary/10 text-primary font-medium"
                        : ""
                    )}
                    title={sidebarExpanded ? undefined : item.label}
                  >
                    <div className={cn(
                      "rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all",
                      sidebarExpanded ? "w-6 h-6" : "w-7 h-7",
                      isCurrentStep
                        ? "bg-primary text-white shadow-sm"
                        : item.num < step
                          ? sidebarExpanded
                            ? "bg-gray-200 text-gray-700"
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                          : sidebarExpanded
                            ? "bg-gray-100 text-gray-400"
                            : "bg-transparent text-gray-300 border border-gray-200"
                    )}>
                      {item.num}
                    </div>
                    {sidebarExpanded && (
                      <span className={cn(
                        "truncate",
                        isCurrentStep
                          ? "text-primary font-medium"
                          : item.num < step
                            ? "text-gray-700"
                            : "text-gray-400"
                      )}>{item.label}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="absolute top-16 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 hover:shadow-md transition-all z-10"
          aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarExpanded ? (
            <ChevronLeft className="w-3 h-3 text-gray-600" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-600" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-full overflow-x-hidden">
        {/* Header */}
        {showFullHeader && (
          <OnboardingHeader
            data={data}
            step={step}
            user={user}
            onEditTerritory={() => {
              setStep(2);
            }}
            onEditBuyers={() => {
              setStep(3);
            }}
          />
        )}

        {/* Content Area */}
        <div className={cn(
          "flex-1 flex min-h-0 relative z-0"
        )}>
          {/* Background pattern - only for onboarding non-step-1 screens */}
          {step !== 1 && (
            <div className="dotted-bg dotted-bg-gentle-float" />
          )}

          {/* Content */}
          <div className="flex-1 flex flex-col relative z-10 w-full">
            {step === 1 && (
              <StepWhatYouSell
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}
            {step === 2 && (
              <StepWhereYouSell
                data={data}
                updateData={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {step === 3 && (
              <StepWhoYouSellTo
                data={data}
                updateData={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {step === 4 && (
              <StepCompetitors
                data={data}
                updateData={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {step === 5 && (
              <StepTargetAccount
                data={data}
                updateData={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {step === 6 && (
              <StepAdditionalContext
                data={data}
                updateData={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {step === 7 && (
              <StepResults
                data={data}
                onComplete={handleSubmit}
                onBack={prevStep}
                onEditStep={(targetStep) => setStep(targetStep)}
                isSaving={isSaving}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default OnboardingPage;
