import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingData } from './OnboardingPage';

// Prospect type for map markers
interface MapProspect {
  id: string;
  name: string;
  score: number;
  lat?: number;
  lng?: number;
}

// State center coordinates (approximate)
const STATE_CENTERS: Record<string, [number, number]> = {
  'Alabama': [-86.9023, 32.3182],
  'Alaska': [-154.4931, 63.3469],
  'Arizona': [-111.0937, 34.0489],
  'Arkansas': [-92.3731, 35.2010],
  'California': [-119.4179, 36.7783],
  'Colorado': [-105.7821, 39.5501],
  'Connecticut': [-72.7554, 41.6032],
  'Delaware': [-75.5277, 38.9108],
  'Florida': [-81.5158, 27.6648],
  'Georgia': [-83.6431, 32.1656],
  'Hawaii': [-155.5828, 19.8968],
  'Idaho': [-114.7420, 44.0682],
  'Illinois': [-89.3985, 40.6331],
  'Indiana': [-86.1349, 40.2672],
  'Iowa': [-93.0977, 41.8780],
  'Kansas': [-98.4842, 39.0119],
  'Kentucky': [-84.2700, 37.8393],
  'Louisiana': [-91.9623, 30.9843],
  'Maine': [-69.4455, 45.2538],
  'Maryland': [-76.6413, 39.0458],
  'Massachusetts': [-71.3824, 42.4072],
  'Michigan': [-85.6024, 44.3148],
  'Minnesota': [-94.6859, 46.7296],
  'Mississippi': [-89.3985, 32.3547],
  'Missouri': [-91.8318, 37.9643],
  'Montana': [-110.3626, 46.8797],
  'Nebraska': [-99.9018, 41.4925],
  'Nevada': [-116.4194, 38.8026],
  'New Hampshire': [-71.5724, 43.1939],
  'New Jersey': [-74.4057, 40.0583],
  'New Mexico': [-105.8701, 34.5199],
  'New York': [-75.4999, 43.2994],
  'North Carolina': [-79.0193, 35.7596],
  'North Dakota': [-101.0020, 47.5515],
  'Ohio': [-82.9071, 40.4173],
  'Oklahoma': [-97.5164, 35.0078],
  'Oregon': [-120.5542, 43.8041],
  'Pennsylvania': [-77.1945, 41.2033],
  'Rhode Island': [-71.4774, 41.5801],
  'South Carolina': [-81.1637, 33.8361],
  'South Dakota': [-99.9018, 43.9695],
  'Tennessee': [-86.5804, 35.5175],
  'Texas': [-99.9018, 31.9686],
  'Utah': [-111.0937, 39.3200],
  'Vermont': [-72.5778, 44.5588],
  'Virginia': [-78.6569, 37.4316],
  'Washington': [-120.7401, 47.7511],
  'West Virginia': [-80.4549, 38.5976],
  'Wisconsin': [-89.6165, 43.7844],
  'Wyoming': [-107.2903, 43.0760],
};

// Region centers
const REGION_CENTERS: Record<string, [number, number]> = {
  'Northeast': [-74.0060, 42.5],
  'Southeast': [-84.0, 33.0],
  'Midwest': [-93.0, 42.0],
  'Southwest': [-105.0, 33.0],
  'West': [-119.0, 40.0],
};

// State name to abbreviation for Mapbox tileset matching
const STATE_TO_ABBREV: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
};

interface OnboardingMapProps {
  data: OnboardingData;
  step: number;
  prospects?: MapProspect[];
  selectedProspectId?: string | null;
  onProspectClick?: (id: string) => void;
}

