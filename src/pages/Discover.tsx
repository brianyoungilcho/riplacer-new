import { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MapView } from '@/components/map/MapView';
import { SearchPanel } from '@/components/map/SearchPanel';
import { ResultsList } from '@/components/map/ResultsList';
import { ProspectDetailModal } from '@/components/map/ProspectDetailModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MapSearchResult, SearchParams } from '@/types';
import { AlertTriangle } from 'lucide-react';

// Mock search results for dev environment
const MOCK_RESULTS: MapSearchResult[] = [
  {
    place_id: 'mock_1',
    name: 'Springfield Police Department',
    address: '123 Main St, Springfield, IL 62701',
    lat: 39.7817,
    lng: -89.6501,
    phone: '(217) 555-0100',
    website: 'https://springfieldpd.gov',
  },
  {
    place_id: 'mock_2',
    name: 'Springfield Fire Department',
    address: '456 Oak Ave, Springfield, IL 62702',
    lat: 39.7900,
    lng: -89.6440,
    phone: '(217) 555-0200',
    website: 'https://springfieldfire.gov',
  },
  {
    place_id: 'mock_3',
    name: 'Lincoln Elementary School',
    address: '789 Lincoln Blvd, Springfield, IL 62703',
    lat: 39.7750,
    lng: -89.6600,
    phone: '(217) 555-0300',
    website: 'https://sps186.org/lincoln',
  },
  {
    place_id: 'mock_4',
    name: 'Sangamon County Sheriff Office',
    address: '1 County Complex, Springfield, IL 62701',
    lat: 39.7950,
    lng: -89.6350,
    phone: '(217) 555-0400',
    website: 'https://sangamoncounty.gov/sheriff',
  },
  {
    place_id: 'mock_5',
    name: 'City of Springfield - Public Works',
    address: '300 S 7th St, Springfield, IL 62701',
    lat: 39.7980,
    lng: -89.6480,
    phone: '(217) 555-0500',
    website: 'https://springfield.il.us/publicworks',
  },
];

export default function Discover() {
  const [results, setResults] = useState<MapSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<MapSearchResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-89.6501, 39.7817]); // Springfield, IL default
  
  const { toast } = useToast();

  // Load territory from localStorage on mount
  useEffect(() => {
    const territory = localStorage.getItem('riplacer_territory');
    if (territory) {
      const { state, city } = JSON.parse(territory);
      // In a real app, we'd geocode this to get coordinates
      // For now, just show a toast indicating territory is loaded
      if (state || city) {
        toast({
          title: 'Territory loaded',
          description: `Searching in ${city ? `${city}, ` : ''}${state}`,
        });
      }
    }
  }, []);

  const handleSearch = useCallback(async (params: SearchParams) => {
    setLoading(true);
    setResults([]);
    setUseMockData(false);
    
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
        throw new Error('No results');
      }
    } catch (error) {
      console.error('Search error:', error);
      
      // Use mock data in dev
      toast({
        title: 'Using sample data',
        description: 'Search service unavailable. Showing sample prospects.',
      });
      
      setUseMockData(true);
      setResults(MOCK_RESULTS);
      setMapCenter([MOCK_RESULTS[0].lng, MOCK_RESULTS[0].lat]);
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
        <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900">
          {/* Mock data indicator */}
          {useMockData && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-500">Dev: Mock Data</span>
            </div>
          )}
          
          <SearchPanel 
            onSearch={handleSearch} 
            loading={loading}
            resultsCount={results.length}
          />
          <div className="border-t border-gray-800" />
          <ResultsList 
            results={results} 
            onResultClick={handleResultClick}
            selectedId={selectedProspect?.place_id}
          />
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {results.length === 0 && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-center p-8 z-10">
              <h3 className="text-xl font-bold text-white mb-2">
                Start hunting
              </h3>
              <p className="text-gray-400 max-w-sm">
                Search for government agencies in your territory. 
                Try "police department" or "fire station" in your city.
              </p>
            </div>
          )}
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
        isMockData={useMockData}
      />
    </AppLayout>
  );
}
