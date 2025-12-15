import { lazy, Suspense, memo } from 'react';
import { Loader2 } from 'lucide-react';
import type { OnboardingData } from './OnboardingPage';

// Lazy load the map component (which includes heavy mapbox-gl library ~500KB)
const OnboardingMap = lazy(() => 
  import('./OnboardingMap').then(module => ({ default: module.OnboardingMap }))
);

// Prospect type for map markers
interface MapProspect {
  id: string;
  name: string;
  score: number;
  lat?: number;
  lng?: number;
}

interface LazyOnboardingMapProps {
  data: OnboardingData;
  step: number;
  prospects?: MapProspect[];
  selectedProspectId?: string | null;
  onProspectClick?: (id: string) => void;
  onMapClick?: () => void;
}

// Map skeleton that matches the real map's loading state
function MapSkeleton() {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading map...</p>
      </div>
      
      {/* Fake zoom controls to maintain layout consistency */}
      <div className="absolute bottom-8 right-4 flex flex-col gap-1">
        <div className="w-10 h-10 rounded-full bg-white/50 shadow-md" />
        <div className="w-10 h-10 rounded-full bg-white/50 shadow-md" />
      </div>
    </div>
  );
}

// Memoized wrapper to prevent unnecessary re-renders during parent state changes
export const LazyOnboardingMap = memo(function LazyOnboardingMap(props: LazyOnboardingMapProps) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <OnboardingMap {...props} />
    </Suspense>
  );
});

export default LazyOnboardingMap;

