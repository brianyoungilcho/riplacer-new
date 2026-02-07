import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = join(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)="?(.+?)"?$/);
        if (match) {
          env[match[1].trim()] = match[2].trim();
        }
      }
    });
    return env;
  } catch (e) {
    console.warn('⚠️  Could not read .env file, using process.env only');
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('❌ ERROR: VITE_SUPABASE_URL is required');
  console.error('   Please set it in .env or as an environment variable');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is required');
  console.error('   This script requires the service role key to bypass RLS policies.');
  console.error('   Get it from: Supabase Dashboard > Project Settings > API > service_role key');
  console.error('   Add it to .env as: SUPABASE_SERVICE_ROLE_KEY=your-key-here');
  process.exit(1);
}

console.log('🔍 Hartford PD Report Database Check\n');
console.log('Using service role key (bypasses RLS policies)');
console.log('Supabase URL:', supabaseUrl);
console.log('Key:', `${serviceRoleKey.substring(0, 20)}...${serviceRoleKey.substring(serviceRoleKey.length - 10)}\n`);

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkHartfordPDReport() {
  console.log('═'.repeat(80));
  console.log('1. CHECKING IF HARTFORD PD REPORT EXISTS');
  console.log('═'.repeat(80));
  
  // Search for Hartford PD in target_account field
  // Try multiple search patterns
  const searchPatterns = [
    '%Hartford%',
    '%PD%',
    '%hartford%',
    '%Hartford PD%',
    '%Hartford Police%',
    '%Hartford Police Department%'
  ];
  
  let allMatches = [];
  
  for (const pattern of searchPatterns) {
    const { data, error } = await supabase
      .from('research_requests')
      .select('*')
      .ilike('target_account', pattern)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`❌ Error querying with pattern "${pattern}":`, error);
      continue;
    }
    
    if (data && data.length > 0) {
      // Deduplicate by ID
      const newMatches = data.filter(req => !allMatches.find(existing => existing.id === req.id));
      allMatches.push(...newMatches);
    }
  }
  
  // Also check recent requests from Feb 6, 2026
  const { data: recentRequests, error: recentError } = await supabase
    .from('research_requests')
    .select('*')
    .gte('created_at', '2026-02-06T00:00:00Z')
    .lt('created_at', '2026-02-07T00:00:00Z')
    .order('created_at', { ascending: false });
  
  if (!recentError && recentRequests) {
    const newMatches = recentRequests.filter(req => 
      !allMatches.find(existing => existing.id === req.id)
    );
    allMatches.push(...newMatches);
  }
  
  // Filter to Hartford-related ones
  const hartfordReports = allMatches.filter(req => 
    req.target_account && 
    (req.target_account.toLowerCase().includes('hartford') || 
     req.target_account.toLowerCase().includes('pd') ||
     req.target_account.toLowerCase().includes('police'))
  );
  
  if (hartfordReports.length === 0) {
    console.log('❌ No Hartford PD report found in research_requests table');
    console.log('\n📊 Checking all recent requests to see what exists...');
    
    const { data: allRecent, error: allRecentError } = await supabase
      .from('research_requests')
      .select('id, target_account, status, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!allRecentError && allRecent) {
      console.log(`\nFound ${allRecent.length} most recent requests:`);
      allRecent.forEach((req, idx) => {
        const date = req.created_at ? new Date(req.created_at).toISOString().split('T')[0] : 'N/A';
        console.log(`  ${idx + 1}. ${req.target_account || 'N/A'} - Status: ${req.status} - Created: ${date}`);
      });
    }
    
    console.log('\n⚠️  No Hartford PD report found. The report may not exist or may have been deleted.');
    return;
  }
  
  console.log(`✅ Found ${hartfordReports.length} Hartford PD report(s)\n`);
  
  // Process each report
  for (let i = 0; i < hartfordReports.length; i++) {
    const request = hartfordReports[i];
    
    console.log('═'.repeat(80));
    console.log(`REPORT ${i + 1} of ${hartfordReports.length}`);
    console.log('═'.repeat(80));
    
    // 2. STATUS
    console.log('\n📊 STATUS:');
    console.log(`   Status: ${request.status || 'N/A'}`);
    console.log(`   Created At: ${request.created_at || 'N/A'}`);
    console.log(`   Research Started At: ${request.research_started_at || 'Not started'}`);
    console.log(`   Research Completed At: ${request.research_completed_at || 'Not completed'}`);
    
    // Status consistency check
    if (request.status === 'completed' && !request.research_completed_at) {
      console.log('   ⚠️  WARNING: Status is "completed" but research_completed_at is not set');
    }
    if (request.status !== 'completed' && request.research_completed_at) {
      console.log('   ⚠️  WARNING: research_completed_at is set but status is not "completed"');
    }
    
    // 3. OWNERSHIP
    console.log('\n👤 OWNERSHIP:');
    console.log(`   User ID: ${request.user_id || 'NULL (no owner)'}`);
    
    if (request.user_id) {
      // Try to get user email from auth.users
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(request.user_id);
      if (!userError && userData?.user) {
        console.log(`   Email: ${userData.user.email || 'N/A'}`);
        console.log(`   Created At: ${userData.user.created_at || 'N/A'}`);
      } else {
        console.log(`   Email: Could not fetch (${userError?.message || 'Unknown error'})`);
      }
    } else {
      console.log('   ⚠️  WARNING: This request has no user_id (orphaned record)');
    }
    
    // Request details
    console.log('\n📝 REQUEST DETAILS:');
    console.log(`   ID: ${request.id}`);
    console.log(`   Target Account: ${request.target_account || 'N/A'}`);
    console.log(`   Company Name: ${request.company_name || 'N/A'}`);
    console.log(`   Company Domain: ${request.company_domain || 'N/A'}`);
    console.log(`   Product Description: ${request.product_description ? request.product_description.substring(0, 100) + '...' : 'N/A'}`);
    
    // 4. CHECK FOR CORRESPONDING RESEARCH_REPORTS DATA
    console.log('\n📄 RESEARCH REPORTS DATA:');
    
    const { data: report, error: reportError } = await supabase
      .from('research_reports')
      .select('*')
      .eq('request_id', request.id)
      .maybeSingle();
    
    if (reportError) {
      console.log(`   ❌ Error querying research_reports: ${reportError.message}`);
      console.log(`   Error code: ${reportError.code}`);
      console.log(`   Error details: ${JSON.stringify(reportError, null, 2)}`);
    } else if (!report) {
      console.log('   ❌ No research_report found for this request');
      console.log('   This means the research was requested but no report was generated yet.');
      
      if (request.status === 'completed') {
        console.log('   ⚠️  WARNING: Status is "completed" but no report exists - data inconsistency!');
      }
    } else {
      console.log('   ✅ Research report found!');
      console.log(`   Report ID: ${report.id}`);
      console.log(`   Generated At: ${report.generated_at || 'N/A'}`);
      console.log(`   Summary: ${report.summary ? report.summary.substring(0, 150) + '...' : 'N/A'}`);
      console.log(`   Sources Count: ${Array.isArray(report.sources) ? report.sources.length : 0}`);
      console.log(`   Perplexity Tokens Used: ${report.perplexity_tokens_used || 'N/A'}`);
      console.log(`   Report User ID: ${report.user_id || 'NULL'}`);
      
      // Check user_id consistency
      if (request.user_id !== report.user_id) {
        console.log(`   ⚠️  WARNING: Request user_id (${request.user_id}) does not match report user_id (${report.user_id})`);
      }
      
      // Check content structure
      if (report.content) {
        console.log('\n   📋 Report Content Structure:');
        const content = report.content;
        console.log(`      Type: ${typeof content}`);
        if (typeof content === 'object') {
          console.log(`      Keys: ${Object.keys(content).join(', ')}`);
          if (content.title) console.log(`      Title: ${content.title}`);
          if (content.summary) console.log(`      Summary: ${content.summary.substring(0, 100)}...`);
          if (content.topInsight) console.log(`      Top Insight: ${content.topInsight.substring(0, 100)}...`);
          if (content.accountSnapshot) {
            console.log(`      Account Snapshot: ${JSON.stringify(content.accountSnapshot, null, 6)}`);
          }
          if (content.sections && Array.isArray(content.sections)) {
            console.log(`      Sections: ${content.sections.length}`);
            content.sections.forEach((section, idx) => {
              console.log(`        ${idx + 1}. ${section.title || section.heading || 'Untitled'}`);
            });
          }
        }
      }
    }
    
    // 5. RLS POLICY CHECK
    console.log('\n🔒 RLS (Row Level Security) POLICY CHECK:');
    console.log('   Current Access: Service Role Key (bypasses RLS) ✅');
    
    // Test with anon key to see if RLS would block
    const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (anonKey) {
      const anonClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      
      const { data: anonData, error: anonError } = await anonClient
        .from('research_requests')
        .select('id')
        .eq('id', request.id)
        .maybeSingle();
      
      if (anonError) {
        console.log(`   ⚠️  RLS would block access with anon key: ${anonError.message}`);
        console.log(`   Error code: ${anonError.code}`);
      } else if (!anonData) {
        console.log('   ⚠️  RLS would block access with anon key (no data returned)');
        console.log('   This is expected if user_id is set and user is not authenticated.');
      } else {
        console.log('   ℹ️  RLS allows access with anon key (user_id is NULL or policy allows)');
      }
    } else {
      console.log('   ℹ️  Could not test with anon key (VITE_SUPABASE_PUBLISHABLE_KEY not found)');
    }
    
    console.log('\n   RLS Policy Details:');
    console.log('   Table: research_requests');
    console.log('   Policy: "Users can manage own research requests"');
    console.log('   Condition: auth.uid() = user_id');
    console.log('   Effect: Users can only see their own requests');
    console.log('   Service Role: Bypasses all RLS policies ✅');
    
    console.log('\n');
  }
  
  // Summary
  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total Hartford PD reports found: ${hartfordReports.length}`);
  
  const completed = hartfordReports.filter(r => r.status === 'completed').length;
  const withReports = await Promise.all(
    hartfordReports.map(async (req) => {
      const { data } = await supabase
        .from('research_reports')
        .select('id')
        .eq('request_id', req.id)
        .maybeSingle();
      return !!data;
    })
  );
  const reportsWithData = withReports.filter(Boolean).length;
  
  console.log(`Reports with status "completed": ${completed}`);
  console.log(`Reports with research_reports data: ${reportsWithData}`);
  console.log(`Reports with user_id set: ${hartfordReports.filter(r => r.user_id).length}`);
  
  const inconsistencies = [];
  for (let i = 0; i < hartfordReports.length; i++) {
    const req = hartfordReports[i];
    const hasReport = withReports[i];
    
    if (req.status === 'completed' && !hasReport) {
      inconsistencies.push(`Request ${req.id}: Status completed but no report`);
    }
    if (req.status === 'completed' && !req.research_completed_at) {
      inconsistencies.push(`Request ${req.id}: Status completed but no research_completed_at`);
    }
    if (!req.user_id) {
      inconsistencies.push(`Request ${req.id}: No user_id (orphaned)`);
    }
  }
  
  if (inconsistencies.length > 0) {
    console.log('\n⚠️  DATA INCONSISTENCIES FOUND:');
    inconsistencies.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('\n✅ No data inconsistencies detected');
  }
  
  console.log('\n✅ Database check complete!\n');
}

// Run the check
checkHartfordPDReport().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