export function OnboardingMap({ data, step, prospects = [], selectedProspectId, onProspectClick }: OnboardingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(3.5);

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (!data?.token) throw new Error('No token received');
        setMapboxToken(data.token);
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
        setError('Map configuration error');
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 3.5,
    });

    map.current.on('load', () => {
      // Add source for state boundaries using free GeoJSON from public CDN
      if (map.current && !map.current.getSource('us-states')) {
        map.current.addSource('us-states', {
          type: 'geojson',
          data: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
        });

        // Add fill layer for selected states (15% red fill - Option B)
        map.current.addLayer({
          id: 'state-fills',
          type: 'fill',
          source: 'us-states',
          paint: {
            'fill-color': '#ef4444',
            'fill-opacity': 0
          }
        });

        // Add border layer for selected states (2px red border - Option B)
        map.current.addLayer({
          id: 'state-borders',
          type: 'line',
          source: 'us-states',
          paint: {
            'line-color': '#ef4444',
            'line-width': 0
          }
        });
      }
      
      setMapLoaded(true);
    });

    // Listen for source data to finish loading
    map.current.on('sourcedata', (e) => {
      if (e.sourceId === 'us-states' && e.isSourceLoaded) {
        setSourceLoaded(true);
      }
    });

    // Track zoom level for dynamic marker sizing
    map.current.on('zoom', () => {
      if (map.current) {
        setZoomLevel(map.current.getZoom());
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);
  
  // Update state highlighting when selected states change
  useEffect(() => {
    if (!map.current || !mapLoaded || !sourceLoaded) return;
    
    // The GeoJSON uses full state names in the 'name' property
    const selectedStateNames = data.states;
    
    console.log('🗺️ Updating map highlighting for states:', selectedStateNames);
    
    if (selectedStateNames.length > 0) {
      // Update fill layer - highlight selected states
      map.current.setPaintProperty('state-fills', 'fill-opacity', [
        'case',
        ['in', ['get', 'name'], ['literal', selectedStateNames]],
        0.15, // 15% opacity for selected states
        0     // transparent for unselected
      ]);
      
      // Update border layer
      map.current.setPaintProperty('state-borders', 'line-width', [
        'case',
        ['in', ['get', 'name'], ['literal', selectedStateNames]],
        2,  // 2px border for selected states
        0   // no border for unselected
      ]);
    } else {
      // No states selected - hide all highlights
      map.current.setPaintProperty('state-fills', 'fill-opacity', 0);
      map.current.setPaintProperty('state-borders', 'line-width', 0);
    }
  }, [data.states, mapLoaded, sourceLoaded]);

  // Update map view based on territory selections
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    let center: [number, number] = [-98.5795, 39.8283];
    let zoom = 3.5;

    if (data.cities.length > 0 && data.states.length > 0) {
      // Zoom to first selected state when cities are selected
      const firstState = data.states[0];
      if (firstState && STATE_CENTERS[firstState]) {
        center = STATE_CENTERS[firstState];
        zoom = 7;
      }
    } else if (data.states.length > 0) {
      if (data.states.length === 1) {
        const stateCenter = STATE_CENTERS[data.states[0]];
        if (stateCenter) {
          center = stateCenter;
          zoom = 6;
        }
      } else {
        // Average center of all selected states
        const coords = data.states
          .map(s => STATE_CENTERS[s])
          .filter(Boolean) as [number, number][];
        if (coords.length > 0) {
          center = [
            coords.reduce((sum, c) => sum + c[0], 0) / coords.length,
            coords.reduce((sum, c) => sum + c[1], 0) / coords.length,
          ];
          zoom = 4.5;
        }
      }
    } else if (data.region) {
      const regionCenter = REGION_CENTERS[data.region];
      if (regionCenter) {
        center = regionCenter;
        zoom = 5;
      }
    }

    map.current.flyTo({
      center,
      zoom,
      duration: 1500,
    });
  }, [data.region, data.states, data.cities, mapLoaded]);

  // Create marker element for a prospect (Airbnb-style pill)
  // Dynamic sizing based on zoom level (like Airbnb)
  const getMarkerScale = useCallback((zoom: number) => {
    if (zoom < 5) return 0.7;      // Very zoomed out - smaller pills
    if (zoom < 7) return 0.85;     // Medium zoom
    if (zoom < 9) return 1;        // Normal size
    return 1.1;                     // Zoomed in - slightly larger
  }, []);

  const createMarkerElement = useCallback((prospect: MapProspect, isSelected: boolean, zoom: number) => {
    const el = document.createElement('div');
    el.className = 'prospect-marker';
    
    const scale = getMarkerScale(zoom);
    const selectedStyles = isSelected 
      ? 'ring-2 ring-red-500 ring-offset-2 scale-110' 
      : 'hover:scale-105';
    
    // At very low zoom, show only score badge (like Airbnb's clustered view)
    const showName = zoom >= 6;
    
    el.innerHTML = showName ? `
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg cursor-pointer transition-all duration-200 ${selectedStyles} bg-white border border-gray-200" style="transform: scale(${scale}); transform-origin: bottom center;">
        <span class="text-xs font-semibold text-gray-900 whitespace-nowrap max-w-[100px] truncate">${prospect.name}</span>
        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">${prospect.score}</span>
      </div>
    ` : `
      <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg cursor-pointer transition-all duration-200 ${selectedStyles} bg-red-500 text-white border-2 border-white" style="transform: scale(${scale}); transform-origin: center;">
        <span class="text-xs font-bold">${prospect.score}</span>
      </div>
    `;
    
    el.style.cursor = 'pointer';
    el.style.zIndex = isSelected ? '1000' : '1';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onProspectClick?.(prospect.id);
    });
    
    return el;
  }, [onProspectClick, getMarkerScale]);

  // Update prospect markers when prospects or zoom changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    // Remove old markers that are no longer in the prospects list
    const currentIds = new Set(prospects.map(p => p.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
    
    // Add or update markers for each prospect
    prospects.forEach(prospect => {
      if (!prospect.lat || !prospect.lng) return;
      
      const isSelected = prospect.id === selectedProspectId;
      const existingMarker = markersRef.current.get(prospect.id);
      
      // Always recreate marker to reflect current zoom level and selection state
      if (existingMarker) {
        existingMarker.remove();
      }
      
      const el = createMarkerElement(prospect, isSelected, zoomLevel);
      const anchor = zoomLevel >= 6 ? 'bottom' : 'center'; // Center anchor for score-only dots
      const marker = new mapboxgl.Marker({ element: el, anchor })
        .setLngLat([prospect.lng, prospect.lat])
        .addTo(map.current!);
      markersRef.current.set(prospect.id, marker);
    });
  }, [prospects, selectedProspectId, mapLoaded, zoomLevel, createMarkerElement]);

  // Initial fit bounds when prospects first load
  const hasFittedBounds = useRef(false);
  useEffect(() => {
    if (!map.current || !mapLoaded || hasFittedBounds.current) return;
    
    if (prospects.length > 0 && step === 5) {
      const validProspects = prospects.filter(p => p.lat && p.lng);
      if (validProspects.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validProspects.forEach(p => {
          if (p.lat && p.lng) {
            bounds.extend([p.lng, p.lat]);
          }
        });
        
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 10,
          duration: 1000
        });
        hasFittedBounds.current = true;
      }
    }
  }, [prospects, mapLoaded, step]);

  // Center map on selected prospect
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedProspectId) return;
    
    const selectedProspect = prospects.find(p => p.id === selectedProspectId);
    if (selectedProspect?.lat && selectedProspect?.lng) {
      map.current.flyTo({
        center: [selectedProspect.lng, selectedProspect.lat],
        zoom: Math.max(map.current.getZoom(), 8), // Zoom in if needed
        duration: 800
      });
    }
  }, [selectedProspectId, prospects, mapLoaded]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();
    };
  }, []);

  const handleZoomIn = () => {
    map.current?.zoomIn();
  };

  const handleZoomOut = () => {
    map.current?.zoomOut();
  };

  if (loading) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium mb-2">Map Interface</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Zoom controls */}
      <div className="absolute bottom-8 right-4 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <Minus className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Territory info overlay - only show states, not region */}
      {data.states.length > 0 && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm max-w-xs">
          <p className="text-sm font-medium text-gray-900">
            {data.states.length} state{data.states.length > 1 ? 's' : ''} selected
          </p>
          {data.states.length <= 3 && (
            <p className="text-xs text-gray-500 mt-1">
              {data.states.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Step 5 - Prospect count overlay */}
      {step === 5 && (
        <div className="absolute bottom-8 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
          <p className="text-sm font-medium text-gray-900">
            {data.filters.length} filters applied
          </p>
          <p className="text-xs text-gray-500">
            Showing prospect locations
          </p>
        </div>
      )}
    </div>
  );
}
