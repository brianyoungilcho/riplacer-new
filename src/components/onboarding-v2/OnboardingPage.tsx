import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingHeader } from './OnboardingHeader';
import { StepWhatYouSell } from './StepWhatYouSell';
import { StepWhereYouSell } from './StepWhereYouSell';
import { StepWhoYouSellTo } from './StepWhoYouSellTo';
import { StepCompetitors } from './StepCompetitors';
import { StepResults } from './StepResults';
import { OnboardingMap } from './OnboardingMap';
import { DiscoveryTab, SavedLeadsTab, SettingsTab, type Prospect } from './workspace';
import { Crosshair, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, Star, Settings, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

type WorkspaceTab = 'discovery' | 'saved' | 'settings';

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
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false); // Track workspace mode
  const [mapExpanded, setMapExpanded] = useState(true); // Map panel visibility
  const [searchCriteriaExpanded, setSearchCriteriaExpanded] = useState(false); // Search criteria dropdown
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('discovery'); // Workspace tab
  const [mapProspects, setMapProspects] = useState<Prospect[]>([]); // Prospects for map markers
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null); // Selected prospect on map

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
  
  // Trigger early competitor research when Step 1 is completed
  // This runs in the background so suggestions are ready by Step 4
  useEffect(() => {
    const triggerCompetitorResearch = async () => {
      // Only trigger if:
      // 1. We just completed step 1 (now on step 2+)
      // 2. We have a product description
      // 3. We haven't already loaded suggestions
      // 4. We're not already loading
      if (
        step >= 2 && 
        data.productDescription && 
        !data.suggestedCompetitors && 
        !data.competitorResearchLoading
      ) {
        updateData({ competitorResearchLoading: true });
        
        try {
          console.log('🔍 [Frontend] Triggering competitor research for:', {
            productDescription: data.productDescription,
            companyDomain: data.companyDomain,
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
          
          if (response?.competitors && Array.isArray(response.competitors)) {
            updateData({ 
              suggestedCompetitors: response.competitors, 
              competitorResearchLoading: false 
            });
          } else {
            updateData({ competitorResearchLoading: false });
          }
          
        } catch (error) {
          console.error('Failed to fetch competitor suggestions:', error);
          updateData({ competitorResearchLoading: false });
        }
      }
    };
    
    triggerCompetitorResearch();
  }, [step, data.productDescription, data.companyDomain, data.suggestedCompetitors, data.competitorResearchLoading, updateData]);

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

  // Unified layout - same shell for onboarding and workspace
  // Hide map for settings tab
  const showMap = isLaunched ? activeTab !== 'settings' : step >= 3;
  const showFullHeader = isLaunched || step >= 2;

  // Onboarding steps for sidebar
  const onboardingSteps = [
    { num: 1, label: 'Product' },
    { num: 2, label: 'Territory' },
    { num: 3, label: 'Buyers' },
    { num: 4, label: 'Competitors' },
    { num: 5, label: 'Launch' },
  ];

  // Workspace nav items
  const workspaceNavItems: { id: WorkspaceTab; label: string; icon: typeof Search; count?: number }[] = [
    { id: 'discovery', label: 'Discovery', icon: Search },
    { id: 'saved', label: 'Saved Leads', icon: Star, count: 0 },
    { id: 'settings', label: 'Settings', icon: Settings },
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
              className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors flex-shrink-0"
              title={user ? 'Go to Workspace' : 'Go to Home'}
            >
              <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
            </Link>
            {sidebarExpanded && (
              <span className="font-bold text-xl tracking-tight text-gray-900">
                Riplacer
              </span>
            )}
          </div>
          
          {/* Menu Items - conditional based on isLaunched */}
          <div className={cn(
            "flex-1",
            sidebarExpanded ? "w-full px-4" : "w-full flex flex-col items-center"
          )}>
            <nav className={cn(
              sidebarExpanded ? "space-y-1" : "space-y-2 flex flex-col items-center"
            )}>
              {isLaunched ? (
                <>
                  {/* Search Criteria - collapsible */}
                  <div className="mb-2">
                    <button
                      onClick={() => {
                        // First expand sidebar if collapsed
                        if (!sidebarExpanded) {
                          setSidebarExpanded(true);
                          // Wait for sidebar animation, then expand criteria
                          setTimeout(() => setSearchCriteriaExpanded(true), 300);
                        } else {
                          // Toggle criteria expansion
                          setSearchCriteriaExpanded(!searchCriteriaExpanded);
                        }
                      }}
                      className={cn(
                        "transition-all duration-200 w-full text-left",
                        sidebarExpanded 
                          ? "flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-gray-50 border border-gray-200 hover:bg-gray-100"
                          : "w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200"
                      )}
                      title={sidebarExpanded ? undefined : 'Search Criteria'}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white border border-gray-200 flex-shrink-0">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                      {sidebarExpanded && (
                        <>
                          <span className="text-gray-700 flex-1">Search Criteria</span>
                          {searchCriteriaExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </>
                      )}
                    </button>
                    
                    {/* Expanded criteria - edit links */}
                    {sidebarExpanded && searchCriteriaExpanded && (
                      <div className="mt-1 ml-3 pl-3 border-l border-gray-200 space-y-1">
                        {onboardingSteps.slice(0, 4).map((item) => (
                          <button
                            key={item.num}
                            onClick={() => {
                              setIsLaunched(false);
                              setStep(item.num);
                            }}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Main nav items */}
                  {workspaceNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "transition-all duration-200 w-full text-left",
                          sidebarExpanded 
                            ? "flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                            : "w-10 h-10 flex items-center justify-center rounded-lg",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-gray-50 text-gray-600"
                        )}
                        title={sidebarExpanded ? undefined : item.label}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                          isActive
                            ? "bg-primary text-white"
                            : "bg-gray-100 border border-gray-200 text-gray-500"
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {sidebarExpanded && (
                          <>
                            <span className={cn(
                              "flex-1",
                              isActive ? "font-medium text-primary" : "text-gray-700"
                            )}>{item.label}</span>
                            {item.count !== undefined && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                {item.count}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </>
              ) : (
                /* Onboarding steps */
                onboardingSteps.map((item) => {
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
                })
              )}
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
        {/* Header - SAME for both modes */}
        {showFullHeader && (
          <OnboardingHeader 
            data={data} 
            step={isLaunched ? 5 : step}
            user={user}
            onEditDomain={() => {
              if (isLaunched) {
                setIsLaunched(false);
              }
              setStep(1);
            }}
            onEditTerritory={() => {
              if (isLaunched) {
                setIsLaunched(false);
              }
              setStep(2);
            }}
          />
        )}

        {/* Content Area */}
        {isLaunched && showMap ? (
          /* Workspace: Resizable panels for content + map */
          <ResizablePanelGroup 
            direction="horizontal" 
            className="flex-1 min-h-0 w-full overflow-hidden"
            style={{ width: '100%' }}
          >
            <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col relative z-10 min-w-0">
              {activeTab === 'discovery' && (
                <DiscoveryTab 
                  data={data} 
                  onProspectsChange={setMapProspects}
                  onProspectSelect={(p) => setSelectedProspectId(p?.id || null)}
                  selectedProspectId={selectedProspectId}
                />
              )}
              {activeTab === 'saved' && (
                <SavedLeadsTab />
              )}
              {activeTab === 'settings' && (
                <SettingsTab data={data} onEditCriteria={handleEditCriteria} />
              )}
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-gray-200 hover:bg-gray-300 transition-colors flex-shrink-0" />
            <ResizablePanel defaultSize={50} minSize={20} className="bg-gray-100 relative min-w-0 overflow-hidden">
              <OnboardingMap 
                data={data} 
                step={5} 
                prospects={mapProspects}
                selectedProspectId={selectedProspectId}
                onProspectClick={(id) => setSelectedProspectId(id)}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : isLaunched && !showMap ? (
          /* Workspace: Settings tab (no map) */
          <div className="flex-1 flex flex-col relative z-10">
            <SettingsTab data={data} onEditCriteria={handleEditCriteria} />
          </div>
        ) : (
          /* Onboarding: Fixed layout */
          <div className={cn(
            "flex-1 flex min-h-0 relative z-0",
            step === 1 ? "" : !showMap && "items-center justify-center"
          )}>
            {/* Background pattern - only for onboarding non-map steps */}
            {!showMap && step !== 1 && (
              <div className="dotted-bg dotted-bg-gentle-float" />
            )}
            
            {/* Left Panel - Content */}
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
        )}
      </main>
    </div>
  );
}

export default OnboardingPage;
