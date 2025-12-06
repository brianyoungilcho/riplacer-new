import { Check } from 'lucide-react';
import { TARGET_SECTORS } from '@/data/us-regions';
import { cn } from '@/lib/utils';

interface SectorSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function SectorSelector({ selected, onChange }: SectorSelectorProps) {
  const toggleSector = (sectorId: string) => {
    if (selected.includes(sectorId)) {
      onChange(selected.filter(s => s !== sectorId));
    } else {
      onChange([...selected, sectorId]);
    }
  };

  return (
    <div className="space-y-2">
      {TARGET_SECTORS.map((sector) => {
        const isSelected = selected.includes(sector.id);
        return (
          <button
            key={sector.id}
            onClick={() => toggleSector(sector.id)}
            className={cn(
              "w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between",
              isSelected 
                ? "border-primary bg-primary/5 ring-1 ring-primary" 
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div>
              <div className="font-medium text-gray-900">{sector.name}</div>
              <div className="text-sm text-gray-500">{sector.description}</div>
            </div>
            {isSelected && (
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

