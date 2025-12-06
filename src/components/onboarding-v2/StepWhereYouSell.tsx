import { useState, useEffect } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface StepWhereYouSellProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type TabType = 'region' | 'state' | 'cities' | 'describe';

// US Regions
const REGIONS = [
  'Northeast',
  'Southeast', 
  'Midwest',
  'Southwest',
  'West',
];

// US States by region
const STATES_BY_REGION: Record<string, string[]> = {
  'Northeast': ['Connecticut', 'Delaware', 'Maine', 'Maryland', 'Massachusetts', 'New Hampshire', 'New Jersey', 'New York', 'Pennsylvania', 'Rhode Island', 'Vermont'],
  'Southeast': ['Alabama', 'Arkansas', 'Florida', 'Georgia', 'Kentucky', 'Louisiana', 'Mississippi', 'North Carolina', 'South Carolina', 'Tennessee', 'Virginia', 'West Virginia'],
  'Midwest': ['Illinois', 'Indiana', 'Iowa', 'Kansas', 'Michigan', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'Ohio', 'South Dakota', 'Wisconsin'],
  'Southwest': ['Arizona', 'New Mexico', 'Oklahoma', 'Texas'],
  'West': ['Alaska', 'California', 'Colorado', 'Hawaii', 'Idaho', 'Montana', 'Nevada', 'Oregon', 'Utah', 'Washington', 'Wyoming'],
};

// Sample cities by state (in real app, this would be more comprehensive)
const CITIES_BY_STATE: Record<string, string[]> = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Oakland', 'Fresno', 'Long Beach', 'Bakersfield', 'Anaheim'],
  'Texas': ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Laredo'],
  'Florida': ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah', 'Tallahassee', 'Fort Lauderdale', 'Port St. Lucie', 'Cape Coral'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon', 'Schenectady', 'Utica'],
  'Illinois': ['Chicago', 'Aurora', 'Joliet', 'Naperville', 'Rockford', 'Springfield', 'Elgin', 'Peoria', 'Champaign', 'Waukegan'],
  'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Reading', 'Scranton', 'Bethlehem', 'Lancaster', 'Harrisburg', 'Altoona', 'Erie'],
  'Ohio': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton', 'Youngstown', 'Lorain'],
  'Georgia': ['Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah', 'Athens', 'Sandy Springs', 'Roswell', 'Johns Creek', 'Albany'],
  'Michigan': ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing', 'Flint', 'Dearborn', 'Livonia', 'Troy'],
  'Arizona': ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Glendale', 'Gilbert', 'Tempe', 'Peoria', 'Surprise'],
};

// Default cities for states not in the list
const DEFAULT_CITIES = ['City 1', 'City 2', 'City 3', 'City 4', 'City 5'];

