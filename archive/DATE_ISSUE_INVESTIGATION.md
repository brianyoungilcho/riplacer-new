# Date-Related Issues Investigation Report

## Date: February 6, 2026

## Summary
Investigated date-related issues that might prevent reports from displaying correctly. Found and fixed one critical bug and improved date formatting logic.

## Issues Found and Fixed

### 1. ✅ CRITICAL BUG: Sorting Logic Error in ReportInbox.tsx (Line 87)

**Problem:**
The sorting logic for grouping reports by account had a potential bug where it could fail silently if:
- An account group had an empty array
- A request object was missing the `created_at` property
- Date parsing failed

**Original Code:**
```typescript
const sortedGroups = new Map(
  Array.from(groups.entries()).sort(([, a], [, b]) =>
    new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime()
  )
);
```

**Fixed Code:**
```typescript
const sortedGroups = new Map(
  Array.from(groups.entries()).sort(([, a], [, b]) => {
    const aDate = a[0]?.created_at ? new Date(a[0].created_at).getTime() : 0;
    const bDate = b[0]?.created_at ? new Date(b[0].created_at).getTime() : 0;
    return bDate - aDate;
  })
);
```

**Impact:** This bug could cause reports to not display in the correct order or potentially fail to display if date parsing encountered issues.

### 2. ✅ IMPROVED: Date Formatting Logic in ReportInbox.tsx

**Problem:**
The `formatDate` function used `Math.abs()` and `Math.ceil()` which could produce incorrect relative dates ("Today", "Yesterday") due to timezone differences or edge cases.

**Original Logic:**
- Used absolute time difference
- Could incorrectly classify dates due to timezone issues
- Inconsistent with calendar days

**Improved Logic:**
- Now checks actual calendar days (ignoring time)
- Properly handles "Today" and "Yesterday" based on calendar date
- More reliable date comparisons

## Date Storage vs Display Analysis

### Database Storage
- **Format:** `timestamptz` (PostgreSQL timestamp with timezone)
- **Fields:** 
  - `research_requests.created_at` - `timestamptz default now()`
  - `research_reports.generated_at` - `timestamptz default now()`
- **Storage:** UTC timestamps stored correctly

### UI Display
- **ReportDetail.tsx:** Formats as "February 6, 2026" (full date format)
  ```typescript
  date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  ```
- **ReportInbox.tsx:** Uses relative dates ("Today", "Yesterday", "X days ago") or short format
- **Parsing:** Uses `new Date(dateString)` which correctly handles ISO 8601 strings from Supabase

### Timezone Handling
✅ **No issues found:**
- Supabase returns ISO 8601 strings (e.g., "2026-02-06T12:34:56.789Z")
- JavaScript `new Date()` correctly parses these strings
- `toLocaleDateString()` uses browser's local timezone automatically
- No manual timezone conversions that could cause issues

## Date Range Filters

✅ **No date range filters found:**
- Queries use `.order("created_at", { ascending: false })` for sorting only
- No `.gte()`, `.lte()`, `.gt()`, or `.lt()` filters that would exclude reports
- All reports for a user are fetched without date restrictions

## Date Format Verification

### Database → UI Flow
1. **Database:** Stores as `timestamptz` (UTC)
2. **Supabase Client:** Returns ISO 8601 string
3. **JavaScript:** `new Date(dateString)` parses correctly
4. **UI:** Formats using `toLocaleDateString()` with user's timezone

### Format Examples
- **Database:** `2026-02-06 12:34:56.789+00` (UTC)
- **Supabase Response:** `"2026-02-06T12:34:56.789Z"`
- **UI Display (ReportDetail):** `"February 6, 2026"`
- **UI Display (ReportInbox):** `"Today"` or `"Feb 6, 2026"` depending on date

## Recommendations

1. ✅ **Fixed:** Sorting bug that could prevent proper display
2. ✅ **Improved:** Date formatting logic for better reliability
3. **Consider:** Adding error handling/logging for date parsing failures
4. **Consider:** Adding unit tests for date formatting functions
5. **Consider:** Standardizing date format across all components

## Testing Recommendations

1. Test with reports created at different times of day
2. Test with reports created in different timezones
3. Test with edge cases (empty arrays, missing dates)
4. Verify sorting works correctly with multiple accounts
5. Verify "Today"/"Yesterday" display correctly

## Files Modified

1. `src/pages/app/ReportInbox.tsx`
   - Fixed sorting logic (line 85-91)
   - Improved `formatDate` function (line 160-180)

## Conclusion

The main issue was the sorting logic bug that could cause reports to not display correctly. The date formatting improvement adds robustness. No timezone conversion issues were found, and the date format matches the expected "February 6, 2026" format when displayed in ReportDetail.
