import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Minus, Loader2 } from 'lucide-react';
import type { OnboardingData } from './OnboardingPage';

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
  'Alabama': [32.3182, -86.9023],
  'Alaska': [63.3469, -154.4931],
  'Arizona': [34.0489, -111.0937],
  'Arkansas': [35.2010, -92.3731],
  'California': [36.7783, -119.4179],
  'Colorado': [39.5501, -105.7821],
  'Connecticut': [41.6032, -72.7554],
  'Delaware': [38.9108, -75.5277],
  'Florida': [27.6648, -81.5158],
  'Georgia': [32.1656, -83.6431],
  'Hawaii': [19.8968, -155.5828],
  'Idaho': [44.0682, -114.7420],
  'Illinois': [40.6331, -89.3985],
  'Indiana': [40.2672, -86.1349],
  'Iowa': [41.8780, -93.0977],
  'Kansas': [39.0119, -98.4842],
  'Kentucky': [37.8393, -84.2700],
  'Louisiana': [30.9843, -91.9623],
  'Maine': [45.2538, -69.4455],
  'Maryland': [39.0458, -76.6413],
  'Massachusetts': [42.4072, -71.3824],
  'Michigan': [44.3148, -85.6024],
  'Minnesota': [46.7296, -94.6859],
  'Mississippi': [32.3547, -89.3985],
  'Missouri': [37.9643, -91.8318],
  'Montana': [46.8797, -110.3626],
  'Nebraska': [41.4925, -99.9018],
  'Nevada': [38.8026, -116.4194],
  'New Hampshire': [43.1939, -71.5724],
  'New Jersey': [40.0583, -74.4057],
  'New Mexico': [34.5199, -105.8701],
  'New York': [43.2994, -75.4999],
  'North Carolina': [35.7596, -79.0193],
  'North Dakota': [47.5515, -101.0020],
  'Ohio': [40.4173, -82.9071],
  'Oklahoma': [35.0078, -97.5164],
  'Oregon': [43.8041, -120.5542],
  'Pennsylvania': [41.2033, -77.1945],
  'Rhode Island': [41.5801, -71.4774],
  'South Carolina': [33.8361, -81.1637],
  'South Dakota': [43.9695, -99.9018],
  'Tennessee': [35.5175, -86.5804],
  'Texas': [31.9686, -99.9018],
  'Utah': [39.3200, -111.0937],
  'Vermont': [44.5588, -72.5778],
  'Virginia': [37.4316, -78.6569],
  'Washington': [47.7511, -120.7401],
  'West Virginia': [38.5976, -80.4549],
  'Wisconsin': [43.7844, -89.6165],
  'Wyoming': [43.0760, -107.2903],
};

interface LeafletMapProps {
  data: OnboardingData;
  step: number;
  prospects?: MapProspect[];
  selectedProspectId?: string | null;
  onProspectClick?: (id: string) => void;
  onMapClick?: () => void;
}

// Custom hook to handle map events
function MapEventHandler({ onMapClick }: { onMapClick?: () => void }) {
  useMapEvents({
    click: (e) => {
      // Only trigger if clicking on the map itself, not on markers
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.prospect-marker') && !target.closest('.leaflet-marker-icon')) {
        onMapClick?.();
      }
    },
  });
  return null;
}

// Component to handle map view changes
function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [map, center, zoom]);
  
  return null;
}

// Custom zoom controls component
function ZoomControls() {
  const map = useMap();
  
  return (
    <div className="absolute bottom-8 right-4 flex flex-col gap-1 z-[1000]">
      <button
        onClick={() => map.zoomIn()}
        className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-5 h-5 text-gray-700" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        <Minus className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
}

// Prospect marker component
function ProspectMarker({ 
  prospect, 
  isSelected, 
  onClick,
  zoom 
}: { 
  prospect: MapProspect; 
  isSelected: boolean; 
  onClick: () => void;
  zoom: number;
}) {
  if (!prospect.lat || !prospect.lng) return null;
  
  const score = prospect.score || 0;
  const showName = zoom >= 8;
  
  // Create custom div icon
  const icon = useMemo(() => {
    const size = isSelected ? 'scale-110' : '';
    const ring = isSelected ? 'ring-2 ring-red-500 ring-offset-2' : '';
    
    const html = showName
      ? `<div class="prospect-marker flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg cursor-pointer transition-all duration-200 bg-white border border-gray-200 ${size} ${ring}" style="white-space: nowrap;">
          <span class="text-xs font-semibold text-gray-900 max-w-[120px] truncate">${prospect.name}</span>
          <span class="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex-shrink-0">${score}</span>
        </div>`
      : `<div class="prospect-marker flex items-center justify-center w-10 h-10 rounded-full shadow-lg cursor-pointer transition-all duration-200 bg-red-500 text-white border-2 border-white ${size} ${ring}">
          <span class="text-sm font-bold">${score}</span>
        </div>`;
    
    return L.divIcon({
      html,
      className: 'custom-marker',
      iconSize: showName ? [150, 32] : [40, 40],
      iconAnchor: showName ? [75, 32] : [20, 20],
    });
  }, [prospect.name, score, isSelected, showName]);
  
  return (
    <Marker
      position={[prospect.lat, prospect.lng]}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          onClick();
        },
      }}
    />
  );
}

