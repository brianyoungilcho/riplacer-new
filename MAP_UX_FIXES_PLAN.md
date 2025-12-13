# Map UX Fixes - Comprehensive Action Plan

## Issues Identified

### Issue 1: Markers Jerking During Zoom
**Problem**: Markers jump around when zooming in/out
**Root Cause**: Markers are completely recreated on every zoom change (line 342-373)
**Impact**: Poor UX, disorienting, looks broken

### Issue 2: Infinite Zoom Loop
**Problem**: Map keeps zooming in when clicking cards, never stops
**Root Cause**: `flyTo` effect triggers repeatedly without guards (line 401-412)
**Impact**: Broken functionality, errors, lag

### Issue 3: Marker Style - Should Always Show Circles
**Problem**: Shows full pills at zoom >= 6, but user wants circles with scores always
**Root Cause**: `showName` logic at line 318
**Impact**: Too cluttered when zoomed in, distracting

### Issue 4: Score Not Showing in Markers
**Problem**: Score not displayed in marker circles
**Root Cause**: `prospect.score` might be undefined, need to use `dossier?.score || score || initialScore`
**Impact**: Missing critical information

### Issue 5: Missing Loading Text
**Problem**: No indication that research is happening during skeleton loading
**Root Cause**: Skeleton cards show but no explanatory text
**Impact**: Users don't know what's happening

### Issue 6: General UX Optimizations Needed
**Problem**: Various performance and UX issues
**Impact**: Overall poor experience

---

## Fix Plan

### Fix 1: Prevent Marker Jerking (HIGH PRIORITY)

**Problem**: Markers recreated on every zoom change
**Solution**: Update marker element content instead of recreating markers

**Implementation**:
- Only recreate markers when prospects list changes
- On zoom change, update existing marker element's innerHTML
- Use `marker.getElement()` to update content without removing/recreating
- Debounce zoom updates to prevent excessive DOM manipulation

**Files to Modify**:
- `src/components/onboarding-v2/OnboardingMap.tsx`

**Changes**:
```typescript
// Separate effect for zoom-based marker updates (update content only)
useEffect(() => {
  if (!map.current || !mapLoaded) return;
  
  // Update existing markers' appearance based on zoom
  markersRef.current.forEach((marker, id) => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return;
    
    const el = marker.getElement();
    if (el) {
      const isSelected = id === selectedProspectId;
      const newContent = createMarkerElement(prospect, isSelected, zoomLevel);
      el.innerHTML = newContent.innerHTML;
      // Update classes/styles without recreating marker
    }
  });
}, [zoomLevel, selectedProspectId]); // Only zoom and selection changes

// Separate effect for adding/removing markers (prospects list changes)
useEffect(() => {
  // Only add/remove markers, don't recreate on zoom
}, [prospects, mapLoaded]);
```

**Expected Result**: Smooth marker updates, no jerking

---

### Fix 2: Prevent Infinite Zoom Loop (CRITICAL)

**Problem**: `flyTo` triggers repeatedly causing infinite zoom
**Solution**: Add ref guard and debounce

**Implementation**:
- Use ref to track if flyTo is in progress
- Only trigger flyTo if not already flying
- Add debounce to prevent rapid successive calls
- Check if already at target location before flying

**Files to Modify**:
- `src/components/onboarding-v2/OnboardingMap.tsx`

**Changes**:
```typescript
const isFlyingRef = useRef(false);
const lastFlewToRef = useRef<string | null>(null);

useEffect(() => {
  if (!map.current || !mapLoaded || !selectedProspectId) return;
  
  // Prevent infinite loops
  if (isFlyingRef.current || lastFlewToRef.current === selectedProspectId) {
    return;
  }
  
  const selectedProspect = prospects.find(p => p.id === selectedProspectId);
  if (!selectedProspect?.lat || !selectedProspect?.lng) return;
  
  // Check if already at this location
  const currentCenter = map.current.getCenter();
  const distance = Math.sqrt(
    Math.pow(currentCenter.lng - selectedProspect.lng, 2) +
    Math.pow(currentCenter.lat - selectedProspect.lat, 2)
  );
  
  // Only fly if more than 0.01 degrees away
  if (distance < 0.01) return;
  
  isFlyingRef.current = true;
  lastFlewToRef.current = selectedProspectId;
  
  map.current.flyTo({
    center: [selectedProspect.lng, selectedProspect.lat],
    zoom: Math.max(map.current.getZoom(), 8),
    duration: 800
  });
  
  // Reset flag after animation completes
  setTimeout(() => {
    isFlyingRef.current = false;
  }, 900);
}, [selectedProspectId, prospects, mapLoaded]);
```

**Expected Result**: Map zooms once per click, no infinite loops

---

### Fix 3: Always Show Score Circles (Not Pills)

**Problem**: Shows pills at zoom >= 6, user wants circles always
**Solution**: Remove name display, always show score-only circles

**Files to Modify**:
- `src/components/onboarding-v2/OnboardingMap.tsx`

