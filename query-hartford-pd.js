import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables from .env file
function loadEnv() {
  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)="?(.+?)"?$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
    return env;
  } catch (e) {
    console.warn('Could not read .env file, using defaults');
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rpkcwosacdsadclyhyuv.supabase.co';
// Try service role key first (bypasses RLS), then fall back to anon key
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const usingServiceRole = !!(env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('Connecting to Supabase...');
console.log('URL:', supabaseUrl);
console.log('Using key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT FOUND');
console.log('Key type:', usingServiceRole ? 'SERVICE_ROLE (bypasses RLS)' : 'ANON (subject to RLS)');

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryHartfordPD() {
  console.log('\n=== Checking database access ===\n');
  
  // First, try to query all research requests to check if RLS is blocking
  const { data: allRequests, error: allError } = await supabase
    .from('research_requests')
    .select('id, target_account, created_at, status, user_id')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (allError) {
    console.error('Error querying all research_requests:', allError);
    console.error('This might indicate RLS (Row Level Security) is blocking access.');
    console.error('Error code:', allError.code);
    console.error('Error message:', allError.message);
    console.error('Error details:', JSON.stringify(allError, null, 2));
    console.log('\nNote: RLS policies require auth.uid() = user_id, so queries without authentication');
    console.log('will only return rows where user_id is NULL (if such rows exist).');
    return;
  }
  
  console.log(`Found ${allRequests?.length || 0} total research request(s) (showing first 5):`);
  if (allRequests && allRequests.length > 0) {
    allRequests.forEach(req => {
      const date = req.created_at ? new Date(req.created_at).toISOString().split('T')[0] : 'N/A';
      console.log(`  - ${req.target_account} (${date}) - Status: ${req.status} - User: ${req.user_id?.substring(0, 8) || 'NULL'}...`);
    });
  } else {
    console.log('  No requests found (database may be empty or RLS is filtering all rows)');
  }
  
  console.log('\n=== Querying research_requests for Hartford PD ===\n');
  
  // Query for research requests with Hartford or PD in target_account from Feb 6, 2026
  const { data: requests, error: requestsError } = await supabase
    .from('research_requests')
    .select('*')
    .or('target_account.ilike.%Hartford%,target_account.ilike.%PD%')
    .gte('created_at', '2026-02-06T00:00:00Z')
    .lt('created_at', '2026-02-07T00:00:00Z')
    .order('created_at', { ascending: false });

  if (requestsError) {
    console.error('Error querying research_requests:', requestsError);
    console.error('Error details:', JSON.stringify(requestsError, null, 2));
    return;
  }

  console.log(`Found ${requests?.length || 0} research request(s):\n`);

  if (!requests || requests.length === 0) {
    console.log('No research requests found for Hartford PD on February 6, 2026.');
    console.log('\nTrying broader search (any date)...');
    
    const { data: allRequests, error: allError } = await supabase
      .from('research_requests')
      .select('id, target_account, created_at, status')
      .or('target_account.ilike.%Hartford%,target_account.ilike.%PD%')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allError) {
      console.error('Error in broader search:', allError);
    } else {
      console.log(`Found ${allRequests?.length || 0} request(s) with Hartford/PD (any date):`);
      if (allRequests && allRequests.length > 0) {
        allRequests.forEach(req => {
          console.log(`  - ${req.target_account} (${req.created_at}) - Status: ${req.status}`);
        });
      }
    }
    
    // Show RLS analysis even when no results found
    console.log('\n' + '─'.repeat(80));
    console.log('\n=== RLS (Row Level Security) Analysis ===\n');
    console.log('Current query status: Using anon key without authentication');
    console.log('RLS Policy: "Users can manage own research requests"');
    console.log('Policy condition: auth.uid() = user_id');
    console.log('\nThis means:');
    console.log('  - Queries without authentication can only see rows where user_id IS NULL');
    console.log('  - If all rows have user_id set, they will be filtered out by RLS');
    console.log('  - To query all data, you need either:');
    console.log('    1. Service role key (bypasses RLS)');
    console.log('    2. Authenticate as the user who created the request');
    console.log('\nTo get the service role key:');
    console.log('  1. Go to Supabase Dashboard > Project Settings > API');
    console.log('  2. Copy the "service_role" key (keep it secret!)');
    console.log('  3. Add it to .env as SUPABASE_SERVICE_ROLE_KEY');
    console.log('  4. Re-run this script');
    return;
  }

  // For each request, get the corresponding report
  for (const request of requests) {
    console.log('─'.repeat(80));
    console.log('Research Request:');
    console.log('  ID:', request.id);
    console.log('  User ID:', request.user_id);
    console.log('  Target Account:', request.target_account);
    console.log('  Status:', request.status);
    console.log('  Created At:', request.created_at);
    console.log('  Research Started At:', request.research_started_at || 'Not started');
    console.log('  Research Completed At:', request.research_completed_at || 'Not completed');
    console.log('  Product Description:', request.product_description?.substring(0, 100) + '...');
    console.log('  Company Name:', request.company_name || 'N/A');
    console.log('  Company Domain:', request.company_domain || 'N/A');
    
    // Query for corresponding report
    const { data: report, error: reportError } = await supabase
      .from('research_reports')
      .select('*')
      .eq('request_id', request.id)
      .single();

    if (reportError) {
      if (reportError.code === 'PGRST116') {
        console.log('\n  Report: Not found (no report exists for this request)');
      } else {
        console.log('\n  Report Error:', reportError.message);
        console.log('  Error details:', JSON.stringify(reportError, null, 2));
      }
    } else {
      console.log('\n  Report Found:');
      console.log('    Report ID:', report.id);
      console.log('    Generated At:', report.generated_at);
      console.log('    Summary:', report.summary ? report.summary.substring(0, 200) + '...' : 'N/A');
      console.log('    Sources Count:', Array.isArray(report.sources) ? report.sources.length : 0);
      console.log('    Perplexity Tokens Used:', report.perplexity_tokens_used || 'N/A');
      
      // Check content structure
      if (report.content) {
        console.log('\n    Content Structure:');
        const content = report.content;
        console.log('      Type:', typeof content);
        if (typeof content === 'object') {
          console.log('      Keys:', Object.keys(content));
          if (content.title) console.log('      Title:', content.title);
          if (content.summary) console.log('      Summary:', content.summary.substring(0, 100) + '...');
          if (content.topInsight) console.log('      Top Insight:', content.topInsight.substring(0, 100) + '...');
          if (content.accountSnapshot) {
            console.log('      Account Snapshot:', JSON.stringify(content.accountSnapshot, null, 8));
          }
          if (content.sections && Array.isArray(content.sections)) {
            console.log(`      Sections Count: ${content.sections.length}`);
            content.sections.forEach((section, idx) => {
              console.log(`        Section ${idx + 1}:`, section.title || section.heading || 'Untitled');
            });
          }
          if (content.playbook) {
            console.log('      Playbook:', {
              outreachSequence: content.playbook.outreachSequence?.length || 0,
              talkingPoints: content.playbook.talkingPoints?.length || 0,
              whatToAvoid: content.playbook.whatToAvoid?.length || 0,
              keyDates: content.playbook.keyDates?.length || 0,
            });
          }
          if (content.recommendedActions && Array.isArray(content.recommendedActions)) {
            console.log(`      Recommended Actions: ${content.recommendedActions.length}`);
          }
        }
      }
    }
    
    console.log('');
  }

  console.log('─'.repeat(80));
  console.log('\n=== Summary and Data Consistency Check ===\n');
  
  if (requests && requests.length > 0) {
    console.log('Summary:');
    console.log(`  Total requests found: ${requests.length}`);
    console.log(`  Requests with status 'completed': ${requests.filter(r => r.status === 'completed').length}`);
    console.log(`  Requests with research_completed_at set: ${requests.filter(r => r.research_completed_at).length}`);
    
    // Check for data inconsistencies
    const completedWithoutTimestamp = requests.filter(r => r.status === 'completed' && !r.research_completed_at);
    if (completedWithoutTimestamp.length > 0) {
      console.log(`\n  ⚠️  WARNING: ${completedWithoutTimestamp.length} request(s) marked as completed but missing research_completed_at timestamp`);
    }
  } else {
    console.log('No Hartford PD requests found for February 6, 2026.');
  }
  
  console.log('\n=== RLS (Row Level Security) Analysis ===\n');
  console.log('Current query status: Using anon key without authentication');
  console.log('RLS Policy: "Users can manage own research requests"');
  console.log('Policy condition: auth.uid() = user_id');
  console.log('\nThis means:');
  console.log('  - Queries without authentication can only see rows where user_id IS NULL');
  console.log('  - If all rows have user_id set, they will be filtered out by RLS');
  console.log('  - To query all data, you need either:');
  console.log('    1. Service role key (bypasses RLS)');
  console.log('    2. Authenticate as the user who created the request');
  console.log('\nTo get the service role key:');
  console.log('  1. Go to Supabase Dashboard > Project Settings > API');
  console.log('  2. Copy the "service_role" key (keep it secret!)');
  console.log('  3. Add it to .env as SUPABASE_SERVICE_ROLE_KEY');
}

queryHartfordPD().catch(console.error);
