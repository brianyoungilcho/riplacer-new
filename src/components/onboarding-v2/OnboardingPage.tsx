import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingHeader } from './OnboardingHeader';
import { StepWhatYouSell } from './StepWhatYouSell';
import { StepWhereYouSell } from './StepWhereYouSell';
import { StepWhoYouSellTo } from './StepWhoYouSellTo';
import { StepCompetitors } from './StepCompetitors';
import { StepResults } from './StepResults';
import { OnboardingMap } from './OnboardingMap';
import { Crosshair } from 'lucide-react';
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

  // Load saved progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('riplacer_onboarding_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed.data || initialData);
        setStep(parsed.step || 1);
      } catch (e) {
        console.error('Failed to parse saved onboarding progress:', e);
      }
    }
  }, []);

  // Save progress to localStorage on data/step change
  useEffect(() => {
    localStorage.setItem('riplacer_onboarding_progress', JSON.stringify({ data, step }));
  }, [data, step]);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    setStep(prev => Math.min(prev + 1, 5));
  }, []);

  const prevStep = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Save to localStorage first
      localStorage.setItem('riplacer_onboarding', JSON.stringify(data));
      localStorage.removeItem('riplacer_onboarding_progress'); // Clear progress
      
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
          toast.error('Failed to save profile data');
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
          // First delete existing categories
          await supabase
            .from('user_categories')
            .delete()
            .eq('user_id', user.id);

          // Then insert new ones
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
          // First delete existing competitors
          await supabase
            .from('user_competitors')
            .delete()
            .eq('user_id', user.id);

          // Then insert new ones
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

        toast.success('Setup complete!');
      }
      
      navigate('/discover');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [data, user, navigate]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Determine if we should show map (step 3+)
  const showMap = step >= 3;
  
  // Determine if we should show the full header (step 2+)
  const showFullHeader = step >= 2;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Minimal Sidebar */}
      <aside className={cn(
        "w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 transition-all duration-300",
        step >= 3 && "w-64"
      )}>
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-8">
          <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        
        {/* Step indicator - only show when sidebar is expanded */}
        {step >= 3 && (
          <div className="flex-1 w-full px-4">
            <nav className="space-y-2">
              {[
                { num: 1, label: 'Product' },
                { num: 2, label: 'Territory' },
                { num: 3, label: 'Buyers' },
                { num: 4, label: 'Competitors' },
                { num: 5, label: 'Prospects' },
              ].map((item) => (
                <div
                  key={item.num}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    step === item.num 
                      ? "bg-primary/10 text-primary font-medium" 
                      : step > item.num 
                        ? "text-gray-600" 
                        : "text-gray-400"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    step === item.num 
                      ? "bg-primary text-white" 
                      : step > item.num 
                        ? "bg-gray-200 text-gray-600"
                        : "bg-gray-100 text-gray-400"
                  )}>
                    {item.num}
                  </div>
                  {item.label}
                </div>
              ))}
            </nav>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header - builds up progressively */}
        {showFullHeader && (
          <OnboardingHeader 
            data={data} 
            step={step}
            user={user}
          />
        )}

        {/* Content Area */}
        <div className={cn(
          "flex-1 flex",
          !showMap && "items-center justify-center"
        )}>
          {/* Left Panel - Questions */}
          <div className={cn(
            "transition-all duration-300",
            showMap 
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
                onComplete={handleComplete}
                onBack={prevStep}
                isSaving={isSaving}
              />
            )}
          </div>

          {/* Right Panel - Map (appears at step 3) */}
          {showMap && (
            <div className="w-1/2 bg-gray-100 relative">
              <OnboardingMap data={data} step={step} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default OnboardingPage;
