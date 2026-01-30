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
const MAX_COMPETITORS = 15;

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

type GeminiResult = {
  competitors: string[];
  sources: string[];
  searchQueries: string[];
  rawContent: string;
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dedupeCompetitors(names: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of names) {
    const key = normalizeName(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

function parseCompetitors(content: string): string[] {
  let competitors: string[] = [];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        competitors = JSON.parse(jsonMatch[0]);
        console.log('Parsed complete JSON array:', competitors.length, 'competitors');
      } catch {
        console.log('JSON array found but incomplete, trying other strategies');
      }
    }

    if (competitors.length === 0) {
      const quotedNames = content.match(/"([A-Z][A-Za-z0-9&.,'\-\s]{2,60})"/g);
      if (quotedNames && quotedNames.length > 0) {
        const extracted: string[] = quotedNames
          .map((q: string) => q.replace(/^"|"$/g, '').trim())
          .filter((name: string) => {
            const lower = name.toLowerCase();
            return name.length >= 3 &&
              !lower.includes('competitor') &&
              !lower.includes('example') &&
              !lower.includes('json') &&
              !lower.includes('here are') &&
              !/^\d+$/.test(name);
          });
        competitors = Array.from(new Set(extracted)).slice(0, MAX_COMPETITORS);
        console.log('Extracted from quoted strings:', competitors.length, 'competitors');
      }
    }

    if (competitors.length === 0) {
      const lines = content.split('\n');
      const extracted: string[] = [];
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        const match = line.match(/^[\-*•\d\.\)\s]+([A-Z][A-Za-z0-9&.,()\s]{2,80}?)(?::|-|–|$)/);
        if (match) {
          let name = match[1].trim();
          name = name.replace(/[.,;:]+$/, '').trim();
          if (name.length >= 3 && !name.toLowerCase().includes('competitor') && !name.toLowerCase().includes('example')) {
            extracted.push(name);
          }
        }
      }
      competitors = Array.from(new Set(extracted)).slice(0, MAX_COMPETITORS);
      console.log('Extracted from bullet lists:', competitors.length, 'competitors');
    }
  } catch (e) {
    console.error('Failed to parse competitors:', e, 'Content:', content.slice(0, 500));
    competitors = [];
  }

  return competitors;
}

async function callGeminiWithSearch(prompt: string, apiKey: string, label: string): Promise<GeminiResult> {
  const usedModel = 'gemini-2.5-flash';
  console.log(`Calling Gemini 2.5 Flash with Google Search grounding (${label})...`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
    console.error(`AI API error (${label}):`, response.status, errorText);
    throw new Error(`AI API error (${label}): ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`${usedModel} response received (${label})`);

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const content = parts
    .map((p: any) => (typeof p.text === 'string' ? p.text : ''))
    .join('\n')
    .trim() || '[]';
  console.log(`Gemini raw parts (${label}, truncated):`, JSON.stringify(parts, null, 2).slice(0, 2000));
  console.log(`AI text content snippet (${label}):`, content.slice(0, 500));

  const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
  const sources = groundingMetadata?.groundingChunks
    ?.filter((chunk: any) => chunk.web?.uri)
    .map((chunk: any) => chunk.web.uri)
    .slice(0, 10) || [];

  const searchQueries = groundingMetadata?.webSearchQueries || [];

  const competitors = parseCompetitors(content);

  return {
    competitors,
    sources,
    searchQueries,
    rawContent: content,
  };
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
    
    const promptDirect = `Find direct competitors for a company selling: "${productDescription}"
${companyDomain ? `Company: ${companyDomain}` : ''}

Search the web and return a JSON array of 8-10 competitor company names that sell the SAME type of product to the SAME buyers.

IMPORTANT:
- Do NOT include "${companyName}" (that's the user's own company)
- Return ONLY a valid JSON array like: ["Company A", "Company B", "Company C"]
- Order by market presence (largest first)`;

    const promptLeaders = `Who are the market leaders in the industry that includes: "${productDescription}"
${companyDomain ? `Company: ${companyDomain}` : ''}

Search the web and return a JSON array of 8-10 dominant companies in this market, ordered by market share.

IMPORTANT:
- Do NOT include "${companyName}" (that's the user's own company)
- Return ONLY a valid JSON array like: ["Company A", "Company B", "Company C"]
- Order by market presence (largest first)`;

    const promptEmerging = `Find emerging or alternative competitors to companies selling: "${productDescription}"
${companyDomain ? `Company: ${companyDomain}` : ''}

Search the web and return a JSON array of 5-8 newer or niche competitors that fight for the same budget.

IMPORTANT:
- Do NOT include "${companyName}" (that's the user's own company)
- Return ONLY a valid JSON array like: ["Company A", "Company B", "Company C"]`;

    const usedModel = 'gemini-2.5-flash';

    const settled = await Promise.allSettled([
      callGeminiWithSearch(promptDirect, GOOGLE_GEMINI_API_KEY, 'direct'),
      callGeminiWithSearch(promptLeaders, GOOGLE_GEMINI_API_KEY, 'leaders'),
      callGeminiWithSearch(promptEmerging, GOOGLE_GEMINI_API_KEY, 'emerging'),
    ]);

    const successes = settled.filter((result) => result.status === 'fulfilled') as PromiseFulfilledResult<GeminiResult>[];
    if (successes.length === 0) {
      throw new Error('AI API error: all competitor research calls failed');
    }

    const allCompetitors = successes.flatMap((result) => result.value.competitors);
    let competitors = dedupeCompetitors(allCompetitors);

    if (companyName && competitors.length > 0) {
      const lowerCompanyName = companyName.toLowerCase();
      competitors = competitors.filter((c: string) =>
        !c.toLowerCase().includes(lowerCompanyName) &&
        !lowerCompanyName.includes(c.toLowerCase())
      );
    }

    if (competitors.length > MAX_COMPETITORS) {
      competitors = competitors.slice(0, MAX_COMPETITORS);
    }

    const sources = dedupeCompetitors(
      successes.flatMap((result) => result.value.sources)
    ).slice(0, 20);

    const searchQueries = dedupeCompetitors(
      successes.flatMap((result) => result.value.searchQueries)
    ).slice(0, 20);

    console.log('Final competitors after filtering:', competitors);

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
        searchQueries,
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
