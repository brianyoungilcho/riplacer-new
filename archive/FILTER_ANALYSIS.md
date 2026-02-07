# Filter Analysis: Hartford PD Report Exclusion Investigation

## Summary
Examined the codebase for hidden filters, status checks, or conditions that might exclude the Hartford PD report. **No filters were found that would exclude reports from being displayed.**

## Query Logic Analysis

### ReportInbox.tsx - Main Query (lines 84-100)
```typescript
const { data, error } = await supabase
  .from("research_requests")
  .select(`
    id,
    target_account,
    status,
    created_at,
    product_description,
    company_name,
    company_domain,
    territory_states,
    target_categories,
    competitors,
    additional_context,
    research_reports(id, summary, generated_at)
  `)
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
```

**Findings:**
- ✅ **No status filtering** - Query fetches ALL requests regardless of status (pending, researching, completed, failed)
- ✅ **No date range filters** - All requests are fetched regardless of creation date
- ✅ **No text search filters** - No filtering by target_account name or other text fields
- ✅ **Permission check only** - Only filters by `user_id` matching current user
- ✅ **No hardcoded exclusions** - No code that excludes specific accounts or patterns

### ReportDetail.tsx - Detail Query (lines 82-90)
```typescript
const { data: requestData, error } = await supabase
  .from("research_requests")
  .select(`*, research_reports(*)`)
  .eq("id", requestId)
  .eq("user_id", user.id)
  .single();
```

**Findings:**
- ✅ Same pattern - no status, date, or text filters
- ✅ Only checks user_id and request ID

## Rendering Logic Analysis

### ReportInbox.tsx - Display Logic (lines 601-702)

**Findings:**
- ✅ **All account groups are rendered** (line 603) - No filtering before display
- ✅ **All requests within each group are rendered** (line 664) - No filtering of individual requests
- ✅ **Status affects UI but not visibility**:
  - Line 671: "View Report" button only shown for completed reports (but request still displays)
  - Line 679: "Re-queue" button only shown for failed reports (but request still displays)
  - All statuses (pending, researching, completed, failed) are displayed

### Conditional Rendering Based on Status

**Line 378 - getSummaryExcerpt function:**
```typescript
if (request.status === "completed" && request.research_reports?.[0]?.summary) {
  return request.research_reports[0].summary;
}
```
- ✅ This only affects the summary text displayed, NOT whether the report is shown
- ✅ Reports with other statuses still display with default messages

**Line 405 - fetchAccountIntelligence function:**
```typescript
const completedRequest = requests
  .filter(req => req.status === "completed")
  .sort(...)[0];
```
- ✅ This filter is ONLY used for fetching account intelligence data
- ✅ Does NOT affect which reports are displayed in the list

## Database-Level Filters (RLS Policies)

### Migration: 20260204120000_single_account_research.sql

**RLS Policies:**
```sql
create policy "Users can manage own research requests"
  on research_requests
  for all
  using (auth.uid() = user_id);

create policy "Users can manage own research reports"
  on research_reports
  for all
  using (auth.uid() = user_id);
```

**Findings:**
- ✅ Policies only check `user_id` matches authenticated user
- ✅ No status-based restrictions
- ✅ No account name-based restrictions
- ⚠️ **Potential Issue**: When querying nested relationships (`research_reports`), Supabase applies RLS to the nested table. If a `research_report` has an incorrect or null `user_id`, it won't be returned even if the parent `research_request` is returned.

## Potential Issues Identified

### 1. Nested Relationship RLS (Most Likely Issue)
**Location:** Query at line 58 in ReportInbox.tsx
```typescript
research_reports(id, summary, generated_at)
```

**Issue:** When Supabase queries nested relationships with RLS enabled:
- If `research_reports.user_id` doesn't match `auth.uid()`, the nested array will be empty `[]`
- The parent `research_request` will still be returned, but `research_reports` will be empty
- This could make it appear as if the report doesn't exist

**Verification Needed:**
- Check if Hartford PD's `research_reports` table has correct `user_id`
- Check if `research_reports.user_id` is NULL for Hartford PD report

### 2. Data Consistency
**Location:** supabase/functions/research-target-account/index.ts:655
```typescript
user_id: request.user_id,
```

**Finding:** Code correctly sets `user_id` when creating reports, but if there was an error during creation or if the report was created before this code was in place, `user_id` might be incorrect.

## Recommendations

1. **Check Database Directly:**
   ```sql
   SELECT rr.id, rr.target_account, rr.status, rr.user_id,
          rp.id as report_id, rp.user_id as report_user_id
   FROM research_requests rr
   LEFT JOIN research_reports rp ON rp.request_id = rr.id
   WHERE rr.target_account ILIKE '%Hartford%'
   AND rr.user_id = '<current_user_id>';
   ```

2. **Check for NULL user_id in research_reports:**
   ```sql
   SELECT * FROM research_reports 
   WHERE user_id IS NULL 
   OR user_id != (SELECT user_id FROM research_requests WHERE id = request_id);
   ```

3. **Add Debugging:**
   - The code already has extensive logging (lines 122-185)
   - Check browser console for the Hartford PD report search logs
   - Look for `🔍 [ReportInbox] Hartford PD report search:` log entry

4. **Verify RLS Policy Behavior:**
   - Test if nested relationship queries return empty arrays when user_id doesn't match
   - Consider temporarily disabling RLS to test if that's the issue

## Conclusion

**No application-level filters were found that would exclude the Hartford PD report.** The most likely issue is:

1. **RLS policy on nested relationship** - `research_reports.user_id` might not match the authenticated user
2. **Data inconsistency** - `research_reports.user_id` might be NULL or incorrect for Hartford PD report
3. **Report doesn't exist** - The report might not have been created successfully

The query logic and rendering logic both show ALL reports regardless of status, date, or account name. The only filtering is by `user_id` for security purposes.
