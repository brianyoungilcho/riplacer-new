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

---

## Project Overview

Riplacer helps B2B sales reps find "rip & replace" opportunities - government/enterprise accounts currently using competitor products that might be ready to switch.

### User Flow
1. **Step 1**: User describes their product (or provides company domain)
2. **Step 2**: User defines their sales territory (states or custom description)
3. **Step 3**: User selects target buyer categories (police, fire, schools, etc.)
4. **Step 4**: User selects competitors to displace
5. **Discovery**: System shows AI-researched prospects with "Riplace Scores"

### Key Backend Requirements
- Early competitor research (triggered after Step 1)
- Parallel LLM calls for prospect discovery (OpenAI + Gemini)
- Territory parsing for custom descriptions
- Prospect enrichment API
- Soft-delete and persistence for user prospects

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

**Request**:
```typescript
POST /functions/v1/discover-prospects
{
  // User criteria
  productDescription: string;
  territory: {
    states: string[];
    cities?: string[];
    customDescription?: string;
    isCustomTerritory: boolean;
  };
  targetCategories: string[];  // e.g., ["police", "fire", "schools_k12"]
  competitors: string[];       // e.g., ["Axon", "Motorola"]
  
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
  lat?: number;
  lng?: number;
  address?: string;
  website?: string;
  phone?: string;
}
```

**Implementation Notes**:
- Run OpenAI and Gemini in parallel (Promise.all)
- Merge and deduplicate results
- Score prospects based on:
  - Contract timing signals (RFPs, expirations)
  - Leadership changes
  - Budget indicators
  - Competitor usage evidence
- First page should return in <10 seconds
- Cache results by criteria hash for 24 hours

**LLM Prompt Strategy**:

For **OpenAI** (better at structured reasoning):
```
You are a B2B sales intelligence researcher. Find government/enterprise accounts that:

1. Are located in: {territory}
2. Fall into these categories: {targetCategories}
3. Currently use or might use: {competitors}
4. Would be good prospects for: {productDescription}

For each prospect found, provide:
- Organization name
- Why they're a good target (contract expiring, new leadership, RFP open, etc.)
- Estimated contract value
- Confidence score (0-100)

Focus on finding REAL organizations with actionable intelligence.
Return as JSON array.
```

For **Gemini** (better at web knowledge):
```
Search for government agencies and organizations that match:
- Location: {territory}  
- Type: {targetCategories}
- May be using: {competitors}

Find recent news, RFPs, budget documents, or contract announcements that indicate:
- Upcoming contract renewals
- Dissatisfaction with current vendor
- New funding or budget increases
- Leadership changes

Return real organization names with specific, verifiable details.
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

### 6. `get-state-boundaries` (NEW - Priority: LOW)

**Purpose**: Return GeoJSON for state boundaries to display on map.

**Request**:
```typescript
GET /functions/v1/get-state-boundaries?states=CA,OR,WA
```

**Response**:
```typescript
{
  type: "FeatureCollection",
  features: GeoJSON.Feature[]  // Standard GeoJSON
}
```

**Implementation Notes**:
- Can use static GeoJSON files or a tiles service
- Consider using Mapbox's built-in state boundaries tileset instead
- Frontend will render as filled polygons (15% red fill + 2px border)

---

## Database Changes Needed

### 1. Add `deleted_at` to `user_leads`
```sql
ALTER TABLE user_leads ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX idx_user_leads_deleted ON user_leads(user_id, deleted_at);
```

### 2. Add competitor research cache table
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

### 3. Add prospect discovery cache table
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

### 4. Add user prospect list table (for persisting discovery results per user)
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

### Current Setup
- Using Mapbox GL JS
- Token fetched via `get-mapbox-token` edge function

### Territory Visualization
Frontend expects to receive prospect lat/lng coordinates. For state boundary visualization:

**Option A (Recommended)**: Use Mapbox's built-in `us-states` tileset
- No backend changes needed
- Frontend will query tileset directly

**Option B**: Serve GeoJSON via API
- Implement `get-state-boundaries` endpoint
- Return simplified GeoJSON polygons

### Style Spec (for frontend reference)
```javascript
// State fill layer
{
  'id': 'state-fills',
  'type': 'fill',
  'source': 'states',
  'paint': {
    'fill-color': '#ef4444',
    'fill-opacity': 0.15
  }
}

// State border layer  
{
  'id': 'state-borders',
  'type': 'line',
  'source': 'states',
  'paint': {
    'line-color': '#ef4444',
    'line-width': 2
  }
}
```

---

## Authentication Considerations

### Authenticated Users
- Full access to all features
- Prospects saved to database
- Unlimited discovery results
- Can delete/add prospects

### Unauthenticated Users
- Limited to 10 prospects (frontend enforces display limit)
- Cannot delete prospects
- Cannot add custom prospects
- Data stored in localStorage only (not persisted to DB)
- Discovery API should still work (for conversion)

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
1. Basic criteria → Returns scored prospects
2. Pagination → Subsequent pages don't duplicate
3. Custom territory description → Parses and searches correctly
4. One LLM fails → Still returns results from other
5. Unauthenticated user → Returns results but doesn't persist

### Test Cases for `enrich-single-prospect`
1. Real organization → Returns enriched data
2. Unknown organization → Returns best-effort data with low confidence
3. Invalid input → Returns error gracefully

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

### Frontend State Management
- `OnboardingData.suggestedCompetitors` - Populated by research-competitors
- `OnboardingData.competitorResearchLoading` - Loading state for research
- Prospects stored in component state, synced to localStorage for unauthenticated users

---

## Questions for Backend Engineer

Please clarify if you need more details on:

1. **LLM Prompt Engineering**: Want more specific prompts or examples?
2. **Caching Strategy**: Different TTLs or cache invalidation rules?
3. **Rate Limiting**: Specific limits for authenticated vs unauthenticated?
4. **Error Responses**: Specific error code/message format preferences?
5. **Logging**: What level of detail for debugging?

---

## Contact

If you have questions about frontend expectations or want to test integration:
- Frontend code is in `/src/components/onboarding-v2/`
- Main files: `OnboardingPage.tsx`, `workspace/DiscoveryTab.tsx`, `StepCompetitors.tsx`
- Run dev server: `npm run dev` (port 8081)

---

*Document created: $(date)*
*Last updated: $(date)*
