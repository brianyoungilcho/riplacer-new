# Performance Analysis & Optimization Options

## 🔴 Critical Performance Issues Identified

### 1. **Aggressive Polling (HIGH IMPACT)**
**Issue**: Polling every 3 seconds with `processNextJob: true` triggers heavy backend processing on every request
- Location: `useDiscoveryPolling.ts:30`
- Impact: Backend processes jobs on every poll, causing server load and blocking responses
- Current: 20 requests/minute per active session

**Options:**
- **Option A (Recommended)**: Increase polling interval to 5-8 seconds, only process jobs on first poll
- **Option B**: Use exponential backoff (3s → 5s → 8s → 10s)
- **Option C**: Only poll when tab is visible (use Page Visibility API)

### 2. **Excessive Re-renders (HIGH IMPACT)**
**Issue**: Full state replacement on every poll causes unnecessary re-renders
- Location: `useDiscoverySession.ts:192`
- Impact: All components re-render even when data hasn't changed
- Current: Complete state object replacement triggers React reconciliation

**Options:**
- **Option A (Recommended)**: Use shallow comparison before updating state
- **Option B**: Use React.memo on ProspectDossierCard components
- **Option C**: Split state into separate pieces (prospects, jobs, progress)

### 3. **Unmemoized Callbacks (MEDIUM IMPACT)**
**Issue**: `onProspectsChange` callback recreated on every render
- Location: `DiscoveryV2Tab.tsx:206`
- Impact: Parent component re-renders unnecessarily
- Current: Callback dependency causes OnboardingPage to re-render

**Options:**
- **Option A (Recommended)**: Memoize `onProspectsChange` with useCallback
- **Option B**: Use refs for callbacks that don't need to trigger re-renders

### 4. **Blocking localStorage Writes (MEDIUM IMPACT)**
**Issue**: Synchronous localStorage writes on every state change
- Location: `OnboardingPage.tsx:99`
- Impact: Blocks main thread, especially with large data objects
- Current: Writes entire onboarding data object on every change

**Options:**
- **Option A (Recommended)**: Debounce localStorage writes (wait 500ms after last change)
- **Option B**: Use requestIdleCallback for non-critical writes
- **Option C**: Only save essential data, not full state

### 5. **Expensive Filtering/Sorting (MEDIUM IMPACT)**
**Issue**: Filtering and sorting runs on every prospects array change
- Location: `DiscoveryV2Tab.tsx:151`
- Impact: O(n log n) sort + filter operations on every update
- Current: Recomputes even when prospects array reference changes but content is same

**Options:**
- **Option A (Recommended)**: Add deep comparison check before recomputing
- **Option B**: Use React.useMemo with proper dependency array
- **Option C**: Virtualize prospect list if >20 items

### 6. **No Search Debouncing (LOW-MEDIUM IMPACT)**
**Issue**: Search filter runs on every keystroke
- Location: `DiscoveryV2Tab.tsx:155`
- Impact: Filtering runs immediately, causing janky typing experience
- Current: No debounce on search input

**Options:**
- **Option A (Recommended)**: Add 300ms debounce to search input
- **Option B**: Use useDeferredValue hook (React 18+)

### 7. **Polling Callback Recreation (LOW IMPACT)**
**Issue**: `poll` callback recreated due to dependencies
- Location: `useDiscoveryPolling.ts:25`
- Impact: Interval cleared and recreated unnecessarily
- Current: `onUpdate` and `onComplete` in dependency array

**Options:**
- **Option A (Recommended)**: Use refs for callbacks instead of dependencies
- **Option B**: Memoize callbacks in parent component

---

## 📊 Recommended Implementation Plan

### Phase 1: Quick Wins (Low Risk, High Impact)
1. ✅ Increase polling interval to 5-6 seconds
2. ✅ Add debounce to localStorage writes (500ms)
3. ✅ Memoize onProspectsChange callback
4. ✅ Add search input debouncing (300ms)

### Phase 2: State Optimization (Medium Risk, High Impact)
5. ✅ Add shallow comparison before state updates
6. ✅ Use React.memo on ProspectDossierCard
7. ✅ Fix polling callback dependencies with refs

### Phase 3: Advanced Optimizations (Lower Priority)
8. ⚠️ Consider virtual scrolling if prospect list grows >50 items
9. ⚠️ Implement Page Visibility API for polling
10. ⚠️ Split state management if needed

---

## 🎯 Expected Performance Improvements

- **Reduced API calls**: 60% reduction (20/min → 8/min)
- **Reduced re-renders**: 70-80% reduction
- **Smoother typing**: Eliminated jank from search filtering
- **Faster initial load**: Reduced localStorage blocking
- **Better memory**: Fewer object allocations

---

## ⚠️ Breaking Changes Assessment

**All proposed changes are NON-BREAKING:**
- Polling interval change: No API contract change
- State comparison: Internal optimization only
- Memoization: Performance optimization, no behavior change
- Debouncing: UX improvement, no functional change

---

## 🔧 Implementation Details

See individual option implementations below. Each can be implemented independently.



