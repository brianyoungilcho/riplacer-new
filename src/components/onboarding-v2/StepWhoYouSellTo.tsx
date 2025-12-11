import { useState, useEffect } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepWhoYouSellToProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Target buyer categories
const BUYER_CATEGORIES = [
  { id: 'police', label: 'Police Departments', description: 'Municipal and county law enforcement' },
  { id: 'sheriff', label: 'Sheriff Offices', description: 'County sheriff departments' },
  { id: 'fire', label: 'Fire Departments', description: 'Fire and rescue services' },
  { id: 'ems', label: 'EMS/Ambulance', description: 'Emergency medical services' },
  { id: 'schools_k12', label: 'K-12 Schools', description: 'Public school districts' },
  { id: 'higher_ed', label: 'Higher Education', description: 'Universities and colleges' },
  { id: 'city_gov', label: 'City Government', description: 'Municipal offices and agencies' },
  { id: 'county_gov', label: 'County Government', description: 'County-level agencies' },
  { id: 'state_agency', label: 'State Agencies', description: 'State departments' },
  { id: 'transit', label: 'Transit Authorities', description: 'Public transportation agencies' },
  { id: 'utilities', label: 'Public Utilities', description: 'Water, power, and utilities' },
  { id: 'hospitals', label: 'Public Hospitals', description: 'Government-run healthcare' },
];

export function StepWhoYouSellTo({ data, updateData, onNext, onBack }: StepWhoYouSellToProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(data.targetCategories);

  // Sync with data prop
  useEffect(() => {
    setSelectedCategories(data.targetCategories);
  }, []);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleContinue = () => {
    // Get category labels for filters
    const categoryFilters = selectedCategories.map(catId => {
      const category = BUYER_CATEGORIES.find(c => c.id === catId);
      return category?.label || catId;
    });
    
    // Append to existing territory filters (don't duplicate)
    const existingFilters = data.filters.filter(f => 
      !BUYER_CATEGORIES.some(cat => cat.label === f)
    );
    
    updateData({
      targetCategories: selectedCategories,
      filters: [...existingFilters, ...categoryFilters],
    });
    onNext();
  };

  const canContinue = selectedCategories.length > 0;

  // Get existing territory filters to display
  const territoryFilters = data.filters.filter(f => 
    !BUYER_CATEGORIES.some(cat => cat.label === f)
  );

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      
      {/* Filter Pills - Show territory selections */}
      {territoryFilters.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {territoryFilters.map((filter, idx) => (
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
            Who are you selling to?
          </h1>
          
          <p className="text-gray-600 mb-8">
            Tell us who your customers are. Select all that apply.
          </p>

          {/* Category List */}
          <div className="space-y-3">
            {BUYER_CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryToggle(category.id)}
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between",
                  selectedCategories.includes(category.id)
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div>
                  <div className="font-medium text-gray-900">{category.label}</div>
                  <div className="text-sm text-gray-500">{category.description}</div>
                </div>
                {selectedCategories.includes(category.id) && (
                  <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
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
            Continue
          </Button>
        </div>
        {!canContinue && (
          <p className="text-center text-sm text-gray-500 mt-3">
            Select at least one buyer type to continue
          </p>
        )}
      </div>
    </div>
  );
}
