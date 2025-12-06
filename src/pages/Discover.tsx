import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MapView } from '@/components/map/MapView';
import { SearchPanel } from '@/components/map/SearchPanel';
import { ResultsList } from '@/components/map/ResultsList';
import { ProspectDetailModal } from '@/components/map/ProspectDetailModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MapSearchResult, SearchParams } from '@/types';

export default function Discover() {
  const [results, setResults] = useState<MapSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<MapSearchResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-87.6298, 41.8781]); // Chicago default
  
  const { toast } = useToast();

  const handleSearch = useCallback(async (params: SearchParams) => {
    setLoading(true);
    setResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-places', {
        body: {
          query: params.query,
          location: params.location,
          radius: params.radius,
        }
      });

      if (error) throw error;

      if (data.results && data.results.length > 0) {
        setResults(data.results);
        // Center map on first result
        if (data.results[0]) {
          setMapCenter([data.results[0].lng, data.results[0].lat]);
        }
        toast({
          title: `Found ${data.results.length} prospects`,
          description: 'Click on a pin or result to view details',
        });
      } else {
        toast({
          title: 'No results found',
          description: 'Try adjusting your search terms or location',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: 'Could not complete the search. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleMarkerClick = useCallback((result: MapSearchResult) => {
    setSelectedProspect(result);
    setModalOpen(true);
  }, []);

  const handleResultClick = useCallback((result: MapSearchResult) => {
    setSelectedProspect(result);
    setModalOpen(true);
    setMapCenter([result.lng, result.lat]);
  }, []);

  return (
    <AppLayout>
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Search & Results */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          <SearchPanel 
            onSearch={handleSearch} 
            loading={loading}
            resultsCount={results.length}
          />
          <div className="border-t border-border" />
          <ResultsList 
            results={results} 
            onResultClick={handleResultClick}
            selectedId={selectedProspect?.place_id}
          />
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapView
            searchResults={results}
            onMarkerClick={handleMarkerClick}
            center={mapCenter}
            onMapMove={setMapCenter}
          />
        </div>
      </div>

      {/* Detail Modal */}
      <ProspectDetailModal
        prospect={selectedProspect}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaveToTargets={() => {}}
      />
    </AppLayout>
  );
}
