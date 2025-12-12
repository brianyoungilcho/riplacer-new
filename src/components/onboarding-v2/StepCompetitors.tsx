import { useState, useEffect } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, Plus, X, Loader2 } from 'lucide-react';

interface StepCompetitorsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Common competitors based on industry (would be dynamically populated in real app)
const SUGGESTED_COMPETITORS: Record<string, string[]> = {
  'police': ['Axon', 'Motorola Solutions', 'ShotSpotter', 'Flock Safety', 'NICE', 'Genetec'],
  'sheriff': ['Axon', 'Motorola Solutions', 'ShotSpotter', 'Flock Safety', 'NICE', 'Genetec'],
  'fire': ['Pierce Manufacturing', 'E-ONE', 'Rosenbauer', 'Spartan Motors', 'ESO Solutions'],
  'ems': ['ESO Solutions', 'Zoll Medical', 'Stryker', 'ImageTrend'],
  'schools_k12': ['PowerSchool', 'Infinite Campus', 'Skyward', 'Blackboard', 'Instructure'],
  'higher_ed': ['Ellucian', 'Oracle', 'Workday', 'Blackbaud', 'Campus Management'],
  'transit': ['Trapeze', 'Clever Devices', 'Cubic', 'Conduent', 'GMV'],
  'city_gov': ['Tyler Technologies', 'Accela', 'CentralSquare', 'OpenGov'],
  'county_gov': ['Tyler Technologies', 'Accela', 'CentralSquare', 'OpenGov'],
  'state_agency': ['Oracle', 'SAP', 'Deloitte', 'Accenture'],
  'utilities': ['Oracle Utilities', 'SAP', 'Sensus', 'Itron'],
  'hospitals': ['Epic', 'Cerner', 'MEDITECH', 'Allscripts'],
  'default': ['Competitor A', 'Competitor B', 'Competitor C'],
};

export function StepCompetitors({ data, updateData, onNext, onBack }: StepCompetitorsProps) {
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>(data.competitors);
  const [customCompetitor, setCustomCompetitor] = useState('');

  // Sync with data prop
  useEffect(() => {
    setSelectedCompetitors(data.competitors);
  }, []);

  // Check if AI research is still loading
  const isResearchLoading = data.competitorResearchLoading;
  
  // Get suggested competitors - prioritize AI suggestions, fallback to category-based
  const getSuggestedCompetitors = (): string[] => {
    // If we have AI-suggested competitors, use those first
    if (data.suggestedCompetitors && data.suggestedCompetitors.length > 0) {
      return data.suggestedCompetitors;
    }
    
    // Fallback to category-based suggestions
    const competitors = new Set<string>();
    
    data.targetCategories.forEach(category => {
      const categoryCompetitors = SUGGESTED_COMPETITORS[category] || [];
      categoryCompetitors.forEach(c => competitors.add(c));
    });

    if (competitors.size === 0) {
      SUGGESTED_COMPETITORS['default'].forEach(c => competitors.add(c));
    }

    return Array.from(competitors).sort();
  };

  const suggestedCompetitors = getSuggestedCompetitors();
  const hasAISuggestions = data.suggestedCompetitors && data.suggestedCompetitors.length > 0;

  const handleCompetitorToggle = (competitor: string) => {
    setSelectedCompetitors(prev => 
      prev.includes(competitor) 
        ? prev.filter(c => c !== competitor)
        : [...prev, competitor]
    );
  };

  const handleAddCustom = () => {
    if (customCompetitor.trim() && !selectedCompetitors.includes(customCompetitor.trim())) {
      setSelectedCompetitors(prev => [...prev, customCompetitor.trim()]);
      setCustomCompetitor('');
    }
  };

  const handleRemoveCompetitor = (competitor: string) => {
    setSelectedCompetitors(prev => prev.filter(c => c !== competitor));
  };

  const handleContinue = () => {
    // Keep existing filters that aren't competitor-related
    const existingFilters = data.filters.filter(f => !f.startsWith('Uses '));
    
    // Add competitor filters (only first 2 to keep it clean)
    const competitorFilters = selectedCompetitors.slice(0, 2).map(c => `Uses ${c}`);
    
    updateData({
      competitors: selectedCompetitors,
      filters: [...existingFilters, ...competitorFilters],
    });
    onNext();
  };

  const canContinue = selectedCompetitors.length > 0;

  // Get existing non-competitor filters
  const nonCompetitorFilters = data.filters.filter(f => !f.startsWith('Uses '));

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      
      {/* Filter Pills - Show all accumulated selections */}
      {nonCompetitorFilters.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {nonCompetitorFilters.map((filter, idx) => (
              <span 
                key={idx}
                className="px-3 py-1.5 bg-white rounded-full text-sm border border-gray-200"
              >
                {filter}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-lg mx-auto">
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Who are your competitors?
          </h1>
          
          <p className="text-gray-600 mb-6">
            Select competitors you want to displace. We'll find accounts using their products.
          </p>

          {/* Selected Competitors */}
          {selectedCompetitors.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Selected ({selectedCompetitors.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedCompetitors.map(competitor => (
                  <span 
                    key={competitor}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-full text-sm"
                  >
                    {competitor}
                    <button 
                      onClick={() => handleRemoveCompetitor(competitor)}
                      className="w-4 h-4 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Add competitor
            </label>
            <div className="flex gap-2">
              <Input
                value={customCompetitor}
                onChange={(e) => setCustomCompetitor(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                placeholder="Enter competitor name..."
                className="flex-1 h-11 rounded-xl border-gray-300"
              />
              <Button
                onClick={handleAddCustom}
                disabled={!customCompetitor.trim()}
                variant="outline"
                className="h-11 px-4 rounded-xl"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Suggested Competitors */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-gray-700">
                Suggested competitors
              </label>
              {isResearchLoading ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Researching...
                </span>
              ) : hasAISuggestions ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <Check className="w-3 h-3" />
                  AI-powered
                </span>
              ) : null}
            </div>
            
            {isResearchLoading && suggestedCompetitors.length === 0 ? (
              /* Loading state when no suggestions yet */
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 animate-pulse">
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {suggestedCompetitors.map(competitor => (
                  <button
                    key={competitor}
                    onClick={() => handleCompetitorToggle(competitor)}
                    className={cn(
                      "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between",
                      selectedCompetitors.includes(competitor)
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className="font-medium text-gray-900">{competitor}</span>
                    {selectedCompetitors.includes(competitor) && (
                      <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 bg-white">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            variant="outline"
            className="flex-1 h-12 text-base font-medium rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="flex-1 h-12 text-base font-medium rounded-xl"
          >
            Find Prospects
          </Button>
        </div>
        {!canContinue && (
          <p className="text-center text-sm text-gray-500 mt-3">
            Select at least one competitor to continue
          </p>
        )}
      </div>
    </div>
  );
}
