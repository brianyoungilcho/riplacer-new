# Riplacer Backend Specification

## Overview
This document outlines the backend requirements for the Riplacer onboarding and prospect discovery system. The frontend is complete and expects these APIs to be implemented as Supabase Edge Functions and database tables.

## Architecture
- **Database**: Supabase PostgreSQL
- **Edge Functions**: Supabase Edge Functions (Deno runtime)
- **AI**: OpenAI GPT-4 or Groq (for company analysis and prospect enrichment)
- **External APIs**: Mapbox (geocoding), GovSpend/OpenGov (public contract data)

---

## Database Schema

### 1. Users Table (Extend existing)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_domain TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS product_description TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_data JSONB;
```

### 2. User Territories Table
```sql
CREATE TABLE IF NOT EXISTS user_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region TEXT,
  states JSONB DEFAULT '[]'::jsonb,
  cities JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_territories_user_id ON user_territories(user_id);
```

### 3. User Categories Table
```sql
CREATE TABLE IF NOT EXISTS user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

CREATE INDEX idx_user_categories_user_id ON user_categories(user_id);
```

### 4. User Competitors Table
```sql
CREATE TABLE IF NOT EXISTS user_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  category_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, competitor_name)
);

CREATE INDEX idx_user_competitors_user_id ON user_competitors(user_id);
```

### 5. Prospects Table
```sql
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  category TEXT,
  riplace_score INTEGER DEFAULT 0,
  contract_value TEXT,
  highlight TEXT,
  highlight_type TEXT CHECK (highlight_type IN ('timing', 'opportunity', 'weakness')),
  riplace_angle TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  user_notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  last_enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

