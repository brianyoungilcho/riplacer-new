import { MapSearchResult } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Globe, Phone, ChevronRight } from 'lucide-react';
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
        <div className="text-center text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Search for prospects to see results here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {results.map((result) => (
        <Card
          key={result.place_id}
          className={cn(
            "p-4 cursor-pointer transition-all duration-200 hover:border-primary/50",
            selectedId === result.place_id && "border-primary bg-primary/5"
          )}
          onClick={() => onResultClick(result)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">
                {result.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {result.address}
              </p>
              <div className="flex items-center gap-3 mt-2">
                {result.website && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Globe className="w-3 h-3" />
                    Website
                  </Badge>
                )}
                {result.phone && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Phone className="w-3 h-3" />
                    Phone
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}
