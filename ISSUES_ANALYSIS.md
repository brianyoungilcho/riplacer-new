# Issues Analysis & Fix Options

## Issue 1: Blank Account Data (Dossier Content)

### Problem
When opening individual prospect cards, the dossier content appears blank even though research may have completed.

### Root Causes Identified

**A. Dossier Status Check Too Strict**
- Location: `get-discovery-session/index.ts:127`
- Issue: Dossier data only returned when `status === 'ready'`
- If status is 'researching' or 'queued', dossier field is `undefined`
- Even if dossier data exists in DB, it's not returned until status is 'ready'

**B. Dossier Data Not Being Populated**
- Dossier research jobs may be queued but not executing
- Background job processing might be failing silently
- Dossier data might not be saved to database properly

**C. Shallow Comparison Preventing Updates**
- Location: `useDiscoverySession.ts:216`
- The shallow comparison might be preventing dossier updates from showing
- If only dossier data changes but status doesn't, state might not update

### Fix Options

#### Option 1A: Return Dossier Data Even When Researching (Recommended)
**Impact**: HIGH - Shows partial data immediately
**Risk**: LOW - Non-breaking
**Implementation**:
- Modify `get-discovery-session` to return dossier data if it exists, regardless of status
- Only hide dossier if status is 'failed' or dossier is truly null

**Pros:**
- Users see data as soon as it's available
- Better UX - progressive loading
- No breaking changes

**Cons:**
- Might show incomplete data

---

#### Option 1B: Add Manual Refresh/Dossier Fetch Button
**Impact**: MEDIUM - Gives users control
**Risk**: LOW - Non-breaking
**Implementation**:
- Add "Refresh Dossier" button on prospect cards
- Calls `research-prospect-dossier` endpoint directly
- Shows loading state while fetching

**Pros:**
- User-initiated, explicit action
- Can force refresh stale data
- Good for debugging

**Cons:**
- Requires user action
- Doesn't solve root cause

---

#### Option 1C: Fix Shallow Comparison to Include Dossier Data
**Impact**: MEDIUM - Ensures updates are detected
**Risk**: LOW - Performance optimization
**Implementation**:
- Update `isStateEqual` to compare dossier content, not just status
- Or remove dossier from comparison (always update if dossier changes)

**Pros:**
- Fixes state update issues
- Ensures UI reflects data changes

**Cons:**
- Might cause more re-renders (but dossier changes are infrequent)

---

#### Option 1D: Add Debugging/Logging for Dossier Research
**Impact**: LOW-MEDIUM - Helps identify root cause
**Risk**: LOW - Diagnostic only
**Implementation**:
- Add console logs for dossier research jobs
- Show dossier status in UI
- Add error messages if dossier research fails

**Pros:**
- Helps identify why dossiers are blank
- Better visibility into research pipeline

**Cons:**
- Doesn't fix the issue, just helps diagnose

---

## Issue 2: Reload Creates New Session Instead of Restoring

### Problem
When page reloads, it creates a new discovery session instead of restoring the existing one, losing progress and requiring re-research.

### Root Causes Identified

**A. No Session Persistence**
- Location: `DiscoveryV2Tab.tsx:102-111`
- `hasStartedRef` resets on every page load
- No localStorage or session storage for session ID
- Always creates new session if `!session`

**B. Session Lookup Only Works for Auth Users**
- Location: `create-discovery-session/index.ts:70-81`
- Only checks for existing sessions if user is authenticated
- Anonymous users always get new sessions
- 24-hour window might be too short

**C. Criteria Hash Mismatch**
- If criteria changes slightly (e.g., order), hash won't match
- Won't find existing session even if it exists

### Fix Options

#### Option 2A: Save Session ID to localStorage (Recommended)
**Impact**: HIGH - Restores sessions on reload
**Risk**: LOW - Non-breaking
**Implementation**:
- Save `sessionId` to localStorage when session is created
- On mount, check localStorage for existing sessionId
- If found, call `fetchSession` instead of `createSession`
- Only create new session if no saved sessionId or fetch fails

**Pros:**
- Works for both auth and anonymous users
- Preserves progress across reloads
- Simple implementation

**Cons:**
- localStorage can be cleared by user
- Need to handle expired/invalid sessions

---

#### Option 2B: Use URL Parameters for Session ID
**Impact**: HIGH - Shareable sessions
**Risk**: LOW - Non-breaking
**Implementation**:
- Store sessionId in URL query parameter
- On mount, check URL for sessionId
- Restore session from URL if present
- Update URL when new session created

**Pros:**
- Shareable links
- Works across devices (if logged in)
- Browser back/forward works

**Cons:**
- URLs get longer
- Need to handle invalid sessionIds in URL

---

#### Option 2C: Improve Session Lookup Logic
**Impact**: MEDIUM - Better deduplication
**Risk**: LOW - Non-breaking
**Implementation**:
- Make criteria hash more flexible (normalize order)
- Extend lookup window (24h → 7 days)
- Check for sessions even if criteria hash doesn't match exactly
- Show "Resume previous session" option

**Pros:**
- Prevents duplicate sessions
- Better for authenticated users
- Reduces unnecessary research

**Cons:**
- Doesn't help anonymous users much
- Still creates new session if none found

---

#### Option 2D: Hybrid Approach (localStorage + URL + Lookup)
**Impact**: HIGH - Best of all worlds
**Risk**: MEDIUM - More complex
**Implementation**:
- Check localStorage first
- Check URL parameter second
- Check database for existing session third
- Only create new if all fail

**Pros:**
- Most robust solution
- Works in all scenarios
- Best user experience

**Cons:**
- More complex to implement
- More edge cases to handle

---

## Recommended Implementation Plan

### Phase 1: Quick Wins
1. **Option 1A**: Return dossier data even when researching
2. **Option 2A**: Save session ID to localStorage

### Phase 2: Enhancements
3. **Option 1C**: Fix shallow comparison for dossier updates
4. **Option 1B**: Add manual refresh button (optional)

### Phase 3: Polish
5. **Option 2B**: Add URL parameter support (optional)
6. **Option 1D**: Add debugging/logging (if needed)

---

## Expected Results

### After Phase 1:
- ✅ Dossier data shows as soon as available (not blank)
- ✅ Sessions restore on page reload
- ✅ Progress preserved across reloads
- ✅ Better user experience

### After Phase 2:
- ✅ Dossier updates reflect immediately
- ✅ Users can manually refresh if needed

---

## Breaking Changes Assessment

**All options are NON-BREAKING:**
- No API contract changes
- Backward compatible
- Existing functionality preserved
- Only adds new capabilities



