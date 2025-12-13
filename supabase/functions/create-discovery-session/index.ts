import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function createHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Simple in-memory rate limiting by IP (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_SESSIONS_ANON = 3; // 3 sessions per minute for anonymous
const MAX_SESSIONS_AUTH = 10; // 10 sessions per minute for authenticated

function checkRateLimit(key: string, maxRequests: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get user from auth header (optional for anonymous sessions)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }
    
    // Apply rate limiting (stricter for anonymous users)
    const rateLimitKey = userId ? `auth:${userId}` : `anon:${clientIp}`;
    const maxSessions = userId ? MAX_SESSIONS_AUTH : MAX_SESSIONS_ANON;
    const { allowed, remaining } = checkRateLimit(rateLimitKey, maxSessions);
    
    if (!allowed) {
      console.log(`Rate limit exceeded for session creation: ${rateLimitKey}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60'
          } 
        }
      );
    }

    const {
      productDescription,
      territory,
      targetCategories,
      competitors,
      companyDomain,
    } = await req.json();

    console.log('Creating discovery session for user:', userId || 'anonymous', `(${rateLimitKey}, remaining: ${remaining})`);

    // Build criteria object
    const criteria = {
      productDescription,
      territory,
      targetCategories,
      competitors,
      companyDomain,
    };

    // Create hash for deduplication
    const criteriaHash = createHash(JSON.stringify({
      productDescription,
      states: territory?.states?.sort(),
      categories: targetCategories?.sort(),
      competitors: competitors?.sort(),
    }));

    // Check if session with same criteria exists (within last 24 hours)
    // For authenticated users, check their sessions; for anon, check by hash only
    let existingSession = null;
    
    if (userId) {
      const { data } = await supabase
        .from('discovery_sessions')
        .select('id, status, created_at')
        .eq('user_id', userId)
        .eq('criteria_hash', criteriaHash)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingSession = data;
    }

    if (existingSession) {
      console.log('Returning existing session:', existingSession.id);
      return new Response(
        JSON.stringify({
          sessionId: existingSession.id,
          status: existingSession.status,
          isExisting: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new session (user_id can be null for anonymous)
    const { data: session, error: insertError } = await supabase
      .from('discovery_sessions')
      .insert({
        user_id: userId,
        criteria,
        criteria_hash: criteriaHash,
        status: 'created',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create session:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created new session:', session.id, 'anonymous:', !userId);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        status: 'created',
        isExisting: false,
        isAnonymous: !userId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-discovery-session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});