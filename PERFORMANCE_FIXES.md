# Performance Fix Implementation Guide

## Option 1: Increase Polling Interval & Optimize Processing

**Impact**: HIGH - Reduces server load by 60%
**Risk**: LOW - No breaking changes

### Changes:

```typescript
// src/hooks/useDiscoveryPolling.ts
// Change intervalMs default from 3000 to 6000 (6 seconds)
// Only process jobs on first poll, not every poll

// src/components/discovery-v2/DiscoveryV2Tab.tsx
// Change intervalMs from 3000 to 6000
```

**Benefits:**
- Reduces API calls from 20/min to 10/min per session
- Less server processing overhead
- Still responsive enough for real-time updates

---

## Option 2: Shallow State Comparison

**Impact**: HIGH - Reduces re-renders by 70-80%
**Risk**: LOW - Internal optimization only

### Changes:

```typescript
// src/hooks/useDiscoverySession.ts
// Add shallow comparison before setSessionState
// Only update if data actually changed
```

**Benefits:**
- Prevents unnecessary re-renders
- React reconciliation only runs when needed
- Smoother UI updates

---

## Option 3: Memoize Callbacks

**Impact**: MEDIUM - Reduces parent re-renders
**Risk**: LOW - Performance optimization

### Changes:

```typescript
// src/components/discovery-v2/DiscoveryV2Tab.tsx
// Wrap onProspectsChange in useCallback
// Memoize with proper dependencies
```

**Benefits:**
- Prevents OnboardingPage from re-rendering unnecessarily
- Better React performance
- Cleaner component tree updates

---

## Option 4: Debounce localStorage Writes

**Impact**: MEDIUM - Eliminates blocking writes
**Risk**: LOW - UX improvement

### Changes:

```typescript
// src/components/onboarding-v2/OnboardingPage.tsx
// Add debounce to localStorage writes (500ms)
// Use useRef to track timeout
```

**Benefits:**
- No more blocking main thread
- Batches multiple writes into one
- Better perceived performance

---

## Option 5: Debounce Search Input

**Impact**: MEDIUM - Smoother typing experience
**Risk**: LOW - UX improvement

### Changes:

```typescript
// src/components/discovery-v2/DiscoveryV2Tab.tsx
// Add 300ms debounce to search query
// Use useDeferredValue or custom debounce hook
```

**Benefits:**
- No jank while typing
- Reduces filter computations
- Better user experience

---

## Option 6: React.memo on Prospect Cards

**Impact**: MEDIUM - Reduces card re-renders
**Risk**: LOW - Performance optimization

### Changes:

```typescript
// src/components/discovery-v2/ProspectDossierCard.tsx
// Wrap component export with React.memo
// Add custom comparison function if needed
```

**Benefits:**
- Cards only re-render when their data changes
- Significant improvement with many prospects
- Better list performance

---

## Option 7: Fix Polling Callback Dependencies

**Impact**: LOW-MEDIUM - Prevents interval recreation
**Risk**: LOW - Internal optimization

### Changes:

```typescript
// src/hooks/useDiscoveryPolling.ts
// Use refs for onUpdate and onComplete callbacks
// Remove from dependency array
```

**Benefits:**
- Interval doesn't restart unnecessarily
- More stable polling behavior
- Fewer API calls

---

## Recommended Implementation Order

1. **Start with Options 1, 4, 5** (Quick wins, low risk)
2. **Then Options 2, 3** (State optimization)
3. **Finally Options 6, 7** (Polish)

All options can be implemented independently and tested separately.



