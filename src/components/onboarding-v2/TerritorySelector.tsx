import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check } from 'lucide-react';
import { US_REGIONS, CITIES_BY_STATE, type USRegion } from '@/data/us-regions';
import { cn } from '@/lib/utils';

export interface Territory {
  regions: string[];
  states: string[];
  cities: string[];
  description?: string;
}

const createEmptyTerritory = (): Territory => ({
  regions: [],
  states: [],
  cities: [],
  description: undefined,
});

interface TerritorySelectorProps {
  territory: Territory;
  onChange: (territory: Territory) => void;
}

type TabType = 'region' | 'state' | 'cities' | 'describe';

export function TerritorySelector({ territory, onChange }: TerritorySelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('region');
  const [showDescription, setShowDescription] = useState(false);

  // Ensure arrays are properly typed
  const regions: string[] = territory.regions ?? [];
  const states: string[] = territory.states ?? [];
  const cities: string[] = territory.cities ?? [];

  const allStates = Object.values(US_REGIONS).flatMap(r => r.states).sort();
  
  // Get cities for selected states
  const availableCities = states
    .flatMap(state => CITIES_BY_STATE[state] || [])
    .sort();

  const toggleRegion = (region: string) => {
    const regionData = US_REGIONS[region as USRegion];
    const regionStates: string[] = regionData ? [...regionData.states] : [];
    const isSelected = regions.includes(region);
    
    if (isSelected) {
      onChange({
        ...territory,
        regions: regions.filter(r => r !== region),
        states: states.filter(s => !regionStates.includes(s)),
        cities: cities.filter(c => {
          // Remove cities from deselected states
          const cityState = states.find(state => 
            CITIES_BY_STATE[state]?.includes(c) && regionStates.includes(state)
          );
          return !cityState;
        }),
      });
    } else {
      const newStates = [...new Set([...states, ...regionStates])];
      onChange({
        ...territory,
        regions: [...regions, region],
        states: newStates,
      });
    }
  };

  const toggleState = (state: string) => {
    const isSelected = states.includes(state);
    
    if (isSelected) {
      const newStates = states.filter(s => s !== state);
      onChange({
        ...territory,
        states: newStates,
        cities: cities.filter(c => !(CITIES_BY_STATE[state]?.includes(c))),
        // Update regions if all states from a region are deselected
        regions: regions.filter(region => {
          const regionData = US_REGIONS[region as USRegion];
          const regionStates: string[] = regionData ? [...regionData.states] : [];
          return regionStates.some(rs => newStates.includes(rs));
        }),
      });
    } else {
      // Find which region this state belongs to
      const parentRegion = Object.entries(US_REGIONS).find(([_, data]) => 
        ([...data.states] as string[]).includes(state)
      )?.[0];

      onChange({
        ...territory,
        states: [...states, state],
        regions: parentRegion && !regions.includes(parentRegion) 
          ? [...regions, parentRegion]
          : regions,
      });
    }
  };

  const toggleCity = (city: string) => {
    const isSelected = cities.includes(city);
    
    if (isSelected) {
      onChange({
        ...territory,
        cities: cities.filter(c => c !== city),
      });
    } else {
      onChange({
        ...territory,
        cities: [...cities, city],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Selector - Airbnb style */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full border border-gray-300 p-1 bg-white">
          <button
            onClick={() => setActiveTab('region')}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-colors",
              activeTab === 'region' 
                ? "bg-gray-900 text-white" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Region
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => setActiveTab('state')}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-colors",
              activeTab === 'state' 
                ? "bg-gray-900 text-white" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            State
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => setActiveTab('cities')}
            disabled={territory.states.length === 0}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-colors",
              activeTab === 'cities' 
                ? "bg-gray-900 text-white" 
                : "text-gray-600 hover:text-gray-900",
              territory.states.length === 0 && "opacity-50 cursor-not-allowed"
            )}
          >
            Cities
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => {
              setActiveTab('describe');
              setShowDescription(true);
            }}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-colors",
              activeTab === 'describe' 
                ? "bg-gray-900 text-white" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Describe
          </button>
        </div>
      </div>

      {/* Selection content */}
      <div className="min-h-[300px]">
        {/* Region Selection */}
        {activeTab === 'region' && (
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(US_REGIONS).map((region) => {
              const isSelected = territory.regions.includes(region);
              return (
                <button
                  key={region}
                  onClick={() => toggleRegion(region)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    isSelected 
                      ? "border-primary bg-primary/5 ring-1 ring-primary" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{region}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {US_REGIONS[region as USRegion].states.length} states
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* State Selection */}
        {activeTab === 'state' && (
          <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
            {allStates.map((state) => {
              const isSelected = territory.states.includes(state);
              return (
                <button
                  key={state}
                  onClick={() => toggleState(state)}
                  className={cn(
                    "p-3 rounded-lg border text-left text-sm transition-all",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={isSelected ? "font-medium text-gray-900" : "text-gray-700"}>
                      {state}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Cities Selection */}
        {activeTab === 'cities' && (
          <div>
            {territory.states.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                Select at least one state first
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                {availableCities.map((city) => {
                  const isSelected = territory.cities.includes(city);
                  return (
                    <button
                      key={city}
                      onClick={() => toggleCity(city)}
                      className={cn(
                        "p-3 rounded-lg border text-left text-sm transition-all",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={isSelected ? "font-medium text-gray-900" : "text-gray-700"}>
                          {city}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Describe (free text) */}
        {activeTab === 'describe' && (
          <div className="max-w-lg mx-auto">
            <Textarea
              placeholder="Describe your territory in your own words. For example: 'I cover the tri-state area including NYC, Northern NJ, and Southern CT' or 'All police departments within 50 miles of Chicago'..."
              className="min-h-[150px] text-base resize-none"
              value={territory.description || ''}
              onChange={(e) => onChange({ ...territory, description: e.target.value })}
            />
            <p className="text-sm text-gray-500 mt-2">
              Our AI will extract and supplement your description to find the right territories.
            </p>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {(territory.regions.length > 0 || territory.states.length > 0 || territory.cities.length > 0) && (
        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Selected: </span>
            {territory.cities.length > 0 && (
              <span>{territory.cities.length} cities in </span>
            )}
            {territory.states.length > 0 && (
              <span>{territory.states.length} states</span>
            )}
            {territory.regions.length > 0 && territory.states.length === 0 && (
              <span>{territory.regions.length} regions</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

