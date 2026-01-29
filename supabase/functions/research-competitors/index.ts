import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a hash for caching
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
const MAX_REQUESTS_ANON = 5; // 5 requests per minute for anonymous
const MAX_REQUESTS_AUTH = 30; // 30 requests per minute for authenticated

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
    
    // Check if user is authenticated
    const authHeader = req.headers.get('Authorization');
    let isAuthenticated = false;
    let userId: string | null = null;
    
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const authClient = createClient(supabaseUrl, supabaseKey);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await authClient.auth.getUser(token);
      if (user) {
        isAuthenticated = true;
        userId = user.id;
      }
    }
    
    // Apply rate limiting (stricter for anonymous users)
    const rateLimitKey = isAuthenticated ? `auth:${userId}` : `anon:${clientIp}`;
    const maxRequests = isAuthenticated ? MAX_REQUESTS_AUTH : MAX_REQUESTS_ANON;
    const { allowed, remaining } = checkRateLimit(rateLimitKey, maxRequests);
    
    if (!allowed) {
      console.log(`Rate limit exceeded for ${rateLimitKey}`);
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
    
    const { productDescription, companyDomain } = await req.json();

    if (!productDescription) {
      return new Response(
        JSON.stringify({ error: 'Product description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Request from ${isAuthenticated ? 'authenticated user' : 'anonymous'} (${rateLimitKey}), remaining: ${remaining}`);

    // Create cache key
    const cacheKey = createHash(`${productDescription}|${companyDomain || ''}`);

    // Check Supabase for cached results
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cached } = await supabase
      .from('competitor_research_cache')
      .select('competitors')
      .eq('input_hash', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      console.log('Returning cached competitor research');
      return new Response(
        JSON.stringify({
          competitors: cached.competitors,
          confidence: 0.9,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Google Gemini with search grounding
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');

    console.log('Input:', { productDescription, companyDomain });
    
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }
    
    // Clean company name from domain for exclusion
    const companyName = companyDomain?.replace(/\.(com|io|net|org|co|ai|dev)$/i, '').replace(/^www\./, '') || '';
    
    const prompt = `Find competitors for a company selling: "${productDescription}"
${companyDomain ? `Company: ${companyDomain}` : ''}

Search the web and return a JSON array of 5-10 competitor company names. These should be companies selling similar products to similar buyers.

IMPORTANT:
- Do NOT include "${companyName}" (that's the user's own company)
- Return ONLY a valid JSON array like: ["Company A", "Company B", "Company C"]
- Order by market presence (largest first)`;

    let response;
    const usedModel = 'gemini-2.5-flash';

    console.log('Calling Gemini 2.5 Flash with Google Search grounding...');
    
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          tools: [
            {
              google_search: {}
            }
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`${usedModel} response received`);
    
    // Extract content from Google Gemini direct API format
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const content = parts
      .map((p: any) => (typeof p.text === 'string' ? p.text : ''))
      .join('\n')
      .trim() || '[]';
    console.log('Gemini raw parts (truncated):', JSON.stringify(parts, null, 2).slice(0, 2000));
    
    console.log('AI text content snippet:', content.slice(0, 500));
    
    // Extract grounding metadata if available
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    let sources: string[] = [];
    
    if (groundingMetadata?.groundingChunks) {
      sources = groundingMetadata.groundingChunks
        .filter((chunk: any) => chunk.web?.uri)
        .map((chunk: any) => chunk.web.uri)
        .slice(0, 10);
      console.log(`Found ${sources.length} grounding sources from Google Search`);
    }
    
    if (groundingMetadata?.webSearchQueries) {
      console.log('Search queries used:', groundingMetadata.webSearchQueries);
    }
    
    // Parse the competitor names from the response
    let competitors: string[] = [];
    try {
      // Strategy 1: Try to find a complete JSON array
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          competitors = JSON.parse(jsonMatch[0]);
          console.log('Parsed complete JSON array:', competitors.length, 'competitors');
        } catch {
          // JSON was incomplete, fall through to other strategies
          console.log('JSON array found but incomplete, trying other strategies');
        }
      }
      
      // Strategy 2: Extract quoted strings that look like company names (handles partial JSON)
      if (competitors.length === 0) {
        // Match patterns like: "Company Name" in JSON-like context
        const quotedNames = content.match(/"([A-Z][A-Za-z0-9&.,'\-\s]{2,60})"/g);
        if (quotedNames && quotedNames.length > 0) {
          const extracted: string[] = quotedNames
            .map((q: string) => q.replace(/^"|"$/g, '').trim())
            .filter((name: string) => {
              // Filter out common non-company patterns
              const lower = name.toLowerCase();
              return name.length >= 3 && 
                !lower.includes('competitor') && 
                !lower.includes('example') &&
                !lower.includes('json') &&
                !lower.includes('here are') &&
                !/^\d+$/.test(name); // not just numbers
            });
          competitors = Array.from(new Set(extracted)).slice(0, 10);
          console.log('Extracted from quoted strings:', competitors.length, 'competitors');
        }
      }
      
      // Strategy 3: Heuristically extract from bullet lists / numbered lists
      if (competitors.length === 0) {
        const lines = content.split('\n');
        const extracted: string[] = [];
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          // Match patterns like "1. Company", "- Company", "• Company", or "- Company: description"
          const match = line.match(/^[\-*•\d\.\)\s]+([A-Z][A-Za-z0-9&.,()\s]{2,80}?)(?::|-|–|$)/);
          if (match) {
            let name = match[1].trim();
            name = name.replace(/[.,;:]+$/, '').trim();
            if (name.length >= 3 && !name.toLowerCase().includes('competitor') && !name.toLowerCase().includes('example')) {
              extracted.push(name);
            }
          }
        }
        competitors = Array.from(new Set(extracted)).slice(0, 10);
        console.log('Extracted from bullet lists:', competitors.length, 'competitors');
      }

      // Filter out the user's own company name
      if (companyName && competitors.length > 0) {
        const lowerCompanyName = companyName.toLowerCase();
        competitors = competitors.filter((c: string) => 
          !c.toLowerCase().includes(lowerCompanyName) &&
          !lowerCompanyName.includes(c.toLowerCase())
        );
      }
      
      console.log('Final competitors after filtering:', competitors);
    } catch (e) {
      console.error('Failed to parse competitors:', e, 'Content:', content.slice(0, 500));
      competitors = [];
    }

    // Cache the results with sources
    if (competitors.length > 0) {
      await supabase
        .from('competitor_research_cache')
        .upsert({
          input_hash: cacheKey,
          competitors: competitors,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'input_hash' });
    }

    console.log(`Found ${competitors.length} competitors with ${sources.length} grounding sources`);

    return new Response(
      JSON.stringify({
        competitors,
        sources,
        confidence: competitors.length > 0 ? 0.9 : 0.3,
        cached: false,
        model: usedModel,
        webSearchEnabled: usedModel === 'gemini-2.5-flash',
        searchQueries: groundingMetadata?.webSearchQueries || [],
        error: competitors.length === 0 ? 'no_competitors_found' : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in research-competitors:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
