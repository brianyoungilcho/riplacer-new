import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingHeader } from './OnboardingHeader';
import { StepWhatYouSell } from './StepWhatYouSell';
import { StepWhereYouSell } from './StepWhereYouSell';
import { StepWhoYouSellTo } from './StepWhoYouSellTo';
import { StepCompetitors } from './StepCompetitors';
import { StepResults } from './StepResults';
import { Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    setStep(prev => Math.min(prev + 1, 5));
  }, []);

  const prevStep = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleComplete = useCallback(() => {
    // Save to localStorage for now
    localStorage.setItem('riplacer_onboarding', JSON.stringify(data));
    navigate('/discover');
  }, [data, navigate]);

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
              />
            )}
          </div>

          {/* Right Panel - Map (appears at step 3) */}
          {showMap && (
            <div className="w-1/2 bg-gray-100 relative">
              <MapPlaceholder data={data} step={step} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Placeholder map component - will be replaced with real map
function MapPlaceholder({ data, step }: { data: OnboardingData; step: number }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
          Draw
        </button>
      </div>
      
      {/* Map Area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium mb-2">Map Interface</p>
          <p className="text-sm">Territory visualization will appear here</p>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-lg font-medium hover:bg-gray-50">
          +
        </button>
        <button className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-lg font-medium hover:bg-gray-50">
          −
        </button>
      </div>

      {/* Prospect markers (step 5) */}
      {step === 5 && (
        <div className="absolute top-1/3 right-1/4 space-y-4">
          <ProspectMarker name="75 Havensville PD" />
          <ProspectMarker name="85 Havensville PD" className="translate-x-8" />
          <ProspectMarker name="75 Chelsea PD" className="translate-y-20 -translate-x-4" />
        </div>
      )}
    </div>
  );
}

function ProspectMarker({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn(
      "px-3 py-1.5 bg-white rounded-full border border-gray-200 text-sm font-medium shadow-sm",
      className
    )}>
      {name}
    </div>
  );
}

export default OnboardingPage;

