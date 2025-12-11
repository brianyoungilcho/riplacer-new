import { MapSearchResult } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Globe, Phone, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface ResultsListProps {
  results: MapSearchResult[];
  onResultClick: (result: MapSearchResult) => void;
  selectedId?: string;
  onFavorite: (prospectId: string, favorited: boolean) => void;
}

export function ResultsList({ results, onResultClick, selectedId, onFavorite }: ResultsListProps) {
  const { user } = useAuth();
  const [favoritedIds, setFavoritedIds] = useState(new Set());

  useEffect(() => {
    // Load favorited from localStorage or Supabase
    if (user) {
      // Mock: fetch from favorites table
      const mockFavorited = results.slice(0, 2).map(p => p.place_id); // Simulate some favorited
      setFavoritedIds(new Set(mockFavorited));
    } else {
      const saved = localStorage.getItem('riplacer_favorites');
      if (saved) {
        setFavoritedIds(new Set(JSON.parse(saved)));
      }
    }
  }, [results, user]);

  const toggleFavorite = async (prospectId) => {
    const newFavorited = new Set(favoritedIds);
    if (newFavorited.has(prospectId)) {
      newFavorited.delete(prospectId);
    } else {
      newFavorited.add(prospectId);
    }
    setFavoritedIds(newFavorited);

    if (user) {
      // Mock Supabase insert/delete
      console.log('Saving favorite to DB:', prospectId);
    } else {
      localStorage.setItem('riplacer_favorites', JSON.stringify(Array.from(newFavorited)));
    }

    if (onFavorite) onFavorite(prospectId, newFavorited.has(prospectId));
  };

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
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(result.place_id);
              }}
              className={cn(
                "p-2 rounded-full transition-colors",
                favoritedIds.has(result.place_id)
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10"
              )}
              title={favoritedIds.has(result.place_id) ? 'Unfavorite' : 'Favorite'}
            >
              <Star 
                className={cn("w-5 h-5", favoritedIds.has(result.place_id) && "fill-current")} 
              />
            </button>
            <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
          </div>

          {/* Footer link if favorited */}
          {favoritedIds.has(result.place_id) && (
            <div className="mt-4 pt-3 border-t border-gray-700">
              <Link 
                to="/favorites" 
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View in Favorites
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
