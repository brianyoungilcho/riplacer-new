import { useState, useEffect } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface StepWhereYouSellProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// US Regions with state counts
const REGIONS = [
  { name: 'Northeast', count: 11 },
  { name: 'Southeast', count: 12 },
  { name: 'Midwest', count: 12 },
  { name: 'Southwest', count: 4 },
  { name: 'West', count: 11 },
];

// State abbreviations
const STATE_ABBREV: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
};

// US States by region
const STATES_BY_REGION: Record<string, string[]> = {
  'Northeast': ['Connecticut', 'Delaware', 'Maine', 'Maryland', 'Massachusetts', 'New Hampshire', 'New Jersey', 'New York', 'Pennsylvania', 'Rhode Island', 'Vermont'],
  'Southeast': ['Alabama', 'Arkansas', 'Florida', 'Georgia', 'Kentucky', 'Louisiana', 'Mississippi', 'North Carolina', 'South Carolina', 'Tennessee', 'Virginia', 'West Virginia'],
  'Midwest': ['Illinois', 'Indiana', 'Iowa', 'Kansas', 'Michigan', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'Ohio', 'South Dakota', 'Wisconsin'],
  'Southwest': ['Arizona', 'New Mexico', 'Oklahoma', 'Texas'],
  'West': ['Alaska', 'California', 'Colorado', 'Hawaii', 'Idaho', 'Montana', 'Nevada', 'Oregon', 'Utah', 'Washington', 'Wyoming'],
};

export function StepWhereYouSell({ data, updateData, onNext, onBack }: StepWhereYouSellProps) {
  const [activeRegion, setActiveRegion] = useState(data.region || 'Northeast');
  const [selectedStates, setSelectedStates] = useState<string[]>(data.states || []);
  const [showDescribe, setShowDescribe] = useState(false);
  const [description, setDescription] = useState(data.territoryDescription || '');

  // Sync local state with data prop on mount
  useEffect(() => {
    if (data.states && data.states.length > 0) {
      setSelectedStates(data.states);
    }
    if (data.territoryDescription) {
      setDescription(data.territoryDescription);
      setShowDescribe(true);
    }
  }, []);

  const handleStateToggle = (state: string) => {
    setSelectedStates(prev => 
      prev.includes(state) 
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  const handleRemoveState = (state: string) => {
    setSelectedStates(prev => prev.filter(s => s !== state));
  };

  const handleContinue = () => {
    // Determine if this is a custom territory (description-based) or state selection
    const isCustomTerritory = description.trim().length > 0 && selectedStates.length === 0;

    const territoryFilters = isCustomTerritory
      ? [description.trim()]
      : selectedStates.map((state) => STATE_ABBREV[state] || state);

    updateData({
      region: activeRegion,
      states: selectedStates,
      territoryDescription: description || undefined,
      isCustomTerritory,
      filters: territoryFilters,
    });
    onNext();
  };

  // Get states for the active region filter
  const visibleStates = STATES_BY_REGION[activeRegion] || [];
  
  // Count selected in current region
  const selectedInRegion = visibleStates.filter(s => selectedStates.includes(s)).length;

  // Can continue if states selected or description provided
  const canContinue = selectedStates.length > 0 || description.trim().length > 10;

  if (showDescribe) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10">
          <div className="max-w-lg mx-auto relative z-10">
            <h1 className="text-3xl font-semibold text-gray-900 mb-3">
              Describe your territory
            </h1>
            <p className="text-gray-500 mb-8">
              Tell us about your sales region and we'll figure out the rest.
            </p>

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Major metropolitan areas in the Pacific Northwest with populations over 100,000, or all of New England except Maine..."
              className="min-h-[160px] sm:min-h-[140px] text-base resize-none border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-400 bg-white"
              autoFocus
            />

            <p className="text-sm text-gray-400 mt-3">
              Our AI will interpret your description and identify relevant areas.
            </p>

            <button
              onClick={() => setShowDescribe(false)}
              className="block w-full text-left text-sm text-primary hover:underline mt-6"
            >
              ← Back to selecting states
            </button>
          </div>
        </div>

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
              className="flex-1 h-14 sm:h-12 text-base font-medium rounded-xl border-gray-200"
            >
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={description.trim().length < 10}
              className="flex-1 h-14 sm:h-12 text-base font-medium rounded-xl bg-primary hover:bg-primary/90"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="max-w-lg mx-auto relative z-10">
          {/* Title */}
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">
            Where are you selling?
          </h1>
          <p className="text-gray-500 mb-8">
            Select the states in your territory. You can narrow down to specific cities later.
          </p>

        {/* Region Filter Bar */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Filter by region</p>
          <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white">
            {REGIONS.map((region) => (
              <button
                key={region.name}
                onClick={() => setActiveRegion(region.name)}
                className={cn(
                  "flex-1 py-3 px-2 text-sm font-medium transition-colors border-r border-gray-200 last:border-r-0",
                  activeRegion === region.name
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {region.name}
              </button>
            ))}
          </div>
        </div>

        {/* States Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">States in {activeRegion}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Select all states in this region
                  const regionStates = STATES_BY_REGION[activeRegion] || [];
                  setSelectedStates(prev => {
                    const newStates = new Set(prev);
                    regionStates.forEach(state => newStates.add(state));
                    return Array.from(newStates);
                  });
                }}
                className="text-sm text-primary hover:underline"
              >
                Select all
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => {
                  // Remove all states from this region
                  const regionStates = new Set(visibleStates);
                  setSelectedStates(prev => prev.filter(s => !regionStates.has(s)));
                }}
                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleStates.map(state => (
              <button
                key={state}
                onClick={() => handleStateToggle(state)}
                className={cn(
                  "px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                  selectedStates.includes(state)
                    ? "bg-primary text-white"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        {/* Selection Summary */}
        {selectedStates.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Selected ({selectedStates.length}):</span>
              {selectedStates.map(state => (
                <span 
                  key={state}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-sm"
                >
                  {STATE_ABBREV[state] || state}
                  <button 
                    onClick={() => handleRemoveState(state)}
                    className="w-4 h-4 rounded-full bg-gray-300 hover:bg-red-200 hover:text-red-600 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Describe Alternative */}
        <button
          onClick={() => setShowDescribe(true)}
          className="block w-full text-left text-sm text-primary hover:underline mt-8"
        >
          I'll describe my territory instead →
        </button>
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
          className="flex-1 h-14 sm:h-12 text-base font-medium rounded-xl border-gray-200"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex-1 h-14 sm:h-12 text-base font-medium rounded-xl bg-primary hover:bg-primary/90"
        >
          Continue
        </Button>
      </div>
    </div>
  </div>
  );
}
