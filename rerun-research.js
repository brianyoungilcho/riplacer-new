import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL?.replace(/"/g, '');
const anonKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY?.replace(/"/g, '');
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, '');

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create Supabase client - use service role if available, otherwise anon key
const supabase = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

console.log(`🔑 Using ${serviceRoleKey ? 'service role' : 'anon'} key`);

async function rerunResearchForUser(email) {
  console.log(`🔍 Looking up user with email: ${email}`);

  try {
    // First, get the user by email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);

    if (userError || !userData?.user) {
      console.error('❌ Failed to find user:', userError?.message);
      return;
    }

    const userId = userData.user.id;
    console.log(`✅ Found user ID: ${userId}`);

    // Get all research requests for this user
    const { data: requests, error: requestsError } = await supabase
      .from('research_requests')
      .select('id, target_account, status, created_at')
      .eq('user_id', userId);

    if (requestsError) {
      console.error('❌ Failed to fetch research requests:', requestsError.message);
      return;
    }

    if (!requests || requests.length === 0) {
      console.log('ℹ️ No research requests found for this user');
      return;
    }

    console.log(`📋 Found ${requests.length} research request(s):`);
    requests.forEach(req => {
      console.log(`  - ${req.target_account} (${req.status}) - ID: ${req.id}`);
    });

    // Process each request
    for (const request of requests) {
      console.log(`\n🔄 Processing: ${request.target_account} (ID: ${request.id})`);

      // Delete existing research reports
      const { error: deleteError } = await supabase
        .from('research_reports')
        .delete()
        .eq('request_id', request.id);

      if (deleteError) {
        console.error(`❌ Failed to delete existing report: ${deleteError.message}`);
        continue;
      }

      // Delete existing agent memory
      const { error: deleteMemoryError } = await supabase
        .from('agent_memory')
        .delete()
        .eq('request_id', request.id);

      if (deleteMemoryError) {
        console.error(`❌ Failed to delete agent memory: ${deleteMemoryError.message}`);
        continue;
      }

      // Reset request status to pending
      const { error: updateError } = await supabase
        .from('research_requests')
        .update({
          status: 'pending',
          research_started_at: null,
          research_completed_at: null
        })
        .eq('id', request.id);

      if (updateError) {
        console.error(`❌ Failed to reset request status: ${updateError.message}`);
        continue;
      }

      console.log(`✅ Reset ${request.target_account} to pending status`);

      // Trigger new research (this will use the multi-agent pipeline)
      try {
        const { error: invokeError } = await supabase.functions.invoke('research-target-account', {
          body: { requestId: request.id },
        });

        if (invokeError) {
          console.error(`❌ Failed to start research for ${request.target_account}:`, invokeError.message);
        } else {
          console.log(`🚀 Started multi-agent research for ${request.target_account}`);
        }
      } catch (invokeError) {
        console.error(`❌ Failed to invoke research function:`, invokeError.message);
      }
    }

    console.log(`\n🎉 Research rerun initiated for ${requests.length} request(s)`);
    console.log(`📊 Check your app dashboard to see the real-time multi-agent research progress!`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'brianyoungilcho@gmail.com';

console.log(`🚀 Rerunning research for: ${email}`);
console.log(`📝 This will:`);
console.log(`   - Delete existing research reports`);
console.log(`   - Delete existing agent memory`);
console.log(`   - Reset status to 'pending'`);
console.log(`   - Trigger new multi-agent research`);
console.log('');

rerunResearchForUser(email);