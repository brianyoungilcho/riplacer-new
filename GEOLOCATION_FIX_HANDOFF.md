# Geolocation Fix - Backend Handoff Document

## Issue Summary

Prospects are appearing randomly scattered on the map instead of at their precise locations. Currently, the system uses random offsets from state centers instead of geocoding actual addresses.

## Current Implementation

### Problem
- **Location**: `supabase/functions/discover-prospects-v2/index.ts:248-249, 288-289`
- **Issue**: Uses `randomOffset()` to add random coordinates around state centers
- **Impact**: All prospects in a state appear clustered around the state center, not at their actual locations

### Current Code Pattern:
```typescript
const stateCenter = STATE_CENTERS[p.state] || { lat: 39.8283, lng: -98.5795 };
prospect_lat: stateCenter.lat + randomOffset(1.0),  // Random ±0.5 degrees
prospect_lng: stateCenter.lng + randomOffset(1.5),  // Random ±0.75 degrees
```

---

## Fix Implemented (Frontend)

### ✅ What Was Fixed
1. **Added Geocoding Function**: Created `geocodeProspect()` that uses Mapbox Geocoding API
2. **Geocoding Strategy**:
   - Primary: Try `${organizationName}, ${city}, ${state}, USA`
   - Fallback 1: Try `${city}, ${state}, USA` if organization name fails
   - Fallback 2: Use state center + small random offset if geocoding fails
3. **Updated Prospect Creation**: Now geocodes each prospect before saving

### Implementation Details
- Uses existing `MAPBOX_ACCESS_TOKEN` environment variable
- Geocodes prospect name + city + state for best accuracy
- Falls back gracefully if geocoding fails
- Logs geocoding results for debugging

---

## Backend Improvements Needed

### Option 1: Enhance AI Prompt to Always Include City (Recommended)
**Current**: AI sometimes omits city field
**Fix**: Update prompt to explicitly require city in response

**Location**: `discover-prospects-v2/index.ts:162-179`

**Change**:
```typescript
const prompt = `...
For each prospect, provide:
- name: Full organization name (e.g., "Boston Police Department")
- city: City name (REQUIRED - must be included)
- state: State name (MUST be from the specified states)
...
`;
```

**Impact**: Ensures city data is always available for geocoding

---

### Option 2: Geocode During Dossier Research
**Current**: Geocoding happens during prospect discovery
**Alternative**: Geocode during dossier research when more address data is available

**Location**: `research-prospect-dossier/index.ts`

**Benefits**:
- More accurate addresses available after research
- Can update coordinates when dossier completes
- Better data for geocoding

**Implementation**:
```typescript
// In research-prospect-dossier, after getting address data:
if (addressData) {
  const geocoded = await geocodeProspect(prospect.name, addressData.city, prospect.state);
  if (geocoded) {
    // Update prospect_dossiers with accurate coordinates
    await supabase
      .from('prospect_dossiers')
      .update({ 
        prospect_lat: geocoded.lat,
        prospect_lng: geocoded.lng 
      })
      .eq('session_id', sessionId)
      .eq('prospect_key', prospectKey);
  }
}
```

---

### Option 3: Batch Geocoding for Performance
**Current**: Geocodes one-by-one (sequential)
**Improvement**: Batch geocode multiple prospects

**Benefits**:
- Faster processing
- Better rate limit management
- More efficient API usage

**Implementation**:
```typescript
// Collect all geocoding requests
const geocodePromises = aiProspects.map(p => 
  geocodeProspect(p.name, p.city, p.state)
);

// Execute in parallel (with rate limiting)
const coordinates = await Promise.all(geocodePromises);
```

**Considerations**:
- Mapbox rate limits: 600 requests/minute
- May need to add delays for large batches
- Consider caching geocoded results

---

### Option 4: Add Address Field to Prospect Data
**Current**: Only has name, city, state
**Enhancement**: Request full address from AI

**Benefits**:
- More accurate geocoding
- Better for display in UI
- Useful for research

**Implementation**:
```typescript
// In prompt:
- address: Full street address if available (e.g., "123 Main St, Springfield, IL 62701")

// In geocoding:
const query = p.address || `${p.name}, ${p.city}, ${p.state}, USA`;
```

---

### Option 5: Cache Geocoded Results
**Current**: Geocodes every time
**Enhancement**: Cache geocoded coordinates

**Benefits**:
- Faster subsequent requests
- Reduces API calls
- Saves costs

**Implementation**:
```typescript
// Check cache first
const cacheKey = `${p.name}_${p.city}_${p.state}`;
const cached = await supabase
  .from('geocode_cache')
  .select('lat, lng')
  .eq('query', cacheKey)
  .single();

if (cached) {
  return { lat: cached.lat, lng: cached.lng };
}

// Geocode and cache
const geocoded = await geocodeProspect(...);
await supabase.from('geocode_cache').insert({
  query: cacheKey,
  lat: geocoded.lat,
  lng: geocoded.lng,
});
```

---

## Testing Checklist

- [ ] Verify Mapbox token is configured (`MAPBOX_ACCESS_TOKEN`)
- [ ] Test geocoding with organization name + city + state
- [ ] Test fallback to city + state if organization name fails
- [ ] Test fallback to state center if geocoding fails
- [ ] Verify coordinates are saved correctly to database
- [ ] Check map displays prospects at correct locations
- [ ] Test with prospects that have no city data
- [ ] Monitor Mapbox API rate limits
- [ ] Verify existing prospects (without geocoding) still work

---

## Edge Cases to Handle

1. **Missing City Data**: AI doesn't always provide city
   - **Solution**: Fallback to state center + small offset

2. **Geocoding Fails**: API returns no results
   - **Solution**: Use state center + small random offset

3. **Rate Limiting**: Too many geocoding requests
   - **Solution**: Add delays, batch processing, or caching

4. **Invalid Coordinates**: Geocoding returns coordinates outside state
   - **Solution**: Validate coordinates are within state bounds

5. **Existing Prospects**: Prospects created before fix
   - **Solution**: Migration script to geocode existing prospects

---

## Migration for Existing Data

If you want to update existing prospects with accurate coordinates:

```sql
-- Find prospects with coordinates near state centers (likely random)
-- and update them with geocoded coordinates

-- This would require:
-- 1. Fetch all prospects
-- 2. Geocode each one
-- 3. Update coordinates in database
```

**Recommendation**: Only geocode new prospects going forward, or run a one-time migration script.

---

## Performance Considerations

- **Geocoding adds latency**: ~100-300ms per prospect
- **For 8 prospects**: ~800ms - 2.4s additional time
- **Rate limits**: Mapbox allows 600 requests/minute
- **Cost**: Mapbox Geocoding API pricing applies

**Optimization**: Consider async geocoding - don't block prospect creation, update coordinates later.

---

## Files Modified

1. `supabase/functions/discover-prospects-v2/index.ts`
   - Added `geocodeProspect()` function
   - Updated prospect creation to use geocoded coordinates
   - Added fallback logic

---

## Next Steps for Backend Engineer

1. **Review the geocoding implementation** - ensure it works correctly
2. **Test with real data** - verify coordinates are accurate
3. **Consider Option 1** - enhance AI prompt to always include city
4. **Consider Option 2** - geocode during dossier research for better accuracy
5. **Monitor performance** - check geocoding latency and rate limits
6. **Consider caching** - if geocoding becomes a bottleneck

---

## Questions to Answer

1. Should we geocode during discovery or during dossier research?
2. Do we need to migrate existing prospects?
3. Should we cache geocoded results?
4. Are there any Mapbox API limits we need to be aware of?
5. Should geocoding be async (non-blocking)?

