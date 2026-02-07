// Browser console script to reset and restart research
// Run this in the browser console while logged in to brianyoungilcho@gmail.com

async function resetAndRestartAllResearch() {
  console.log('🚀 Resetting and restarting all research for current user...');

  try {
    // Get current user
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No authenticated user found');
      return;
    }

    console.log(`✅ User: ${user.email} (${user.id})`);

    // Get all research requests
    const { data: requests, error: requestsError } = await window.supabase
      .from('research_requests')
      .select('id, target_account, status')
      .eq('user_id', user.id);

    if (requestsError) {
      console.error('❌ Failed to fetch requests:', requestsError);
      return;
    }

    if (!requests || requests.length === 0) {
      console.log('ℹ️ No research requests found');
      return;
    }

    console.log(`📋 Found ${requests.length} request(s):`);
    requests.forEach(req => console.log(`  - ${req.target_account} (${req.status})`));

    // Process each request
    for (const request of requests) {
      console.log(`\n🔄 Processing: ${request.target_account}`);

      try {
        // Reset to pending
        const { error: updateError } = await window.supabase
          .from('research_requests')
          .update({
            status: 'pending',
            research_started_at: null,
            research_completed_at: null
          })
          .eq('id', request.id);

        if (updateError) {
          console.error(`❌ Failed to reset status:`, updateError);
          continue;
        }

        // Delete existing reports (RLS might prevent this)
        const { error: deleteReportError } = await window.supabase
          .from('research_reports')
          .delete()
          .eq('request_id', request.id);

        if (deleteReportError) {
          console.warn(`⚠️ Could not delete existing report (RLS):`, deleteReportError.message);
        }

        // Delete agent memory (RLS might prevent this)
        const { error: deleteMemoryError } = await window.supabase
          .from('agent_memory')
          .delete()
          .eq('request_id', request.id);

        if (deleteMemoryError) {
          console.warn(`⚠️ Could not delete agent memory (RLS):`, deleteMemoryError.message);
        }

        // Start new research
        const { error: invokeError } = await window.supabase.functions.invoke('research-target-account', {
          body: { requestId: request.id },
        });

        if (invokeError) {
          console.error(`❌ Failed to start research:`, invokeError);
        } else {
          console.log(`✅ Started multi-agent research for ${request.target_account}`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${request.target_account}:`, error);
      }
    }

    console.log('\n🎉 Research reset complete!');
    console.log('🔄 Refresh the page to see real-time multi-agent research progress!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined' && window.supabase) {
  resetAndRestartAllResearch();
} else {
  console.log('📋 Copy and paste this function into your browser console while logged in:');
  console.log(resetAndRestartAllResearch.toString());
}