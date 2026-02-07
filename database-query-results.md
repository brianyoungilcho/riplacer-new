# Database Query Results - Hartford PD Report (February 6, 2026)

## Query Summary

**Date:** February 6, 2026  
**Target:** Research requests with `target_account` containing "Hartford" or "PD"  
**Status:** ⚠️ **RLS (Row Level Security) Blocking Access**

## Findings

### 1. Database Schema Confirmed
- ✅ `research_requests` table exists with expected structure:
  - `id`, `user_id`, `target_account`, `status`
  - `created_at`, `research_started_at`, `research_completed_at`
  - `product_description`, `company_name`, `company_domain`
  - Other fields: `territory_states`, `target_categories`, `competitors`, `additional_context`

- ✅ `research_reports` table exists with expected structure:
  - `id`, `request_id`, `user_id`
  - `content` (JSONB), `summary`, `sources` (JSONB)
  - `generated_at`, `perplexity_tokens_used`
  - One-to-one relationship with `research_requests` via `request_id`

### 2. Query Results
- **Research Requests Found:** 0 (with Hartford/PD on Feb 6, 2026)
- **Research Requests Found (any date):** 0 (with Hartford/PD)
- **Total Requests Visible:** 0

### 3. RLS (Row Level Security) Issue

**Problem:** All queries returned 0 results, likely due to RLS policies blocking access.

**RLS Policy Details:**
```sql
-- From migration: 20260204120000_single_account_research.sql
create policy "Users can manage own research requests"
  on research_requests
  for all
  using (auth.uid() = user_id);
```

**What this means:**
- The policy requires `auth.uid() = user_id` to access rows
- Queries using the **anon key** without authentication can only see rows where `user_id IS NULL`
- If all research requests have a `user_id` set (which is likely), they will be filtered out by RLS
- This explains why we see 0 results even if data exists

### 4. Data Consistency Checks

Unable to verify data consistency due to RLS restrictions. To check:
- ✅ Requests with status 'completed' but missing `research_completed_at` timestamp
- ✅ Requests with `research_completed_at` but no corresponding `research_reports` record
- ✅ Requests with reports but status not 'completed'

## Next Steps

### Option 1: Use Service Role Key (Recommended for Admin Queries)

1. **Get the Service Role Key:**
   - Go to Supabase Dashboard → Project Settings → API
   - Copy the `service_role` key (⚠️ Keep it secret - this bypasses all RLS!)

2. **Add to .env:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Re-run the query script:**
   ```bash
   node query-hartford-pd.js
   ```

The script will automatically detect and use the service role key if available.

### Option 2: Authenticate as the User

If you know which user created the Hartford PD request:
1. Authenticate with that user's session token
2. The query will then return their data

### Option 3: Query via Supabase Dashboard

1. Go to Supabase Dashboard → Table Editor → `research_requests`
2. Use the SQL Editor to run:
   ```sql
   SELECT 
     rr.id,
     rr.target_account,
     rr.status,
     rr.created_at,
     rr.research_started_at,
     rr.research_completed_at,
     rp.id as report_id,
     rp.generated_at,
     rp.summary
   FROM research_requests rr
   LEFT JOIN research_reports rp ON rp.request_id = rr.id
   WHERE (rr.target_account ILIKE '%Hartford%' OR rr.target_account ILIKE '%PD%')
     AND DATE(rr.created_at) = '2026-02-06'
   ORDER BY rr.created_at DESC;
   ```

## Script Created

A query script has been created at `query-hartford-pd.js` that:
- ✅ Queries `research_requests` for Hartford/PD on Feb 6, 2026
- ✅ Checks for corresponding `research_reports` records
- ✅ Analyzes report content structure
- ✅ Detects RLS blocking issues
- ✅ Automatically uses service role key if available

## Database Structure Reference

### research_requests
- Primary key: `id` (UUID)
- Foreign key: `user_id` → `auth.users(id)`
- Indexes: `(user_id, created_at DESC)`
- RLS: Enabled with policy requiring `auth.uid() = user_id`

### research_reports
- Primary key: `id` (UUID)
- Foreign key: `request_id` → `research_requests(id)` (UNIQUE, one-to-one)
- Foreign key: `user_id` → `auth.users(id)`
- Indexes: `(user_id, generated_at DESC)`
- RLS: Enabled with policy requiring `auth.uid() = user_id`

### Expected Report Content Structure
Based on `src/pages/app/ReportDetail.tsx`:
```typescript
{
  title?: string;
  summary?: string;
  topInsight?: string;
  accountSnapshot?: {
    type: string;
    size: string;
    budget: string;
    location: string;
    jurisdiction: string;
  };
  sections?: Array<{
    title?: string;
    heading?: string;
    // ... other section fields
  }>;
  playbook?: {
    outreachSequence: string[];
    talkingPoints: string[];
    whatToAvoid: string[];
    keyDates: Array<{ date: string; event: string; relevance: string }>;
  };
  recommendedActions?: string[];
}
```

## Conclusion

**Current Status:** Cannot verify if Hartford PD report exists due to RLS restrictions.

**Recommendation:** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env` and re-run the query script to get complete database visibility.
