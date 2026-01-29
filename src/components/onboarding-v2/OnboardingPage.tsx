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
import { redirectToApp } from '@/lib/domain';

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
  suggestedCompetitors?: string[]; // AI-suggested competitors (from early research)
  competitorResearchLoading?: boolean; // true while fetching suggestions
  competitorResearchFailed?: boolean; // true if AI call succeeded but returned no competitors

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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  // Track previous step and product description to detect when user goes back to modify product
  const prevStepRef = useRef<number>(1);
  const prevProductDescriptionRef = useRef<string>('');

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
        prevProductDescriptionRef.current = loadedData.productDescription || '';
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
  // Clear competitor suggestions so they can be re-fetched if product changes
  useEffect(() => {
    const prevStep = prevStepRef.current;
    
    // If user navigated back to step 1 from step 2+
    if (step === 1 && prevStep > 1) {
      console.log('🔄 [Frontend] User navigated back to step 1 from step', prevStep, '- clearing competitor suggestions');
      updateData({ 
        suggestedCompetitors: undefined,
        competitorResearchLoading: false,
        competitorResearchFailed: false,
      });
    }
    
    prevStepRef.current = step;
  }, [step, updateData]);
  
  // Trigger early competitor research when Step 1 is completed
  // This runs in the background so suggestions are ready by Step 4
  // Also re-runs if product description changed after user went back to edit
  useEffect(() => {
    const triggerCompetitorResearch = async () => {
      // Trigger if:
      // 1. We just completed step 1 (now on step 2+)
      // 2. We have a product description
      // 3. Either:
      //    a. We haven't already loaded suggestions, OR
      //    b. The product description changed (user went back and modified it)
      // 4. We're not already loading
      const productDescriptionChanged = 
        prevProductDescriptionRef.current && 
        prevProductDescriptionRef.current !== data.productDescription;
      
      const shouldTrigger = 
        step >= 2 && 
        data.productDescription && 
        !data.competitorResearchLoading &&
        (!data.suggestedCompetitors || productDescriptionChanged);
      
      if (shouldTrigger) {
        // If product description changed, clear old suggestions first
        if (productDescriptionChanged) {
          console.log('🔄 [Frontend] Product description changed - clearing old competitor suggestions');
          updateData({ 
            suggestedCompetitors: undefined,
            competitorResearchLoading: true,
            competitorResearchFailed: false,
          });
        } else {
          updateData({ competitorResearchLoading: true });
        }
        
        try {
          console.log('🔍 [Frontend] Triggering competitor research for:', {
            productDescription: data.productDescription,
            companyDomain: data.companyDomain,
            productDescriptionChanged,
          });
          
          const { data: response, error } = await supabase.functions.invoke('research-competitors', {
            body: {
              productDescription: data.productDescription,
              companyDomain: data.companyDomain,
            }
          });
          
          if (error) {
            console.error('Competitor research API error:', error);
            updateData({ competitorResearchLoading: false });
            return;
          }
          
          console.log('✅ [Frontend] Competitor research response:', response);
          
          if (response?.competitors && Array.isArray(response.competitors) && response.competitors.length > 0) {
            updateData({ 
              suggestedCompetitors: response.competitors, 
              competitorResearchLoading: false,
              competitorResearchFailed: false,
            });
          } else {
            // Mark as finished (and possibly failed) so UI can communicate clearly
            updateData({ 
              competitorResearchLoading: false,
              competitorResearchFailed: !!response?.error,
            });
          }
          
        } catch (error) {
          console.error('Failed to fetch competitor suggestions:', error);
          updateData({ competitorResearchLoading: false });
        }
      }
      
      // Update the ref to track product description for next comparison
      if (data.productDescription) {
        prevProductDescriptionRef.current = data.productDescription;
      }
    };
    
    triggerCompetitorResearch();
  }, [step, data.productDescription, data.companyDomain, data.suggestedCompetitors, data.competitorResearchLoading, updateData]);

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

      const { error } = await supabase.functions.invoke('submit-onboarding', { body: submission });
      if (error) {
        console.error('Submit onboarding error:', error);
      }

      navigate('/thank-you', { state: { email, targetAccount: data.targetAccount } });
    } catch (error) {
      console.error('Failed to submit onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [data, navigate, updateData]);

  // Redirect logged-in users who have completed onboarding to dashboard
  useEffect(() => {
    const redirectToDashboard = async () => {
      if (!authLoading && user) {
        // Check if user has completed onboarding
        const submission = localStorage.getItem('riplacer_onboarding_submission');
        if (submission) {
          // User already completed onboarding, redirect to app subdomain with session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            redirectToApp('/', {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });
          } else {
            // Fallback: redirect without session
            redirectToApp('/');
          }
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
              to={user ? '/start' : '/'}
              onClick={(e) => {
                const targetPath = user ? '/start' : '/';
                if (location.pathname === targetPath) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                }
              }}
              className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0"
              title={user ? 'Go to Setup' : 'Go to Home'}
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
