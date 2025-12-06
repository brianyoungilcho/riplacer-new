import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Search, MapPin, Loader2 } from 'lucide-react';
import type { SearchParams } from '@/types';

interface SearchPanelProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  resultsCount: number;
}

export function SearchPanel({ onSearch, loading, resultsCount }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState([25]);

  const handleSearch = () => {
    if (!query || !location) return;
    onSearch({
      query,
      location,
      radius: radius[0],
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Discovery</h2>
        <p className="text-sm text-muted-foreground">
          Find prospects in your target market
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search-query">Search Term</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search-query"
              placeholder="e.g., Police Departments"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="location"
              placeholder="e.g., Chicago, IL"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Radius</Label>
            <span className="text-sm font-mono text-muted-foreground">
              {radius[0]} miles
            </span>
          </div>
          <Slider
            value={radius}
            onValueChange={setRadius}
            min={5}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5 mi</span>
            <span>50 mi</span>
            <span>100 mi</span>
          </div>
        </div>

        <Button
          variant="glow"
          className="w-full"
          onClick={handleSearch}
          disabled={!query || !location || loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search
            </>
          )}
        </Button>
      </div>

      {resultsCount > 0 && (
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Results found</span>
            <span className="font-mono font-semibold text-primary">{resultsCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}
