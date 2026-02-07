// Quick script to check if agent_memory table exists in remote Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim().replace(/"/g, '');
  }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_PUBLISHABLE_KEY);

async function checkTables() {
  console.log('🔍 Checking if agent_memory table exists...');

  try {
    // Try to query the agent_memory table
    const { data, error } = await supabase
      .from('agent_memory')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ agent_memory table does not exist or is not accessible');
      console.log('Error:', error.message);
    } else {
      console.log('✅ agent_memory table exists');
      console.log('Count:', data);
    }

    // Also check research_requests
    const { data: reqData, error: reqError } = await supabase
      .from('research_requests')
      .select('count', { count: 'exact', head: true });

    if (reqError) {
      console.log('❌ research_requests table issue:', reqError.message);
    } else {
      console.log('✅ research_requests table exists');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTables();