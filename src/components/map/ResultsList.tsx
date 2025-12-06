import { MapSearchResult } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Globe, Phone, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResultsListProps {
  results: MapSearchResult[];
  onResultClick: (result: MapSearchResult) => void;
  selectedId?: string;
}

export function ResultsList({ results, onResultClick, selectedId }: ResultsListProps) {
  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <p className="text-sm">Search for prospects to see results here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {results.map((result) => (
        <div
          key={result.place_id}
          className={cn(
            "p-4 rounded-lg cursor-pointer transition-all duration-200 border",
            selectedId === result.place_id 
              ? "border-primary bg-primary/10" 
              : "border-gray-800 bg-gray-800/50 hover:border-gray-700 hover:bg-gray-800"
          )}
          onClick={() => onResultClick(result)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-white truncate">
                {result.name}
              </h3>
              <p className="text-xs text-gray-400 truncate mt-1">
                {result.address}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {result.website && (
                  <Badge className="text-xs gap-1 bg-gray-700 text-gray-300 hover:bg-gray-600">
                    <Globe className="w-3 h-3" />
                    Website
                  </Badge>
                )}
                {result.phone && (
                  <Badge className="text-xs gap-1 bg-gray-700 text-gray-300 hover:bg-gray-600">
                    <Phone className="w-3 h-3" />
                    Phone
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
