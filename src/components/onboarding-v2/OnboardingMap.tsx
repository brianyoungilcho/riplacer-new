import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { type Prospect } from '@/data/us-regions';

// Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHRwb3Y4ZmkwMWRuMmtuenhwZzZteGt2In0.O1jZBxLif7bNLFYwfGrSeg';

interface OnboardingMapProps {
  prospects: Prospect[];
  selectedProspect: Prospect | null;
  onSelectProspect: (prospect: Prospect | null) => void;
  territory: {
    regions: string[];
    states: string[];
    cities: string[];
  };
}

export function OnboardingMap({ 
  prospects, 
  selectedProspect, 
  onSelectProspect,
  territory 
}: OnboardingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add markers for prospects
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add new markers
    prospects.forEach((prospect) => {
      const el = document.createElement('div');
      el.className = 'prospect-marker';
      el.innerHTML = `
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg cursor-pointer transition-transform hover:scale-110"
             style="background-color: ${prospect.riplaceScore >= 80 ? '#16a34a' : prospect.riplaceScore >= 60 ? '#d97706' : '#6b7280'}">
          ${prospect.riplaceScore}
        </div>
      `;

      el.addEventListener('click', () => {
        onSelectProspect(selectedProspect?.id === prospect.id ? null : prospect);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([prospect.lng, prospect.lat])
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Fit bounds if there are prospects
    if (prospects.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      prospects.forEach(p => bounds.extend([p.lng, p.lat]));
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [prospects, mapLoaded, selectedProspect, onSelectProspect]);

  // Pan to selected prospect
  useEffect(() => {
    if (!map.current || !selectedProspect) return;

    map.current.flyTo({
      center: [selectedProspect.lng, selectedProspect.lat],
      zoom: 10,
      duration: 1000,
    });
  }, [selectedProspect]);

  const handleZoomIn = () => {
    map.current?.zoomIn();
  };

  const handleZoomOut = () => {
    map.current?.zoomOut();
  };

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Draw button (placeholder for future feature) */}
      <div className="absolute top-4 right-4">
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white shadow-sm"
          disabled
          title="Coming soon: Draw custom territories"
        >
          Draw
        </Button>
      </div>

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

      {/* Selected prospect popup */}
      {selectedProspect && (
        <div className="absolute bottom-8 left-4 right-20 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-bold ${
              selectedProspect.riplaceScore >= 80 ? 'text-green-600' : 
              selectedProspect.riplaceScore >= 60 ? 'text-amber-600' : 'text-gray-600'
            }`}>
              {selectedProspect.riplaceScore}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{selectedProspect.name}</div>
              <div className="text-sm text-gray-500">
                {selectedProspect.city}, {selectedProspect.state}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {prospects.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">Map Interface</p>
            <p className="text-sm">Prospects will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}