CREATE INDEX idx_prospects_user_id ON prospects(user_id);
CREATE INDEX idx_prospects_favorite ON prospects(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_prospects_score ON prospects(user_id, riplace_score DESC);
```

### 6. Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE user_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own territories" ON user_territories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own territories" ON user_territories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own territories" ON user_territories
  FOR UPDATE USING (auth.uid() = user_id);

-- Similar policies for user_categories, user_competitors, prospects
CREATE POLICY "Users can manage own categories" ON user_categories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own competitors" ON user_competitors
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own prospects" ON prospects
  FOR ALL USING (auth.uid() = user_id);
```

---

## Edge Functions

### 1. `analyze-company` (POST)

**Purpose**: Analyze company from domain or product description to extract business info and suggest competitors.

**Endpoint**: `/functions/v1/analyze-company`

**Request Body**:
```json
{
  "company_domain": "example.com",  // Optional
  "product_description": "Body-worn cameras for law enforcement"
}
```

**Logic**:
1. If `company_domain` provided:
   - Scrape website content (use Puppeteer/Cheerio or website content API)
   - Extract: company name, products/services, industry
   - Use AI to identify top 5 competitors in that space
2. If only `product_description`:
   - Use AI to extract key product features and suggest competitors
3. Store results in `users` table

**Response**:
```json
{
  "company_name": "Example Corp",
  "products": ["Body cameras", "Fleet management"],
  "competitors_suggestions": ["Axon", "Motorola Solutions", "ShotSpotter", "Flock Safety", "NICE"],
  "industry": "Law Enforcement Technology"
}
```

**AI Prompt Template**:
```
Analyze this company/product: {product_description}
Extract:
1. Company name (if domain provided)
2. Main products/services
3. Target market
4. Top 5 competitors in this space

Return JSON format.
```

**Error Handling**: Return mock data if AI/scraping fails

---

### 2. `search-places` (POST)

**Purpose**: Search for government/public sector prospects in a territory.

**Endpoint**: `/functions/v1/search-places`

**Request Body**:
```json
{
  "query": "police department",
  "location": "Illinois",
  "radius": 25,
  "filters": {
    "categories": ["police", "sheriff"],
    "competitors": ["Axon", "ShotSpotter"],
    "territory": {
      "region": "Midwest",
      "states": ["Illinois", "Ohio"],
      "cities": []
    }
  }
}
```

**Logic**:
1. Geocode `location` using Mapbox Geocoding API
2. Search Places API with query + location bounds
3. Filter results by:
   - Territory boundaries (use GeoJSON for state/city boundaries)
   - Category keywords
4. For each result, call `enrich-prospect` to get score
5. Sort by `riplace_score` DESC
6. Return top 50 results

**Response**:
```json
{
  "results": [
    {
      "place_id": "ChIJ...",
      "name": "Springfield Police Department",
      "address": "123 Main St, Springfield, IL 62701",
      "latitude": 39.7817,
      "longitude": -89.6501,
      "category": "police",
      "riplace_score": 85,
      "contract_value": "$500,000/yr",
      "highlight": "Contract Expiring in <6 months",
      "highlight_type": "timing"
    }
  ],
  "total": 50
}
```

**Mapbox Integration**:
- Use Mapbox Geocoding API for location → coordinates
- Use Mapbox Places API for search
- Use GeoJSON boundaries for state/city filtering

---

### 3. `enrich-prospect` (POST)

**Purpose**: Enrich a single prospect with AI-generated Riplace score, angle, and sources.

**Endpoint**: `/functions/v1/enrich-prospect`

**Request Body**:
```json
{
  "place_id": "ChIJ...",
  "user_id": "uuid-here",
  "filters": {
    "categories": ["police"],
    "competitors": ["Axon"]
  }
}
```

**Logic**:
1. Fetch prospect basic info (name, address, coordinates)
2. Query public data sources:
   - **GovSpend API**: Contract data, expiration dates, vendors
   - **OpenGov**: Budget data, spending trends
   - **USAspending.gov**: Federal contracts
   - **Public records**: FOIA requests, city council minutes (via APIs)
3. Check competitor presence:
   - Search contract data for competitor names
   - Check vendor lists
4. Calculate **Riplace Score** (0-100):
   ```
   score = (
     contract_expiry_proximity * 0.3 +  // 0-30 points (closer = higher)
     competitor_match * 0.4 +            // 0-40 points (using competitor = higher)
     leadership_change * 0.2 +           // 0-20 points (recent change = higher)
     budget_signals * 0.1                // 0-10 points (budget concerns = higher)
   )
   ```
5. Generate **Highlight**: Top reason (e.g., "Contract Expiring <6mo", "New Chief", "Competitor PR issues")
6. Generate **Riplace Angle**: 2-3 sentence strategy using AI
7. Collect **Sources**: 2-3 verifiable URLs (council minutes, news articles, contract docs)

**Response**:
```json
{
  "riplace_score": 85,
  "contract_value": "$500,000/yr",
  "highlight": "Contract Expiring in <6 months",
  "highlight_type": "timing",
  "riplace_angle": "Current contract with ShotSpotter expires March 2025. Recent city council meeting notes indicate budget concerns with renewal pricing. New police chief (appointed Sept 2024) has publicly discussed modernization initiatives.",
  "sources": [
    {
      "label": "City Council Minutes",
      "url": "https://example.gov/council/minutes/2024-10"
    },
    {
      "label": "Police Chief Interview",
      "url": "https://localgazette.com/new-chief-plans"
    }
  ],
  "last_updated": "2025-12-06T00:00:00Z"
}
```

**AI Prompt Template**:
```
Given this prospect:
- Name: {name}
- Location: {address}
- Category: {category}
- Contract Info: {contract_data}
- Competitor Presence: {competitor_info}
- User Product: {user_product_description}

Calculate Riplace Score (0-100) using formula:
- Contract expiry proximity (0-30): {expiry_score}
- Competitor match (0-40): {competitor_score}
- Leadership change (0-20): {leadership_score}
- Budget signals (0-10): {budget_score}

Generate:
1. Top highlight reason (one sentence)
2. Riplace angle (2-3 sentences explaining why this is a good target)
3. Suggest 2-3 source URLs (must be real, verifiable)

Return JSON.
```

**Rate Limiting**: 100 enrichments per user per day

---

### 4. `save-prospect` (POST)

**Purpose**: Save a prospect to user's favorites with optional notes.

**Endpoint**: `/functions/v1/save-prospect`

**Request Body**:
```json
{
  "place_id": "ChIJ...",
  "user_notes": "Chief is not a huge fan of current vendor..."
}
```

**Logic**:
1. Insert/update prospect in `prospects` table
2. Set `is_favorite = true`
3. If `user_notes` provided, update notes and trigger re-scoring (call `enrich-prospect` again)

**Response**:
```json
{
  "success": true,
  "prospect_id": "uuid-here"
}
```

---

### 5. `get-favorites` (GET)

**Purpose**: Get user's favorited prospects with latest enrichment data.

**Endpoint**: `/functions/v1/get-favorites`

**Query Params**: None (uses auth token)

**Logic**:
1. Query `prospects` table WHERE `user_id = auth.uid()` AND `is_favorite = true`
2. Order by `riplace_score` DESC
3. Return full prospect objects

**Response**:
```json
{
  "prospects": [
    {
      "id": "uuid",
      "name": "Springfield PD",
      "riplace_score": 85,
      "contract_value": "$500,000/yr",
      "highlight": "Contract Expiring in <6 months",
      "riplace_angle": "...",
      "sources": [...],
      "user_notes": "...",
      "last_enriched_at": "2025-12-06T00:00:00Z"
    }
  ]
}
```

---

### 6. `update-prospect-notes` (PATCH)

**Purpose**: Update user notes on a prospect and optionally re-score.

**Endpoint**: `/functions/v1/update-prospect-notes`

**Request Body**:
```json
{
  "prospect_id": "uuid",
  "user_notes": "Updated notes..."
}
```

**Logic**:
1. Update `user_notes` in `prospects` table
2. Optionally trigger re-enrichment if notes contain significant new info

**Response**:
```json
{
  "success": true
}
```

---

## Cron Jobs (Daily Re-enrichment)

### Setup pg_cron in Supabase

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily re-enrichment of favorites
SELECT cron.schedule(
  're-enrich-favorites',
  '0 2 * * *',  -- Run at 2 AM daily
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/re-enrich-favorites',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

### `re-enrich-favorites` Edge Function

**Purpose**: Re-enrich all favorited prospects daily to update scores/sources.

**Logic**:
1. Query all prospects WHERE `is_favorite = true` AND `last_enriched_at < NOW() - INTERVAL '1 day'`
2. For each prospect, call `enrich-prospect` logic
3. Update `last_enriched_at` timestamp

---

## External API Integrations

### 1. Mapbox
- **Geocoding API**: Convert location strings to coordinates
- **Places API**: Search for government facilities
- **GeoJSON**: State/city boundaries for filtering

**Setup**: Add Mapbox access token to Supabase secrets

### 2. Public Data Sources
- **GovSpend API**: Contract data, vendor info
- **OpenGov**: Budget data, spending trends
- **USAspending.gov**: Federal contract database
- **Google Custom Search API**: For finding public records, news articles

**Note**: Some APIs may require API keys or have rate limits. Implement caching.

### 3. Web Scraping (Optional)
- Use Puppeteer/Cheerio for scraping company websites
- Or use services like ScraperAPI, Bright Data

---

## Environment Variables

Add to Supabase project settings:

```
OPENAI_API_KEY=sk-...
MAPBOX_ACCESS_TOKEN=pk...
GOVSPEND_API_KEY=...
OPENGOV_API_KEY=...
GOOGLE_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
```

---

## Testing Requirements

### Unit Tests
- Test Riplace score calculation formula
- Test territory filtering logic
- Test competitor matching

### Integration Tests
- Test `search-places` with various filters
- Test `enrich-prospect` with mock data
- Test RLS policies (users can't access others' data)

### Manual Testing Checklist
- [ ] Google OAuth sign-in works
- [ ] Company analysis from domain
- [ ] Territory search returns results
- [ ] Prospect enrichment generates scores
- [ ] Favorites save correctly
- [ ] Daily re-enrichment runs
- [ ] RLS prevents unauthorized access

---

## Error Handling

All edge functions should:
1. Return proper HTTP status codes (200, 400, 401, 500)
2. Log errors to Supabase logs
3. Return user-friendly error messages
4. Fallback to mock data if external APIs fail (for development)

**Example Error Response**:
```json
{
  "error": "Failed to enrich prospect",
  "message": "External API rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## Performance Considerations

1. **Caching**: Cache prospect enrichment results for 24 hours
2. **Rate Limiting**: Implement per-user rate limits (100 enrichments/day)
3. **Batch Processing**: Batch AI calls where possible
4. **Database Indexes**: Ensure indexes on `user_id`, `is_favorite`, `riplace_score`
5. **Pagination**: Limit search results to 50 per page

---

## Deployment Steps

1. **Database**:
   ```bash
   # Run migrations in Supabase SQL Editor
   # Copy SQL from "Database Schema" section above
   ```

2. **Edge Functions**:
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login
   supabase login

   # Link project
   supabase link --project-ref your-project-ref

   # Deploy functions
   supabase functions deploy analyze-company
   supabase functions deploy search-places
   supabase functions deploy enrich-prospect
   supabase functions deploy save-prospect
   supabase functions deploy get-favorites
   supabase functions deploy update-prospect-notes
   supabase functions deploy re-enrich-favorites
   ```

3. **Set Secrets**:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   supabase secrets set MAPBOX_ACCESS_TOKEN=pk...
   # ... etc
   ```

4. **Enable Cron Jobs**: Run SQL from "Cron Jobs" section

---

## Frontend Integration Points

The frontend expects these endpoints:

- `POST /functions/v1/analyze-company` - Called when user submits product description or signs in with Google
- `POST /functions/v1/search-places` - Called when user completes onboarding and searches for prospects
- `POST /functions/v1/enrich-prospect` - Called automatically during search, or when user clicks a prospect
- `POST /functions/v1/save-prospect` - Called when user favorites a prospect
- `GET /functions/v1/get-favorites` - Called on Favorites page
- `PATCH /functions/v1/update-prospect-notes` - Called when user updates notes

All requests should include:
```
Authorization: Bearer <user_jwt_token>
Content-Type: application/json
```

---

## Questions?

If you need clarification on any part of this spec, please ask. The frontend is ready and will work seamlessly once these backend APIs are implemented.

**Priority Order**:
1. Database schema + RLS
2. `analyze-company` (simplest)
3. `search-places` (core functionality)
4. `enrich-prospect` (most complex, can use mock data initially)
5. `save-prospect` + `get-favorites`
6. Cron jobs (can be added later)

Good luck! 🚀