// Component to track zoom level
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  
  return null;
}

export function LeafletMap({ 
  data, 
  step, 
  prospects = [], 
  selectedProspectId, 
  onProspectClick, 
  onMapClick 
}: LeafletMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(4);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  // Fetch US states GeoJSON
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
      .then(res => res.json())
      .then(data => {
        setGeoJsonData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load GeoJSON:', err);
        setLoading(false);
      });
  }, []);

  // Calculate map center and zoom based on selected states
  const { center, zoom } = useMemo(() => {
    let c: [number, number] = [39.8283, -98.5795]; // Center of US
    let z = 4;

    if (data.cities.length > 0 && data.states.length > 0) {
      const firstState = data.states[0];
      if (firstState && STATE_CENTERS[firstState]) {
        c = STATE_CENTERS[firstState];
        z = 7;
      }
    } else if (data.states.length > 0) {
      if (data.states.length === 1) {
        const stateCenter = STATE_CENTERS[data.states[0]];
        if (stateCenter) {
          c = stateCenter;
          z = 6;
        }
      } else {
        const coords = data.states
          .map(s => STATE_CENTERS[s])
          .filter(Boolean) as [number, number][];
        if (coords.length > 0) {
          c = [
            coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length,
            coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length,
          ];
          z = 4.5;
        }
      }
    }

    return { center: c, zoom: z };
  }, [data.states, data.cities]);

  // Style function for GeoJSON
  const getStateStyle = useCallback((feature: any) => {
    const stateName = feature?.properties?.name;
    const isSelected = data.states.includes(stateName);
    
    return {
      fillColor: isSelected ? '#ef4444' : 'transparent',
      fillOpacity: isSelected ? 0.15 : 0,
      color: isSelected ? '#ef4444' : 'transparent',
      weight: isSelected ? 2 : 0,
    };
  }, [data.states]);

  // Fly to selected prospect
  useEffect(() => {
    if (selectedProspectId) {
      const prospect = prospects.find(p => p.id === selectedProspectId);
      if (prospect?.lat && prospect?.lng) {
        // Map will handle this via the MapViewController
      }
    }
  }, [selectedProspectId, prospects]);

  // Handle zoom changes
  const handleZoomChange = useCallback((zoom: number) => {
    setZoomLevel(zoom);
  }, []);

  if (loading) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-100" style={{ minHeight: '400px' }}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: '400px' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* OpenStreetMap tiles - free and reliable */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {/* State boundaries with highlighting */}
        {geoJsonData && (
          <GeoJSON
            ref={geoJsonRef as any}
            data={geoJsonData}
            style={getStateStyle}
            key={data.states.join(',')} // Force re-render when states change
          />
        )}
        
        {/* Prospect markers */}
        {prospects.map(prospect => (
          <ProspectMarker
            key={prospect.id}
            prospect={prospect}
            isSelected={prospect.id === selectedProspectId}
            onClick={() => onProspectClick?.(prospect.id)}
            zoom={zoomLevel}
          />
        ))}
        
        {/* Map event handlers */}
        <MapEventHandler onMapClick={onMapClick} />
        <MapViewController center={center} zoom={zoom} />
        <ZoomTracker onZoomChange={handleZoomChange} />
        <ZoomControls />
      </MapContainer>

      {/* Territory info overlay */}
      {data.states.length > 0 && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm max-w-xs z-[1000]">
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
        <div className="absolute bottom-8 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm z-[1000]">
          <p className="text-sm font-medium text-gray-900">
            {data.filters?.length || 0} filters applied
          </p>
          <p className="text-xs text-gray-500">
            Showing prospect locations
          </p>
        </div>
      )}
    </div>
  );
}

export default LeafletMap;

