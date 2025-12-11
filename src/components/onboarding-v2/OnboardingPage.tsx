import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingHeader } from './OnboardingHeader';
import { StepWhatYouSell } from './StepWhatYouSell';
import { StepWhereYouSell } from './StepWhereYouSell';
import { StepWhoYouSellTo } from './StepWhoYouSellTo';
import { StepCompetitors } from './StepCompetitors';
import { StepResults } from './StepResults';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { OnboardingMap } from './OnboardingMap';
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
  
  // Step 3
  targetCategories: string[];
  
  // Step 4
  competitors: string[];
  
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
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false); // Track workspace mode
  const [workspaceSidebarExpanded, setWorkspaceSidebarExpanded] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(true); // Map panel visibility

  // Load saved progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('riplacer_onboarding_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed.data || initialData);
        setStep(parsed.step || 1);
        // Also check if already launched
        if (parsed.isLaunched) {
          setIsLaunched(true);
        }
      } catch (e) {
        console.error('Failed to parse saved onboarding progress:', e);
      }
    }
  }, []);

  // Save progress to localStorage on data/step change
  useEffect(() => {
    localStorage.setItem('riplacer_onboarding_progress', JSON.stringify({ data, step, isLaunched }));
  }, [data, step, isLaunched]);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    setStep(prev => Math.min(prev + 1, 5));
  }, []);

  const prevStep = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 1));
  }, []);

  // Handle launching the search (transitions to workspace mode)
  const handleLaunch = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Save to localStorage first
      localStorage.setItem('riplacer_onboarding', JSON.stringify(data));
      
      // If user is logged in, save to database
      if (user) {
        // Save profile data
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            product_description: data.productDescription,
            competitor_names: data.competitors,
            onboarding_complete: true,
            onboarding_data: data as any,
          })
          .eq('id', user.id);

        if (profileError) {
          console.error('Failed to save profile:', profileError);
        }

        // Save territory data
        const { error: territoryError } = await supabase
          .from('user_territories')
          .upsert({
            user_id: user.id,
            region: data.region || null,
            states: data.states,
            cities: data.cities,
            description: data.territoryDescription || null,
          }, {
            onConflict: 'user_id',
          });

        if (territoryError) {
          console.error('Failed to save territory:', territoryError);
        }

        // Save categories
        if (data.targetCategories.length > 0) {
          await supabase
            .from('user_categories')
            .delete()
            .eq('user_id', user.id);

          const categoryInserts = data.targetCategories.map(cat => ({
            user_id: user.id,
            category_id: cat,
            category_name: cat,
          }));

          const { error: categoryError } = await supabase
            .from('user_categories')
            .insert(categoryInserts);

          if (categoryError) {
            console.error('Failed to save categories:', categoryError);
          }
        }

        // Save competitors
        if (data.competitors.length > 0) {
          await supabase
            .from('user_competitors')
            .delete()
            .eq('user_id', user.id);

          const competitorInserts = data.competitors.map(comp => ({
            user_id: user.id,
            competitor_name: comp,
          }));

          const { error: competitorError } = await supabase
            .from('user_competitors')
            .insert(competitorInserts);

          if (competitorError) {
            console.error('Failed to save competitors:', competitorError);
          }
        }
      }
      
      // Transition to workspace mode
      setIsLaunched(true);
      toast.success('Finding prospects...');
    } catch (error) {
      console.error('Failed to launch:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [data, user]);

  // Handle editing criteria from workspace mode
  const handleEditCriteria = useCallback((targetStep: number) => {
    setIsLaunched(false);
    setStep(targetStep);
  }, []);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Workspace mode (after launching)
  if (isLaunched) {
    return (
      <div className="h-screen bg-gray-50 flex overflow-hidden">
        <WorkspaceSidebar 
          data={data}
          user={user}
          onEditCriteria={handleEditCriteria}
          expanded={workspaceSidebarExpanded}
          onToggleExpand={() => setWorkspaceSidebarExpanded(!workspaceSidebarExpanded)}
        />
        <main className="flex-1 flex min-w-0 overflow-hidden">
          {/* Prospect List */}
          <div className={cn(
            "flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300",
            mapExpanded ? "" : "flex-1"
          )}>
            <StepResults 
              data={data}
              updateData={updateData}
              onComplete={() => {}} // No longer used in workspace mode
              onBack={() => setIsLaunched(false)}
              isSaving={isSaving}
              isWorkspaceMode={true}
            />
          </div>
          
          {/* Map Panel - Collapsible */}
          <div className={cn(
            "border-l border-gray-200 bg-gray-100 relative transition-all duration-300 flex flex-col",
            mapExpanded ? "w-1/2" : "w-0"
          )}>
            {/* Map Toggle Button */}
            <button
              onClick={() => setMapExpanded(!mapExpanded)}
              className={cn(
                "absolute top-4 z-20 w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50 hover:shadow-md transition-all",
                mapExpanded ? "left-4" : "-left-10"
              )}
              aria-label={mapExpanded ? 'Hide map' : 'Show map'}
            >
              {mapExpanded ? (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              )}
            </button>
            
            {mapExpanded && (
              <div className="flex-1 min-h-0">
                <OnboardingMap data={data} step={5} />
              </div>
            )}
          </div>
          
          {/* Collapsed Map Toggle Button (when map is hidden) */}
          {!mapExpanded && (
            <div className="w-12 border-l border-gray-200 bg-gray-50 flex flex-col items-center py-4">
              <button
                onClick={() => setMapExpanded(true)}
                className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50 hover:shadow-md transition-all"
                aria-label="Show map"
                title="Show map"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-xs text-gray-500 mt-2 writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
                Map View
              </span>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Onboarding mode
  const showMap = step >= 3;
  const showFullHeader = step >= 2;

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Collapsible Sidebar */}
      <aside className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 relative",
        sidebarExpanded ? "w-64" : "w-16"
      )}>
        <div className={cn(
          "flex flex-col h-full py-6",
          sidebarExpanded ? "items-stretch px-0" : "items-center px-0"
        )}>
          {/* Logo and App Name */}
          <div className={cn(
            "flex items-center mb-8",
            sidebarExpanded ? "px-4 gap-2.5" : "justify-center"
          )}>
            <Link 
              to={user ? '/discover' : '/'}
              className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0"
              title={user ? 'Go to Dashboard' : 'Go to Home'}
            >
              <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
            </Link>
            {sidebarExpanded && (
              <span className="font-bold text-xl tracking-tight text-gray-900">
                Riplacer
              </span>
            )}
          </div>
          
          {/* Step indicator */}
          <div className={cn(
            "flex-1",
            sidebarExpanded ? "w-full px-4" : "w-full flex flex-col items-center"
          )}>
            <nav className={cn(
              sidebarExpanded ? "space-y-2" : "space-y-2 flex flex-col items-center"
            )}>
              {[
                { num: 1, label: 'Product' },
                { num: 2, label: 'Territory' },
                { num: 3, label: 'Buyers' },
                { num: 4, label: 'Competitors' },
                { num: 5, label: 'Launch' },
              ].map((item) => {
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
          className="absolute top-20 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 hover:shadow-md transition-all z-10"
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        {showFullHeader && (
          <OnboardingHeader 
            data={data} 
            step={step}
            user={user}
          />
        )}

        {/* Content Area */}
        <div className={cn(
          "flex-1 flex min-h-0 relative",
          step === 1 ? "" : !showMap && "items-center justify-center"
        )}>
          {/* Background pattern */}
          {!showMap && step !== 1 && (
            <div 
              className="absolute inset-0 opacity-[0.03] pointer-events-none" 
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} 
            />
          )}
          
          {/* Left Panel - Questions */}
          <div className={cn(
            "transition-all duration-300 flex flex-col relative z-10",
            step === 1 
              ? "w-full"
              : showMap 
                ? "w-1/2 border-r border-gray-200 overflow-y-auto" 
                : "w-full max-w-2xl mx-auto px-8"
          )}>
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
              <StepResults 
                data={data}
                updateData={updateData}
                onComplete={handleLaunch}
                onBack={prevStep}
                isSaving={isSaving}
                isWorkspaceMode={false}
              />
            )}
          </div>

          {/* Right Panel - Map */}
          {showMap && (
            <div className="w-1/2 bg-gray-100 relative min-w-0 overflow-hidden">
              <OnboardingMap data={data} step={step} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default OnboardingPage;
