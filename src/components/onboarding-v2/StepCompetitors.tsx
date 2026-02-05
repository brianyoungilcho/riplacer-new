import { useState, useEffect } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';

interface StepCompetitorsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepCompetitors({ data, updateData, onNext, onBack }: StepCompetitorsProps) {
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>(data.competitors);
  const [customCompetitor, setCustomCompetitor] = useState('');

  // Sync with data prop
  useEffect(() => {
    setSelectedCompetitors(data.competitors);
  }, []);


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
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="max-w-lg mx-auto">
          {/* Title */}
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">
            Who are your competitors?
          </h1>
          
          <p className="text-gray-500 mb-6">
            Select competitors you want to displace so we can focus the research.
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
                className="flex-1 h-11 rounded-xl border-gray-200"
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

          <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center">
            <p className="text-sm text-gray-600">
              Add any additional competitors using the input above.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 sm:p-6 border-t border-gray-200 bg-white">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            variant="outline"
            className="flex-1 h-14 sm:h-12 text-base font-medium rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="flex-1 h-14 sm:h-12 text-base font-medium rounded-xl"
          >
            Continue
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
