import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { COMPETITORS_BY_SECTOR } from '@/data/us-regions';
import { cn } from '@/lib/utils';

interface CompetitorSelectorProps {
  sectors: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function CompetitorSelector({ sectors, selected, onChange }: CompetitorSelectorProps) {
  const [customCompetitor, setCustomCompetitor] = useState('');

  // Get unique competitors based on selected sectors
  const availableCompetitors = [...new Set(
    sectors.flatMap(sector => COMPETITORS_BY_SECTOR[sector] || [])
  )].sort();

  const toggleCompetitor = (competitor: string) => {
    if (selected.includes(competitor)) {
      onChange(selected.filter(c => c !== competitor));
    } else {
      onChange([...selected, competitor]);
    }
  };

  const addCustomCompetitor = () => {
    if (customCompetitor.trim() && !selected.includes(customCompetitor.trim())) {
      onChange([...selected, customCompetitor.trim()]);
      setCustomCompetitor('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Available competitors based on sectors */}
      <div className="space-y-2">
        {availableCompetitors.map((competitor) => {
          const isSelected = selected.includes(competitor);
          return (
            <button
              key={competitor}
              onClick={() => toggleCompetitor(competitor)}
              className={cn(
                "w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between",
                isSelected 
                  ? "border-primary bg-primary/5 ring-1 ring-primary" 
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <span className="font-medium text-gray-900">{competitor}</span>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom competitor input */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-2">Don't see your competitor?</p>
        <div className="flex gap-2">
          <Input
            placeholder="Add competitor name..."
            value={customCompetitor}
            onChange={(e) => setCustomCompetitor(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomCompetitor()}
          />
          <button
            onClick={addCustomCompetitor}
            disabled={!customCompetitor.trim()}
            className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Custom competitors added */}
      {selected.filter(c => !availableCompetitors.includes(c)).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Custom competitors:</p>
          {selected.filter(c => !availableCompetitors.includes(c)).map((competitor) => (
            <button
              key={competitor}
              onClick={() => toggleCompetitor(competitor)}
              className="w-full p-4 rounded-xl border border-primary bg-primary/5 ring-1 ring-primary text-left transition-all flex items-center justify-between"
            >
              <span className="font-medium text-gray-900">{competitor}</span>
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

