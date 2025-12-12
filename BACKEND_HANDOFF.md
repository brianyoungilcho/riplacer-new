# Backend Engineer Handoff Document

## Riplacer - AI-Powered Prospect Discovery Platform

This document contains everything you need to implement the backend APIs and database changes for Riplacer. The frontend is ready and waiting for these endpoints.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current Tech Stack](#current-tech-stack)
3. [Database Schema (Existing)](#database-schema-existing)
4. [Required API Endpoints](#required-api-endpoints)
5. [Database Changes Needed](#database-changes-needed)
6. [API Specifications](#api-specifications)
7. [LLM Integration Details](#llm-integration-details)
8. [Map Integration](#map-integration)
9. [Authentication Considerations](#authentication-considerations)
10. [Testing & Validation](#testing--validation)
11. [Frontend Integration Points](#frontend-integration-points)

---

## Project Overview

Riplacer helps B2B sales reps find "rip & replace" opportunities - government/enterprise accounts currently using competitor products that might be ready to switch.

### User Flow
1. **Step 1**: User describes their product (or provides company domain)
2. **Step 2**: User defines their sales territory (states or custom description)
3. **Step 3**: User selects target buyer categories (police, fire, schools, etc.)
4. **Step 4**: User selects competitors to displace
5. **Discovery**: System shows AI-researched prospects with "Riplace Scores" on an interactive map

### Key Backend Requirements
- Early competitor research (triggered after Step 1)
- Parallel LLM calls for prospect discovery (OpenAI + Gemini)
- Territory parsing for custom descriptions
- Prospect enrichment API
- Soft-delete and persistence for user prospects
- **Prospects must be filtered by selected territory states**

---

## Current Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Auth**: Supabase Auth
- **Maps**: Mapbox GL JS
- **State**: React Query + localStorage

### Existing Supabase Edge Functions
- `get-mapbox-token` - Returns Mapbox API token
- `search-places` - Google Places API search (basic)
- `analyze-company` - Company domain analysis
- `enrich-prospect` - Prospect enrichment
- `save-prospect` - Save prospect to user's list

---

## Database Schema (Existing)

### `profiles`
```sql
id UUID PRIMARY KEY (references auth.users)
company_name TEXT
company_website TEXT
selling_proposition TEXT
competitor_names TEXT[]
product_description TEXT
onboarding_data JSONB
onboarding_complete BOOLEAN
created_at, updated_at TIMESTAMPTZ
```

### `prospects`
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
address TEXT
lat FLOAT, lng FLOAT
state TEXT                    -- State where prospect is located
website_url TEXT
phone TEXT
place_id TEXT UNIQUE
ai_enrichment_json JSONB
enriched_at TIMESTAMPTZ
riplace_score INTEGER
contract_value TEXT
highlight TEXT
highlight_type TEXT ('timing' | 'opportunity' | 'weakness')
riplace_angle TEXT
sources JSONB
decision_maker TEXT
created_at, updated_at TIMESTAMPTZ
```

### `user_leads`
```sql
id UUID PRIMARY KEY
user_id UUID (references auth.users)
prospect_id UUID (references prospects)
status lead_status ENUM ('saved', 'contacted', 'meeting_booked', 'won', 'lost', 'irrelevant')
notes TEXT
ai_hook TEXT
deleted_at TIMESTAMPTZ       -- Soft delete timestamp
created_at, updated_at TIMESTAMPTZ
UNIQUE(user_id, prospect_id)
```

### `user_territories`
```sql
id UUID PRIMARY KEY
user_id UUID (references auth.users)
region TEXT
states JSONB
cities JSONB
description TEXT
is_custom_territory BOOLEAN   -- True if user typed custom description
created_at, updated_at TIMESTAMPTZ
```

### `user_categories`
```sql
id UUID PRIMARY KEY
user_id UUID
category_id TEXT
category_name TEXT
UNIQUE(user_id, category_id)
```

### `user_competitors`
```sql
id UUID PRIMARY KEY
user_id UUID
competitor_name TEXT
category_id TEXT
UNIQUE(user_id, competitor_name)
```

---

## Required API Endpoints

### 1. `research-competitors` (NEW - Priority: HIGH)

**Purpose**: AI-powered competitor research triggered after user completes Step 1. Should run in background so suggestions are ready by Step 4.

**Trigger**: Frontend calls this immediately when user moves from Step 1 → Step 2

**Request**:
```typescript
POST /functions/v1/research-competitors
{
  productDescription: string;  // e.g., "Body cameras for law enforcement"
  companyDomain?: string;      // e.g., "axon.com"
}
```

**Response**:
```typescript
{
  competitors: string[];  // e.g., ["Motorola Solutions", "Flock Safety", "ShotSpotter"]
  confidence: number;     // 0-1 confidence score
  reasoning?: string;     // Optional: why these were suggested
}
```

**Implementation Notes**:
- Use Gemini API for research (faster, good at web knowledge)
- Target response time: <5 seconds
- Cache results by product description hash
- Prompt should ask for 5-10 likely competitors in the space

**Gemini Prompt Template**:
```
Given a company that sells: "{productDescription}"
{companyDomain ? `Their website is: ${companyDomain}` : ''}

List the top 5-10 competitors in this space. Focus on:
- Direct competitors selling similar products
- Well-known players in government/enterprise sales
- Companies that would be found in RFPs and procurement documents

Return ONLY a JSON array of company names, no explanation.
Example: ["Company A", "Company B", "Company C"]
```

---

### 2. `discover-prospects` (NEW - Priority: HIGH)

**Purpose**: Main prospect discovery endpoint. Uses parallel LLM calls to find prospects matching user criteria.

**IMPORTANT**: Prospects must be located within the user's selected territory states. The frontend displays these prospects as markers on a map, and they should only appear within the highlighted territory.

**Request**:
```typescript
POST /functions/v1/discover-prospects
{
  // User criteria
  productDescription: string;
  territory: {
    states: string[];           // e.g., ["Connecticut", "Massachusetts", "New York"]
    cities?: string[];
    customDescription?: string;
    isCustomTerritory: boolean;
  };
  targetCategories: string[];   // e.g., ["police", "fire", "schools_k12"]
  competitors: string[];        // e.g., ["Axon", "Motorola"]
  
  // Pagination
  page: number;        // 0-indexed
  pageSize: number;    // Default 10
  
  // Context for subsequent pages
  existingProspectIds?: string[];  // IDs already shown to avoid duplicates
}
```

**Response**:
```typescript
{
  prospects: Prospect[];
  totalEstimate: number;      // Estimated total matching prospects
  hasMore: boolean;
  searchMetadata: {
    openaiLatency: number;
    geminiLatency: number;
    sourcesSearched: string[];
  };
}

interface Prospect {
  id: string;
  name: string;
  score: number;              // 0-100 Riplace Score
  contractValue: string;      // e.g., "$250,000/yr"
  highlight: string;          // e.g., "Contract Expiring"
  highlightType: 'timing' | 'opportunity' | 'weakness';
  riplaceAngle: string;       // 2-3 sentence explanation
  sources: { label: string; url: string }[];
  lastUpdated: string;        // ISO date
  
  // REQUIRED for map display - must be within selected states
  lat: number;                // Latitude
  lng: number;                // Longitude  
  state: string;              // State name (e.g., "Massachusetts")
  
  address?: string;
  website?: string;
  phone?: string;
}
```

**Implementation Notes**:
- Run OpenAI and Gemini in parallel (Promise.all)
- Merge and deduplicate results
- **CRITICAL**: Filter results to only include prospects in the specified `territory.states`
- Score prospects based on:
  - Contract timing signals (RFPs, expirations)
  - Leadership changes
  - Budget indicators
  - Competitor usage evidence
- First page should return in <10 seconds
- Cache results by criteria hash for 24 hours
- **Include accurate lat/lng coordinates for map display**

**LLM Prompt Strategy**:

For **OpenAI** (better at structured reasoning):
```
You are a B2B sales intelligence researcher. Find government/enterprise accounts that:

1. Are located ONLY in these states: {territory.states.join(", ")}
2. Fall into these categories: {targetCategories}
3. Currently use or might use: {competitors}
4. Would be good prospects for: {productDescription}

For each prospect found, provide:
- Organization name
- City and State (MUST be in the specified states)
- Approximate latitude and longitude
- Why they're a good target (contract expiring, new leadership, RFP open, etc.)
- Estimated contract value
- Confidence score (0-100)

Focus on finding REAL organizations with actionable intelligence.
Return as JSON array.
```

For **Gemini** (better at web knowledge):
```
Search for government agencies and organizations that match:
- Location: ONLY in these states: {territory.states.join(", ")}
- Type: {targetCategories}
- May be using: {competitors}

Find recent news, RFPs, budget documents, or contract announcements that indicate:
- Upcoming contract renewals
- Dissatisfaction with current vendor
- New funding or budget increases
- Leadership changes

Return real organization names with specific, verifiable details.
Include city, state, and approximate coordinates for each.
```

---

### 3. `enrich-single-prospect` (NEW - Priority: MEDIUM)

**Purpose**: When user manually adds a prospect by name, research and enrich it.

**Request**:
```typescript
POST /functions/v1/enrich-single-prospect
{
  organizationName: string;   // e.g., "Oakland Police Department"
  location?: string;          // e.g., "Oakland, CA"
  userContext: {
    productDescription: string;
    competitors: string[];
    territory: {
      states: string[];
    };
  };
}
```

**Response**:
```typescript
{
  prospect: Prospect;  // Same structure as discover-prospects
  confidence: number;
  sources: string[];
}
```

**Implementation Notes**:
- Use Gemini for web search capabilities
- Try to find real information about the organization
- Generate Riplace Score based on available signals
- **Verify the prospect is in the user's territory before returning**
- Response time target: <8 seconds

---

### 4. `parse-territory` (NEW - Priority: MEDIUM)

**Purpose**: Parse natural language territory descriptions into structured data.

**Request**:
```typescript
POST /functions/v1/parse-territory
{
  description: string;  // e.g., "Major cities in the Pacific Northwest with pop over 100k"
}
```

**Response**:
```typescript
{
  states: string[];           // e.g., ["Washington", "Oregon"]
  cities: string[];           // e.g., ["Seattle", "Portland", "Tacoma"]
  regions: string[];          // e.g., ["Pacific Northwest"]
  populationFilter?: string;  // e.g., ">100000"
  interpretation: string;     // Human-readable interpretation
}
```

**Implementation Notes**:
- Use Gemini for understanding natural language
- Return structured data that can be used for filtering
- Frontend will display the interpretation to user

---

### 5. `delete-prospect` (UPDATE EXISTING)

**Purpose**: Soft-delete a prospect from user's list.

**Request**:
```typescript
POST /functions/v1/delete-prospect
{
  prospectId: string;
  userId: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  deletedAt: string;  // ISO timestamp
}
```

**Implementation Notes**:
- Add `deleted_at` column to `user_leads` table
- Don't actually delete, just set timestamp
- Allow undo within session (frontend handles undo UI)

---

## Database Changes Needed

### 1. Add `deleted_at` to `user_leads`
```sql
ALTER TABLE user_leads ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX idx_user_leads_deleted ON user_leads(user_id, deleted_at);
```

### 2. Add `state` to `prospects` (if not exists)
```sql
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS state TEXT;
CREATE INDEX idx_prospects_state ON prospects(state);
```

### 3. Add competitor research cache table
```sql
CREATE TABLE competitor_research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash TEXT UNIQUE NOT NULL,  -- Hash of productDescription + companyDomain
  competitors JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_competitor_cache_hash ON competitor_research_cache(input_hash);
CREATE INDEX idx_competitor_cache_expires ON competitor_research_cache(expires_at);
```

### 4. Add prospect discovery cache table
```sql
CREATE TABLE prospect_discovery_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_hash TEXT NOT NULL,      -- Hash of all search criteria
  page_number INTEGER NOT NULL,
  prospects JSONB NOT NULL,
  total_estimate INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  UNIQUE(criteria_hash, page_number)
);

CREATE INDEX idx_discovery_cache_hash ON prospect_discovery_cache(criteria_hash);
```

### 5. Add user prospect list table (for persisting discovery results per user)
```sql
CREATE TABLE user_prospect_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_data JSONB NOT NULL,     -- Full prospect object
  source TEXT DEFAULT 'discovery',  -- 'discovery' | 'manual'
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_prospect_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own prospect lists" ON user_prospect_lists
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_user_prospects_user ON user_prospect_lists(user_id);
CREATE INDEX idx_user_prospects_deleted ON user_prospect_lists(user_id, deleted_at);
```

---

## LLM Integration Details

### API Keys Needed
- **OpenAI**: GPT-4 or GPT-4-turbo for structured reasoning
- **Gemini**: Gemini Pro for web knowledge and search

### Environment Variables
```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

### Cost Considerations
- Estimate ~$0.03-0.10 per prospect discovery call
- Use caching aggressively (24hr for discovery, 7 days for competitors)
- Consider rate limiting for unauthenticated users

### Error Handling
- If one LLM fails, still return results from the other
- Log all LLM calls for debugging
- Return partial results with error flag if needed

---

## Map Integration

### Current Frontend Implementation

The frontend displays prospects on an interactive Mapbox map with the following features:

#### Territory Visualization (IMPLEMENTED)
- Uses free GeoJSON source: `https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json`
- Selected states are highlighted with:
  - 15% red fill (`#ef4444` at 0.15 opacity)
  - 2px red border

#### Prospect Markers (IMPLEMENTED - Airbnb-style)
- **Zoomed out (zoom < 6)**: Compact red circles showing only the score
- **Zoomed in (zoom >= 6)**: Full pill showing prospect name + score
- Dynamic sizing based on zoom level
- Clicking a marker:
  - Centers the map on that prospect
  - Expands the corresponding card in the left panel
  - Scrolls the card into view

### Backend Requirements for Map

**Each prospect MUST include**:
```typescript
{
  lat: number;    // Accurate latitude
  lng: number;    // Accurate longitude
  state: string;  // State name (e.g., "Massachusetts")
}
```

**Geocoding Strategy**:
1. If you have an address, use Google Geocoding API or Mapbox Geocoding
2. For known government buildings, use existing databases
3. As fallback, use approximate city center coordinates
4. **Always verify the coordinates fall within the claimed state**

### State Coordinate Reference
For generating mock data or fallback coordinates:
```typescript
const STATE_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Connecticut': { lat: 41.6032, lng: -72.7554 },
  'Delaware': { lat: 38.9108, lng: -75.5277 },
  'Maine': { lat: 45.2538, lng: -69.4455 },
  'Maryland': { lat: 39.0458, lng: -76.6413 },
  'Massachusetts': { lat: 42.4072, lng: -71.3824 },
  'New Hampshire': { lat: 43.1939, lng: -71.5724 },
  'New Jersey': { lat: 40.0583, lng: -74.4057 },
  'New York': { lat: 43.2994, lng: -75.4999 },
  'Pennsylvania': { lat: 41.2033, lng: -77.1945 },
  'Rhode Island': { lat: 41.5801, lng: -71.4774 },
  'Vermont': { lat: 44.5588, lng: -72.5778 },
  // ... add more as needed
};
```

---

## Authentication Considerations

### Authenticated Users
- Full access to all features
- Prospects saved to database
- Unlimited discovery results
- Can delete/add prospects
- Map shows all prospects

### Unauthenticated Users
- Limited to 10 prospects (frontend enforces display limit)
- Cannot delete prospects
- Cannot add custom prospects
- Cannot expand prospect details
- Data stored in localStorage only (not persisted to DB)
- Discovery API should still work (for conversion)
- Map shows first 10 prospects only

### API Authorization
```typescript
// In edge function
const { data: { user } } = await supabase.auth.getUser();

// For user-specific operations
if (!user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

// For discovery (allow unauthenticated)
// Just don't persist results to DB for unauthenticated users
```

---

## Testing & Validation

### Test Cases for `research-competitors`
1. Valid product description → Returns 5-10 competitors
2. Product + domain → Returns more specific competitors
3. Empty/invalid input → Returns error gracefully
4. Cached request → Returns cached result quickly

### Test Cases for `discover-prospects`
1. Basic criteria → Returns scored prospects **within specified states only**
2. Pagination → Subsequent pages don't duplicate
3. Custom territory description → Parses and searches correctly
4. One LLM fails → Still returns results from other
5. Unauthenticated user → Returns results but doesn't persist
6. **All returned prospects have valid lat/lng/state**
7. **No prospects outside selected territory states**

### Test Cases for `enrich-single-prospect`
1. Real organization → Returns enriched data with coordinates
2. Unknown organization → Returns best-effort data with low confidence
3. Invalid input → Returns error gracefully
4. **Organization outside territory → Returns error or warning**

### Performance Targets
| Endpoint | Target Response Time |
|----------|---------------------|
| research-competitors | <5 seconds |
| discover-prospects (first page) | <10 seconds |
| discover-prospects (subsequent) | <5 seconds |
| enrich-single-prospect | <8 seconds |
| parse-territory | <3 seconds |

---

## Frontend Integration Points

### Where frontend calls these APIs

1. **research-competitors**: Called in `OnboardingPage.tsx` when `step` changes from 1→2
2. **discover-prospects**: Called in `DiscoveryTab.tsx` on initial load and infinite scroll
3. **enrich-single-prospect**: Called in `DiscoveryTab.tsx` when user clicks "Add Prospect" from search
4. **delete-prospect**: Called in `DiscoveryTab.tsx` when user clicks delete button

### Frontend Files Reference
- `src/components/onboarding-v2/OnboardingPage.tsx` - Main orchestrator, manages state
- `src/components/onboarding-v2/OnboardingMap.tsx` - Map component with markers
- `src/components/onboarding-v2/workspace/DiscoveryTab.tsx` - Prospect list and management
- `src/components/onboarding-v2/StepCompetitors.tsx` - Competitor selection UI

### Frontend State Management
- `OnboardingData.suggestedCompetitors` - Populated by research-competitors
- `OnboardingData.competitorResearchLoading` - Loading state for research
- `OnboardingData.states` - Selected territory states (prospects must be in these)
- `mapProspects` - Prospects array passed to map for marker display
- `selectedProspectId` - Currently selected prospect (synced between map and list)
- **UI Decision (Option B)**: Discovery shows **1–2 “Angle” chips per prospect** (minimal “how to win” tags). If backend returns `angles`, frontend will render them; otherwise it falls back to a heuristic from `highlight` / `highlightType`.

### Prospect Interface (Frontend expects this)
```typescript
interface Prospect {
  id: string;
  name: string;
  score: number;
  contractValue: string;
  highlight: string;
  highlightType: 'opportunity' | 'timing' | 'weakness';
  riplaceAngle: string;
  angles?: string[];  // Optional. Short “how to win” tags. Frontend shows max 2 chips.
  sources: { label: string; url: string }[];
  lastUpdated: string;
  lat?: number;       // Required for map
  lng?: number;       // Required for map
  state?: string;     // Required for territory filtering
  isDeleted?: boolean;
}
```

---

## Prospect Discovery v2 (Deep Research + Account Strategy) — Addendum (NEW)

This section describes the **next-generation prospect discovery** flow:

1) **Strategic Advantage Brief** (deep research vs specified competitors; grounded in citations)  
2) **Prospecting** (limit to 5–10 prospects for speed/quality)  
3) **Per-account Dossier** (contracts, stakeholders, macro signals, citations)  
4) **Rep Augmentation** (private notes, internal context)  
5) **Account Plan** (synthesized angles + next steps + messaging)

### Guiding principles
- **Store “facts + evidence”, not internal model reasoning**. Persist structured outputs + citations + confidence.
- **Separate public evidence from private rep notes** (different tables + RLS).
- **Async-first for deep research**: the UI should see progress states and partial completion (job queue + polling).
- **Keep current endpoints working**; add v2 endpoints to avoid breaking the existing UI.
- **Keep the UI minimal**: primary UI surface is the prospect list; strategy should appear as **small per-prospect “angles”** + citations, not large always-on panels.

### Frontend UX decisions (locked)
- **Option B chosen**: show **1–2 “Angle” chips per prospect** in the list, plus an “Angles” section inside the expanded card.
- A global “brief” can exist, but should be **secondary / on-demand** (not required to ship v2).

---

## New Edge Functions (v2)

### 1) `create-discovery-session` (NEW)
**Purpose**: Create a durable “research run” tied to a criteria bundle (product, territory, buyers, competitors).

**Request**
```ts
POST /functions/v1/create-discovery-session
{
  productDescription: string;
  territory: { states: string[]; cities?: string[]; customDescription?: string; isCustomTerritory?: boolean };
  targetCategories: string[];        // buyers / segments (current UI uses categories)
  competitors: string[];
  companyDomain?: string;            // optional, if available from profile
}
```

**Response**
```ts
{
  sessionId: string;
  status: "created";
}
```

---

### 2) `research-competitive-advantages` (NEW)
**Purpose**: Deep research to produce a **Strategic Advantage Brief** (why we win vs the selected competitors).

**Notes**
- Use a “deep” model (Gemini Pro-tier) and **require citations** (URLs + title + relevant excerpt).
- Optionally fetch and include: user company website pages (from profile/companyDomain), competitor sites, and key public pages.

**Request**
```ts
POST /functions/v1/research-competitive-advantages
{
  sessionId: string;
  productDescription: string;
  targetCategories: string[];
  competitors: string[];
  companyDomain?: string;
}
```

**Response**
```ts
{
  brief: {
    positioningSummary: string;
    advantages: Array<{
      title: string;                    // e.g. "Lower total cost"
      whyItMattersToBuyer: string;
      competitorComparisons: Array<{
        competitor: string;
        claim: string;                  // factual/defensible claim (no hidden reasoning)
        confidence: number;             // 0-1
        citations: Array<{ url: string; title?: string; excerpt?: string }>;
      }>;
      talkTrackBullets: string[];       // crisp lines a rep can say
      objectionsAndResponses: Array<{ objection: string; response: string }>;
    }>;
    lastUpdated: string;
  };
}
```

---

### 3) `discover-prospects-v2` (NEW)
**Purpose**: Return **5–10 prospects max** (seed list) and enqueue deep per-account research jobs.

**Request**
```ts
POST /functions/v1/discover-prospects-v2
{
  sessionId: string;
  productDescription: string;
  territory: { states: string[]; cities?: string[]; customDescription?: string; isCustomTerritory?: boolean };
  targetCategories: string[];
  competitors: string[];
  limit?: number;              // default 8
}
```

**Response**
```ts
{
  prospects: Array<{
    prospectId: string;
    name: string;
    state?: string;
    lat?: number;
    lng?: number;
    initialScore?: number;      // optional coarse score before dossier
    angles?: string[];          // Optional. 1–2 short tags for list chips (e.g., ["Renewal window", "Replacement play"])
    researchStatus: "queued" | "researching" | "ready" | "failed";
  }>;
  jobs: Array<{ jobId: string; prospectId: string; status: string }>;
}
```

**Implementation notes**
- Prefer **real prospects** (no mock filler in v2). If insufficient results, return fewer and explain via `warnings`.
- Hard requirement: **only within `territory.states`**; validate after extraction.

---

### 4) `get-discovery-session` (NEW)
**Purpose**: One polling endpoint to fetch current session state: brief + prospects + job statuses.

**Request**
```ts
POST /functions/v1/get-discovery-session
{ sessionId: string; }
```

**Response**
```ts
{
  session: { id: string; status: string; createdAt: string; };
  advantageBrief?: { /* same shape as above */ };
  prospects: Array<{
    prospectId: string;
    name: string;
    state?: string;
    lat?: number;
    lng?: number;
    dossierStatus: "queued" | "researching" | "ready" | "failed";
    dossierLastUpdated?: string;
  }>;
  jobs: Array<{ id: string; type: string; status: string; progress?: number; error?: string }>;
}
```

---

### 5) `research-prospect-dossier` (NEW)
**Purpose**: Deep research for a single account (contract, stakeholders, macro context) with citations.

**Request**
```ts
POST /functions/v1/research-prospect-dossier
{
  sessionId: string;
  prospect: {
    name: string;
    state?: string;
    lat?: number;
    lng?: number;
    website?: string;
    address?: string;
  };
  forceRefresh?: boolean;        // default false
}
```

**Response**
```ts
{
  dossier: {
    summary: string;
    incumbent: { vendor?: string; confidence: number; citations: Array<{url: string; excerpt?: string}> };
    contract: {
      estimatedAnnualValue?: string;
      estimatedExpiration?: string;     // ISO or "Unknown"
      contractNotes?: string;
      citations: Array<{url: string; title?: string; excerpt?: string}>;
    };
    stakeholders: Array<{
      name?: string;
      title?: string;
      stance: "supporter" | "opponent" | "neutral" | "unknown";
      confidence: number;
      citations: Array<{url: string; excerpt?: string}>;
    }>;
    macroSignals: Array<{
      type: "budget" | "leadership" | "election" | "public_sentiment" | "audit" | "rfp" | "other";
      description: string;
      confidence: number;
      citations: Array<{url: string; excerpt?: string}>;
    }>;
    recommendedAngles: Array<{
      title: string;
      message: string;
      mappedAdvantageTitles: string[];  // links dossier → advantage brief
      confidence: number;
      citations: Array<{url: string; excerpt?: string}>;
    }>;
    anglesForList?: string[];           // Optional. 1–2 short labels derived from recommendedAngles for UI chips
    sources: Array<{ url: string; title?: string; excerpt?: string; type?: string }>;
    lastUpdated: string;
  };
}
```

---

### 6) `generate-account-plan` (NEW)
**Purpose**: Synthesize **Advantage Brief + Dossier + Rep Notes** into a plan and suggested next steps.

**Request**
```ts
POST /functions/v1/generate-account-plan
{
  sessionId: string;
  prospectId: string;
  repNotes?: string;   // private; if omitted, server fetches latest saved notes
}
```

**Response**
```ts
{
  plan: {
    executiveSummary: string;
    whoToTarget: string[];
    whoToAvoid: string[];
    nextSteps: string[];
    talkTrack: string[];
    emailDraft?: string;
    risks: string[];
    confidence: number;
    lastUpdated: string;
  };
}
```

---

## New Database Tables (v2)

### `discovery_sessions`
Stores a durable run + criteria hash.
```sql
CREATE TABLE discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  criteria JSONB NOT NULL,
  criteria_hash TEXT NOT NULL,
  status TEXT DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_discovery_sessions_user ON discovery_sessions(user_id, created_at DESC);
CREATE INDEX idx_discovery_sessions_hash ON discovery_sessions(criteria_hash);
```

### `advantage_briefs`
```sql
CREATE TABLE advantage_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  brief JSONB NOT NULL,
  sources JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);
```

### `prospect_dossiers`
```sql
CREATE TABLE prospect_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  prospect_key TEXT NOT NULL, -- stable key (e.g., place_id if known; else hash of name+state)
  dossier JSONB NOT NULL,
  sources JSONB DEFAULT '[]',
  status TEXT DEFAULT 'queued',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, prospect_key)
);
CREATE INDEX idx_dossiers_session ON prospect_dossiers(session_id);
```

### `research_jobs`
```sql
CREATE TABLE research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,       -- advantage_brief | discover_prospects | dossier | account_plan
  prospect_key TEXT,
  status TEXT DEFAULT 'queued', -- queued | running | complete | failed
  progress INT DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
CREATE INDEX idx_jobs_session ON research_jobs(session_id, created_at DESC);
```

### `rep_notes` (private augmentation)
```sql
CREATE TABLE rep_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  prospect_key TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id, prospect_key)
);
```

### RLS (high level)
- `discovery_sessions`, `advantage_briefs`, `prospect_dossiers`, `research_jobs`, `rep_notes`: **user-owned only** (`auth.uid() = user_id`).
- If you later introduce “shared org workspaces”, replace user_id checks with workspace membership.

---

## Job Execution Options (engineer can choose)

### Option 1: Synchronous (fastest build, least scalable)
- v2 endpoints run research inline and return when done.
- Works only if strict time limits are met (often risky for deep research).

### Option 2: Hybrid (recommended)
- `discover-prospects-v2` returns seed list quickly, enqueues per-prospect dossiers.
- Frontend polls `get-discovery-session` for progress and hydrates dossiers as ready.

### Option 3: Fully async (best long-term)
- All deep tasks enqueue jobs; scheduled worker (cron) processes queue in small batches.
- Frontend becomes fully progress-driven.

---

## Model & Retrieval Notes
- Use a “deep” model for: advantage brief + dossier + plan synthesis.
- Use a “fast” model for: formatting, dedupe, light classification, short summaries.
- Require citations for any factual claims; store citations in `sources` JSONB and attach excerpts where possible.

---

## Questions for Backend Engineer

Please clarify if you need more details on:

1. **LLM Prompt Engineering**: Want more specific prompts or examples?
2. **Caching Strategy**: Different TTLs or cache invalidation rules?
3. **Rate Limiting**: Specific limits for authenticated vs unauthenticated?
4. **Error Responses**: Specific error code/message format preferences?
5. **Logging**: What level of detail for debugging?
6. **Geocoding**: Preferred geocoding service for prospect coordinates?

---

## Contact

If you have questions about frontend expectations or want to test integration:
- Frontend code is in `/src/components/onboarding-v2/`
- Main files: `OnboardingPage.tsx`, `OnboardingMap.tsx`, `workspace/DiscoveryTab.tsx`
- Run dev server: `npm run dev` (port 8080)

---

*Document created: December 2024*
*Last updated: January 2025*