export function StepWhereYouSell({ data, updateData, onNext, onBack }: StepWhereYouSellProps) {
  const [activeTab, setActiveTab] = useState<TabType>('region');
  const [selectedRegion, setSelectedRegion] = useState(data.region || '');
  const [selectedStates, setSelectedStates] = useState<string[]>(data.states);
  const [selectedCities, setSelectedCities] = useState<string[]>(data.cities);
  const [description, setDescription] = useState(data.territoryDescription || '');

  // Sync local state with data prop on mount
  useEffect(() => {
    setSelectedRegion(data.region || '');
    setSelectedStates(data.states);
    setSelectedCities(data.cities);
    setDescription(data.territoryDescription || '');
  }, []);

  const handleRegionSelect = (region: string) => {
    if (selectedRegion === region) {
      setSelectedRegion('');
    } else {
      setSelectedRegion(region);
      // Auto-select all states in the region
      const regionStates = STATES_BY_REGION[region] || [];
      setSelectedStates(regionStates);
      // Auto-advance to state tab
      setActiveTab('state');
    }
  };

  const handleStateToggle = (state: string) => {
    setSelectedStates(prev => 
      prev.includes(state) 
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  const handleCityToggle = (city: string) => {
    setSelectedCities(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const handleContinue = () => {
    // Build territory filters
    const territoryFilters: string[] = [];
    if (selectedRegion) {
      territoryFilters.push(selectedRegion);
    }
    if (selectedStates.length > 0 && selectedStates.length <= 3) {
      selectedStates.forEach(s => territoryFilters.push(s));
    } else if (selectedStates.length > 3) {
      territoryFilters.push(`${selectedStates.length} states`);
    }
    if (selectedCities.length > 0 && selectedCities.length <= 2) {
      selectedCities.forEach(c => territoryFilters.push(c));
    } else if (selectedCities.length > 2) {
      territoryFilters.push(`${selectedCities.length} cities`);
    }

    updateData({
      region: selectedRegion || undefined,
      states: selectedStates,
      cities: selectedCities,
      territoryDescription: description || undefined,
      filters: territoryFilters, // Start fresh with territory filters
    });
    onNext();
  };

  // Get available states based on region selection
  const availableStates = selectedRegion 
    ? STATES_BY_REGION[selectedRegion] || []
    : Object.values(STATES_BY_REGION).flat().sort();

  // Get available cities based on state selection
  const availableCities = selectedStates.length > 0
    ? selectedStates.flatMap(state => CITIES_BY_STATE[state] || DEFAULT_CITIES).sort()
    : [];

  // Must have at least one selection to continue
  const canContinue = selectedRegion || selectedStates.length > 0 || description.trim().length > 10;

  return (
    <div className="py-16 px-8">
      <div className="max-w-xl mx-auto">
        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-4">
          Where are you selling?
        </h1>
        
        <p className="text-gray-600 text-center mb-10">
          Tell us about your territories. You can narrow down further afterwards.
        </p>

        {/* Tab Selector */}
        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex items-center border border-gray-200 rounded-full overflow-hidden bg-white">
            <TabButton 
              active={activeTab === 'region'} 
              onClick={() => setActiveTab('region')}
              hasSelection={!!selectedRegion}
            >
              Region
            </TabButton>
            <span className="text-gray-300 px-1">|</span>
            <TabButton 
              active={activeTab === 'state'} 
              onClick={() => setActiveTab('state')}
              hasSelection={selectedStates.length > 0}
            >
              State
            </TabButton>
            <span className="text-gray-300 px-1">|</span>
            <TabButton 
              active={activeTab === 'cities'} 
              onClick={() => setActiveTab('cities')}
              hasSelection={selectedCities.length > 0}
              disabled={selectedStates.length === 0}
            >
              Cities
            </TabButton>
            <button 
              onClick={() => setActiveTab('describe')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full ml-2 transition-colors",
                activeTab === 'describe'
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              Describe
            </button>
          </div>
        </div>

        {/* Selection Display */}
        {(selectedRegion || selectedStates.length > 0 || selectedCities.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {selectedRegion && (
              <SelectionPill 
                label={selectedRegion} 
                onRemove={() => {
                  setSelectedRegion('');
                  setSelectedStates([]);
                  setSelectedCities([]);
                }}
              />
            )}
            {selectedStates.slice(0, 5).map(state => (
              <SelectionPill 
                key={state} 
                label={state} 
                onRemove={() => handleStateToggle(state)}
              />
            ))}
            {selectedStates.length > 5 && (
              <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm border border-gray-200">
                +{selectedStates.length - 5} more states
              </span>
            )}
            {selectedCities.slice(0, 3).map(city => (
              <SelectionPill 
                key={city} 
                label={city} 
                onRemove={() => handleCityToggle(city)}
              />
            ))}
            {selectedCities.length > 3 && (
              <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm border border-gray-200">
                +{selectedCities.length - 3} more cities
              </span>
            )}
          </div>
        )}

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === 'region' && (
            <div className="grid grid-cols-2 gap-3">
              {REGIONS.map(region => (
                <button
                  key={region}
                  onClick={() => handleRegionSelect(region)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    selectedRegion === region
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{region}</span>
                    {selectedRegion === region && (
                      <Check className="w-5 h-5 text-gray-900" />
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {STATES_BY_REGION[region]?.length || 0} states
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'state' && (
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {availableStates.map(state => (
                <button
                  key={state}
                  onClick={() => handleStateToggle(state)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all flex items-center justify-between",
                    selectedStates.includes(state)
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <span className="font-medium text-sm">{state}</span>
                  {selectedStates.includes(state) && (
                    <Check className="w-4 h-4 text-gray-900" />
                  )}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'cities' && (
            selectedStates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Select at least one state first
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {availableCities.map(city => (
                  <button
                    key={city}
                    onClick={() => handleCityToggle(city)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex items-center justify-between",
                      selectedCities.includes(city)
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className="font-medium text-sm">{city}</span>
                    {selectedCities.includes(city) && (
                      <Check className="w-4 h-4 text-gray-900" />
                    )}
                  </button>
                ))}
              </div>
            )
          )}

          {activeTab === 'describe' && (
            <div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Major metropolitan areas in the Pacific Northwest with populations over 100,000..."
                className="min-h-[120px] text-base resize-none border-gray-300 focus:border-gray-400 focus:ring-0 rounded-xl"
              />
              <p className="text-sm text-gray-500 mt-2">
                Our AI will interpret your description and identify relevant territories.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onBack}
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
            Continue
          </Button>
        </div>

        {/* Helper text */}
        {!canContinue && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Select a region, state, or describe your territory to continue
          </p>
        )}
      </div>
    </div>
  );
}

function TabButton({ 
  children, 
  active, 
  onClick, 
  hasSelection,
  disabled 
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void;
  hasSelection?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-6 py-2 text-sm transition-colors relative",
        active 
          ? "text-gray-900 font-medium" 
          : disabled
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-500 hover:text-gray-700",
        hasSelection && !active && "text-gray-700"
      )}
    >
      {children}
      {hasSelection && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
      )}
    </button>
  );
}

function SelectionPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm border border-gray-200">
      {label}
      <button 
        onClick={onRemove}
        className="w-4 h-4 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors"
      >
        <X className="w-3 h-3 text-white" />
      </button>
    </span>
  );
}
