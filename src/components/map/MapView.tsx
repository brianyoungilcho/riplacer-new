import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import type { MapSearchResult, Prospect } from '@/types';

interface MapViewProps {
  searchResults: MapSearchResult[];
  onMarkerClick: (result: MapSearchResult) => void;
  center: [number, number];
  onMapMove?: (center: [number, number]) => void;
}

export function MapView({ searchResults, onMarkerClick, center, onMapMove }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
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
      style: 'mapbox://styles/mapbox/dark-v11',
      center: center,
      zoom: 11,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.on('moveend', () => {
      if (map.current && onMapMove) {
        const mapCenter = map.current.getCenter();
        onMapMove([mapCenter.lng, mapCenter.lat]);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Update center when it changes
  useEffect(() => {
    if (map.current) {
      map.current.flyTo({
        center: center,
        zoom: 11,
        duration: 1500,
      });
    }
  }, [center]);

  // Update markers when search results change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add new markers
    searchResults.forEach((result) => {
      const el = document.createElement('div');
      el.className = 'marker-pin';
      el.innerHTML = `
        <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform border-2 border-primary-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;

      el.addEventListener('click', () => {
        onMarkerClick(result);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([result.lng, result.lat])
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Fit bounds to show all markers
    if (searchResults.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      searchResults.forEach(result => {
        bounds.extend([result.lng, result.lat]);
      });
      map.current.fitBounds(bounds, {
        padding: 100,
        maxZoom: 14,
      });
    }
  }, [searchResults, onMarkerClick]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary/50">
        <div className="animate-pulse text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary/50">
        <div className="text-muted-foreground">Map configuration error</div>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}