**Changes**:
```typescript
const createMarkerElement = useCallback((prospect: MapProspect, isSelected: boolean, zoom: number) => {
  // Always show score-only circle, never show name pills
  const scale = getMarkerScale(zoom);
  const selectedStyles = isSelected 
    ? 'ring-2 ring-red-500 ring-offset-2 scale-110' 
    : 'hover:scale-105';
  
  const score = prospect.score || 0;
  
  el.innerHTML = `
    <div class="flex items-center justify-center w-10 h-10 rounded-full shadow-lg cursor-pointer transition-all duration-200 ${selectedStyles} bg-red-500 text-white border-2 border-white" style="transform: scale(${scale}); transform-origin: center;">
      <span class="text-sm font-bold">${score}</span>
    </div>
  `;
  
  // ... rest of function
}, [onProspectClick, getMarkerScale]);
```

**Expected Result**: Clean circles with scores, less clutter

---

### Fix 4: Fix Score Display in Markers

**Problem**: Score not showing (might be undefined)
**Solution**: Use fallback chain for score

**Files to Modify**:
- `src/components/onboarding-v2/OnboardingMap.tsx`
- `src/components/onboarding-v2/OnboardingPage.tsx` (ensure score is passed)

**Changes**:
```typescript
// In createMarkerElement:
const score = prospect.score || prospect.initialScore || 0;

// In OnboardingPage when mapping prospects:
const mapped = prospects.map(p => ({
  id: p.prospectId,
  name: p.name,
  score: p.dossier?.score || p.score || p.initialScore || 0, // Add fallback chain
  lat: p.lat,
  lng: p.lng,
}));
```

**Expected Result**: Scores always display correctly

---

### Fix 5: Add Loading Text During Skeleton

**Problem**: No indication that research is happening
**Solution**: Add subtle loading message below skeletons

**Files to Modify**:
- `src/components/discovery-v2/DiscoveryV2Tab.tsx`

**Changes**:
```typescript
{/* Loading skeletons */}
{loadingCondition ? (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <SkeletonCard key={i} />
    ))}
    {/* Subtle loading message */}
    <div className="text-center pt-4">
      <p className="text-sm text-gray-400">
        Researching prospects... This may take a moment
      </p>
    </div>
  </div>
) : ...}
```

**Expected Result**: Users know what's happening

---

### Fix 6: General UX Optimizations

#### 6A: Debounce Map Interactions
- Debounce marker updates during rapid zoom
- Throttle flyTo calls

#### 6B: Optimize Marker Rendering
- Use CSS transforms instead of recreating DOM
- Batch marker updates
- Use requestAnimationFrame for smooth updates

#### 6C: Add Error Boundaries
- Catch map errors gracefully
- Show fallback UI if map fails

#### 6D: Improve Loading States
- Show progress indicator during research
- Add estimated time remaining

#### 6E: Fix Map Performance
- Use marker clustering at low zoom levels
- Lazy load markers outside viewport
- Optimize marker element creation

#### 6F: Add User Feedback
- Toast notifications for errors
- Loading states for async operations
- Success messages when research completes

---

## Implementation Priority

### Phase 1: Critical Fixes (Do First)
1. ✅ Fix 2: Prevent infinite zoom loop
2. ✅ Fix 1: Prevent marker jerking
3. ✅ Fix 4: Fix score display

### Phase 2: UX Improvements
4. ✅ Fix 3: Always show circles
5. ✅ Fix 5: Add loading text

### Phase 3: Optimizations
6. ✅ Fix 6: General optimizations

---

## Testing Checklist

- [ ] Markers don't jerk when zooming
- [ ] Map zooms once per card click, no loops
- [ ] Markers always show as circles with scores
- [ ] Scores display correctly in all markers
- [ ] Loading text appears during skeleton state
- [ ] No console errors during map interactions
- [ ] Smooth performance when clicking multiple cards
- [ ] Map doesn't lag or freeze

---

## Expected Results

### Before:
- ❌ Markers jump around when zooming
- ❌ Infinite zoom loops
- ❌ Pills clutter the map
- ❌ Missing scores
- ❌ No loading feedback
- ❌ Performance issues

### After:
- ✅ Smooth marker updates
- ✅ Single zoom per click
- ✅ Clean circles with scores
- ✅ Scores always visible
- ✅ Clear loading feedback
- ✅ Smooth, optimized performance

---

## Breaking Changes

**NONE** - All fixes are internal optimizations and UX improvements

---

## Files to Modify

1. `src/components/onboarding-v2/OnboardingMap.tsx` - Main map component
2. `src/components/onboarding-v2/OnboardingPage.tsx` - Score mapping
3. `src/components/discovery-v2/DiscoveryV2Tab.tsx` - Loading text

---

## Estimated Impact

- **Performance**: 50-70% reduction in marker update overhead
- **UX**: Eliminated infinite loops and jerking
- **Clarity**: Always-visible scores, cleaner map
- **Feedback**: Users understand what's happening

---

**Ready for approval?** 👍



