# Discovery Page Issues - Backend Handoff Document

## Date: Dec 15, 2025

## Summary

This document outlines backend-related issues identified in the discovery page that may require backend engineer attention, along with the frontend fixes already implemented.

---

## FRONTEND FIXES IMPLEMENTED (Already Done)

### 1. ✅ Skeleton Loading Animation Not Showing

**File:** `src/index.css`

**Issue:** The shimmer animation CSS was not working properly.

**Fix:** Updated the CSS keyframes to use `transform: translateX()` instead of `left` property for smoother animation:

```css
.skeleton-shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 200%;
  height: 100%;
  background: linear-gradient(...);
  animation: skeleton-shimmer-anim 1.5s ease-in-out infinite;
}

@keyframes skeleton-shimmer-anim {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

### 2. ✅ Map Marker Click Not Updating Left Sidebar

**Files:** 
- `src/components/discovery-v2/DiscoveryV2Tab.tsx`
- `src/components/onboarding-v2/OnboardingMap.tsx`

**Issue:** Clicking a marker on the map wasn't scrolling to and expanding the corresponding prospect card in the list.

**Fix:** 
- Added scroll-into-view functionality when `selectedProspectId` changes
- Added debug logging to trace click handlers
- Used refs to avoid stale closure issues in marker click handlers

### 3. ✅ "Waiting for research to start" Showing When Data Exists

**File:** `src/components/discovery-v2/ProspectDossierCard.tsx`

**Issue:** The card showed "Waiting for research to start..." even when initial dossier data existed from `discover-prospects-v2`.

**Root Cause:** Frontend logic checked `dossierStatus === 'ready'` but the status was 'queued' even though data existed.

**Fix:** Changed logic to prioritize existence of data over status:
```typescript
const hasDossierData = dossier && (dossier.summary || dossier.score);
const isReady = hasDossierData; // Show data if it exists, regardless of status
```

### 4. ✅ Polling Not Processing All Queued Jobs

**File:** `src/hooks/useDiscoveryPolling.ts`

**Issue:** The polling was only calling `processNextJob: true` on the FIRST poll, so only one research job would ever be triggered.

**Fix:** Changed to always pass `processNextJob: true` so all queued jobs eventually get processed:
```typescript
// Before (broken)
const isFirstPoll = pollCount === 0;
body: { sessionId, processNextJob: isFirstPoll }

// After (fixed)
body: { sessionId, processNextJob: true }
```

---

## BACKEND ISSUES REQUIRING ATTENTION

### Issue 1: Job Queue Processing May Be Slow

**Current Behavior:**
- `get-discovery-session` only processes ONE queued job per poll
- Polling interval is 6 seconds
- With 8 prospects, it takes 8 × 6 = 48 seconds minimum to start all research jobs

**Recommendation:**
Consider modifying `get-discovery-session` (or create a new function) to process ALL queued jobs in parallel, not just one per poll call.

**File:** `supabase/functions/get-discovery-session/index.ts`

**Current Code (lines 76-115):**
```typescript
if (processNextJob) {
  const queuedJob = jobs?.find(j => j.status === 'queued');
  if (queuedJob) {
    // Only processes ONE job
  }
}
```

**Suggested Change:**
```typescript
if (processNextJob) {
  const queuedJobs = jobs?.filter(j => j.status === 'queued') || [];
  // Process multiple jobs in parallel (with rate limiting if needed)
  await Promise.all(queuedJobs.slice(0, 3).map(async (queuedJob) => {
    // Process each job...
  }));
}
```

### Issue 2: research-prospect-dossier Fire-and-Forget May Fail Silently

**File:** `supabase/functions/get-discovery-session/index.ts` (lines 93-112)

**Current Behavior:**
```typescript
// Fire and forget - don't await
fetch(dossierUrl, {...}).catch(e => console.error('Background dossier fetch failed:', e));
```

**Problem:** If the fetch fails or the function times out, the job is stuck in 'running' state forever.

**Recommendation:**
1. Implement a job timeout mechanism - if a job is 'running' for more than X minutes, reset it to 'queued'
2. Add retry logic with exponential backoff
3. Consider using Supabase Edge Functions queues or a proper job queue system

### Issue 3: Missing Job Timeout Cleanup

**Problem:** If `research-prospect-dossier` crashes or times out, jobs get stuck in 'running' status.

**Recommendation:** Add cleanup logic in `get-discovery-session`:

```typescript
// Reset stuck jobs (running for more than 2 minutes)
const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
await supabase
  .from('research_jobs')
  .update({ status: 'queued', started_at: null, error: 'Timeout - retrying' })
  .eq('session_id', sessionId)
  .eq('status', 'running')
  .lt('started_at', twoMinutesAgo);
```

---

## TESTING CHECKLIST

After implementing fixes:

1. [ ] Skeleton cards show shimmer animation while loading
2. [ ] Clicking map marker scrolls to and expands the prospect card
3. [ ] Prospect cards show initial data (score, angles, summary) immediately
4. [ ] "Deep research in progress..." indicator shows when data exists but enrichment is ongoing
5. [ ] All 8 research jobs eventually start (not just the first one)
6. [ ] Research completes and updates cards with full dossier data
7. [ ] Clicking map background deselects the current prospect

---

## FILES MODIFIED

### Frontend (Already Done)
- `src/index.css` - Fixed shimmer animation
- `src/hooks/useDiscoveryPolling.ts` - Fixed job processing on every poll
- `src/components/discovery-v2/DiscoveryV2Tab.tsx` - Added scroll-to-view
- `src/components/discovery-v2/ProspectDossierCard.tsx` - Fixed data display logic
- `src/components/onboarding-v2/OnboardingMap.tsx` - Fixed click handler stale closures

### Backend (Needs Review)
- `supabase/functions/get-discovery-session/index.ts` - May need parallel job processing
- `supabase/functions/research-prospect-dossier/index.ts` - May need better error handling/reporting

---

## Contact

Frontend fixes completed by: Cursor AI
Backend review needed by: [Your backend engineer]

