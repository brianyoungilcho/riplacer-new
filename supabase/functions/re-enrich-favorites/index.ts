import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role for this cron job
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting daily re-enrichment of favorites...');

    // Get all favorited prospects that haven't been enriched in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: staleProspects, error: fetchError } = await supabase
      .from('prospects')
      .select(`
        id,
        name,
        address,
        website_url,
        place_id,
        enriched_at,
        user_leads!inner (
          user_id,
          status
        )
      `)
      .or(`enriched_at.is.null,enriched_at.lt.${oneDayAgo}`)
      .limit(50); // Process 50 at a time to avoid timeout

    if (fetchError) {
      console.error('Error fetching stale prospects:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${staleProspects?.length || 0} prospects to re-enrich`);

    if (!staleProspects || staleProspects.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No prospects need re-enrichment', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let errors = 0;

    // Get user context for enrichment (we'll use a generic context for batch processing)
    for (const prospect of staleProspects) {
      try {
        // Get user's profile for context
        const userId = (prospect.user_leads as any[])?.[0]?.user_id;
        if (!userId) continue;

        const { data: profile } = await supabase
          .from('profiles')
          .select('selling_proposition, competitor_names')
          .eq('id', userId)
          .single();

        // Call the enrich-prospect function
        const enrichResponse = await fetch(`${supabaseUrl}/functions/v1/enrich-prospect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            prospect: {
              name: prospect.name,
              address: prospect.address,
              website_url: prospect.website_url,
            },
            user_context: {
              selling_proposition: profile?.selling_proposition,
              competitors: profile?.competitor_names || [],
            },
          }),
        });

        if (enrichResponse.ok) {
          const enrichData = await enrichResponse.json();
          const enrichment = enrichData.enrichment;

          // Update the prospect with new enrichment data
          await supabase
            .from('prospects')
            .update({
              ai_enrichment_json: enrichment,
              riplace_score: enrichment?.riplace_score || 0,
              contract_value: enrichment?.contract_value,
              highlight: enrichment?.highlight,
              highlight_type: enrichment?.highlight_type,
              riplace_angle: enrichment?.riplace_angle,
              sources: enrichment?.sources || [],
              decision_maker: enrichment?.decision_maker,
              enriched_at: new Date().toISOString(),
            })
            .eq('id', prospect.id);

          processed++;
          console.log(`Re-enriched prospect: ${prospect.name}`);
        } else {
          errors++;
          console.error(`Failed to enrich ${prospect.name}:`, await enrichResponse.text());
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        errors++;
        console.error(`Error processing prospect ${prospect.name}:`, err);
      }
    }

    console.log(`Re-enrichment complete. Processed: ${processed}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ 
        message: 'Re-enrichment complete',
        processed,
        errors,
        total: staleProspects.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in re-enrich-favorites:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
