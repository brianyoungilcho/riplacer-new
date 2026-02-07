import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResearchRequest {
  id: string;
  user_id: string | null;
  product_description: string;
  company_name: string | null;
  company_domain: string | null;
  territory_states: string[];
  target_categories: string[];
  competitors: string[];
  target_account: string;
  additional_context: string | null;
}

function extractJson(content: string): any | null {
  try {
    return JSON.parse(content);
  } catch {
    // Try to extract JSON object from surrounding text or code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // fall through
      }
    }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Research Agent Functions

async function researchOrgProfile(request: ResearchRequest, supabase: any) {
  const systemPrompt = "You are a B2B sales intelligence analyst specializing in organization research. Return ONLY valid JSON.";
  const userPrompt = `Research the organization overview for: ${request.target_account}

  Focus on:
  - Mission and primary functions
  - Size (number of employees, population served, geographic coverage)
  - Annual budget or budget signals
  - Organizational structure and leadership
  - Jurisdiction and authority scope

  Buyer category context: ${(request.target_categories || []).join(", ")}

  Return JSON format:
  {
    "mission": "string",
    "size": { "employees": number|null, "population": number|null, "coverage": "string" },
    "annualBudget": number|null,
    "leadership": [{ "title": "string", "name": "string", "tenure": "string" }],
    "jurisdiction": "string",
    "keyFacts": ["string"]
  }`;

  try {
    const { content, citations } = await callPerplexity(systemPrompt, userPrompt);
    const result = extractJson(content) || {
      mission: "Unable to determine organization mission",
      size: { employees: null, population: null, coverage: "Unknown" },
      annualBudget: null,
      leadership: [],
      jurisdiction: "Unknown",
      keyFacts: ["Limited public information available"]
    };

    // Save to agent_memory
    await supabase
      .from("agent_memory")
      .insert({
        request_id: request.id,
        user_id: request.user_id,
        memory_type: "org_profile",
        content: { ...result, sources: citations }
      });

    return result;
  } catch (error) {
    console.error("org_profile research failed:", error);
    return {
      mission: "Research failed",
      size: { employees: null, population: null, coverage: "Unknown" },
      annualBudget: null,
      leadership: [],
      jurisdiction: "Unknown",
      keyFacts: ["Research encountered an error"]
    };
  }
}

async function researchPeopleIntel(request: ResearchRequest, supabase: any) {
  const systemPrompt = "You are a B2B sales intelligence analyst specializing in key decision-makers and stakeholders. Return ONLY valid JSON.";
  const userPrompt = `Research key decision-makers and stakeholders at: ${request.target_account}

  Focus on individuals who would be involved in purchasing decisions for: ${request.product_description}

  Buyer category context: ${(request.target_categories || []).join(", ")}

  Find:
  - Names, titles, and current roles
  - Tenure/background in the organization
  - Public statements about technology, modernization, or procurement priorities
  - Contact information or social media presence if available

  Return JSON format:
  {
    "people": [
      {
        "name": "string",
        "title": "string",
        "tenure": "string",
        "background": "string",
        "relevance": "string",
        "publicStatements": ["string"],
        "contact": "string"|null
      }
    ]
  }`;

  try {
    const { content, citations } = await callPerplexity(systemPrompt, userPrompt);
    const result = extractJson(content) || { people: [] };

    // Save to agent_memory
    await supabase
      .from("agent_memory")
      .insert({
        request_id: request.id,
        user_id: request.user_id,
        memory_type: "people_intel",
        content: { ...result, sources: citations }
      });

    return result;
  } catch (error) {
    console.error("people_intel research failed:", error);
    return { people: [] };
  }
}

async function researchProcurement(request: ResearchRequest, supabase: any) {
  const systemPrompt = "You are a B2B sales intelligence analyst specializing in procurement and contracting. Return ONLY valid JSON.";
  const userPrompt = `Research procurement activity for: ${request.target_account}

  Product category: ${request.product_description}
  Buyer type: ${(request.target_categories || []).join(", ")}

  Search for:
  - Active and recent contracts related to this product category
  - RFP/RFQ postings and solicitations
  - Budget line items and allocations
  - Contract renewal dates and timelines
  - Procurement rules and processes specific to this organization type

  Be specific - look for exact contract awards, dollar amounts, vendor names, and dates.

  Return JSON format:
  {
    "contracts": [
      {
        "vendor": "string",
        "product": "string",
        "value": number|null,
        "startDate": "string",
        "endDate": "string",
        "source": "string"
      }
    ],
    "rfps": [
      {
        "title": "string",
        "postedDate": "string",
        "deadline": "string",
        "description": "string",
        "source": "string"
      }
    ],
    "budgetItems": [
      {
        "category": "string",
        "amount": number|null,
        "fiscalYear": "string",
        "source": "string"
      }
    ],
    "procurementNotes": ["string"]
  }`;

  try {
    const { content, citations } = await callPerplexity(systemPrompt, userPrompt);
    const result = extractJson(content) || { contracts: [], rfps: [], budgetItems: [], procurementNotes: [] };

    // Save to agent_memory
    await supabase
      .from("agent_memory")
      .insert({
        request_id: request.id,
        user_id: request.user_id,
        memory_type: "procurement",
        content: { ...result, sources: citations }
      });

    return result;
  } catch (error) {
    console.error("procurement research failed:", error);
    return { contracts: [], rfps: [], budgetItems: [], procurementNotes: [] };
  }
}

async function researchCompetitiveIntel(request: ResearchRequest, supabase: any) {
  const systemPrompt = "You are a B2B sales intelligence analyst specializing in competitive intelligence. Return ONLY valid JSON.";
  const userPrompt = `Research competitive landscape for: ${request.target_account}

  Product category: ${request.product_description}
  Known competitors: ${(request.competitors || []).join(", ")}

  For each competitor, find:
  - Specific products/solutions they provide to this account
  - Contract details, duration, or value if known
  - Known pain points or issues with their solutions
  - Switching barriers or lock-in factors
  - Any public statements from the account about their experience

  Search for: "${request.target_account}" + [each competitor name]

  Return JSON format:
  {
    "incumbents": [
      {
        "competitor": "string",
        "products": ["string"],
        "contractValue": number|null,
        "contractDates": "string",
        "knownIssues": ["string"],
        "switchingBarriers": ["string"],
        "evidence": ["string"]
      }
    ]
  }`;

  try {
    const { content, citations } = await callPerplexity(systemPrompt, userPrompt);
    const result = extractJson(content) || { incumbents: [] };

    // Save to agent_memory
    await supabase
      .from("agent_memory")
      .insert({
        request_id: request.id,
        user_id: request.user_id,
        memory_type: "competitive_intel",
        content: { ...result, sources: citations }
      });

    return result;
  } catch (error) {
    console.error("competitive_intel research failed:", error);
    return { incumbents: [] };
  }
}

async function researchNewsAndTiming(request: ResearchRequest, supabase: any) {
  const systemPrompt = "You are a B2B sales intelligence analyst specializing in timing signals and news analysis. Return ONLY valid JSON.";
  const userPrompt = `Research timing signals and recent developments for: ${request.target_account}

  Product category: ${request.product_description}
  Buyer type: ${(request.target_categories || []).join(", ")}

  Look for:
  - Recent news, announcements, or press releases
  - Leadership changes or new appointments
  - Funding allocations or budget decisions
  - Technology modernization initiatives
  - Grants, partnerships, or external funding
  - Upcoming elections, transitions, or term limits
  - Pain points or challenges publicly mentioned

  Focus on timing - when are decisions likely to be made? When is the budget cycle?

  Return JSON format:
  {
    "signals": [
      {
        "type": "news|leadership|funding|modernization|procurement|other",
        "title": "string",
        "description": "string",
        "date": "string",
        "relevance": "string",
        "source": "string"
      }
    ],
    "timingNotes": ["string"]
  }`;

  try {
    const { content, citations } = await callPerplexity(systemPrompt, userPrompt);
    const result = extractJson(content) || { signals: [], timingNotes: [] };

    // Save to agent_memory
    await supabase
      .from("agent_memory")
      .insert({
        request_id: request.id,
        user_id: request.user_id,
        memory_type: "news_timing",
        content: { ...result, sources: citations }
      });

    return result;
  } catch (error) {
    console.error("news_timing research failed:", error);
    return { signals: [], timingNotes: [] };
  }
}

async function synthesizePlaybook(agentResults: any, request: ResearchRequest) {
  const systemPrompt = "You are a B2B sales strategist. Analyze the research data and create a comprehensive Rip & Replace Playbook. Return ONLY valid JSON.";
  const userPrompt = `Create a Rip & Replace Playbook for ${request.target_account}

  Product: ${request.product_description}
  Competitors: ${(request.competitors || []).join(", ")}

  Research Data:
  Organization Profile: ${JSON.stringify(agentResults.org_profile)}
  People Intelligence: ${JSON.stringify(agentResults.people_intel)}
  Procurement Activity: ${JSON.stringify(agentResults.procurement)}
  Competitive Intelligence: ${JSON.stringify(agentResults.competitive_intel)}
  News & Timing Signals: ${JSON.stringify(agentResults.news_timing)}

  Create a playbook that includes:
  1. The single most surprising/compelling insight (topInsight)
  2. Account snapshot with key facts
  3. Structured sections with findings
  4. Specific outreach sequence and talking points
  5. Key dates and timing recommendations
  6. Specific recommended actions

  Return JSON format:
  {
    "title": "Rip & Replace Playbook: ${request.target_account}",
    "topInsight": "One compelling finding that would make someone share this report",
    "accountSnapshot": {
      "type": "string",
      "size": "string",
      "budget": "string",
      "location": "string",
      "jurisdiction": "string"
    },
    "sections": [
      {
        "id": "org_profile|people_intel|procurement|competitive_intel|news_timing",
        "heading": "string",
        "content": "string",
        "bullets": ["string"],
        "sources": ["string"]
      }
    ],
    "playbook": {
      "outreachSequence": [
        "Step 1: Contact X because...",
        "Step 2: ..."
      ],
      "talkingPoints": [
        "When speaking to X, emphasize...",
        "Ask about Y because..."
      ],
      "whatToAvoid": [
        "Do not mention Z because..."
      ],
      "keyDates": [
        {
          "date": "YYYY-MM-DD",
          "event": "string",
          "relevance": "string"
        }
      ]
    },
    "recommendedActions": [
      "Actionable next steps with specific names, dates, or approaches"
    ]
  }`;

  try {
    const { content, citations } = await callPerplexity(systemPrompt, userPrompt);
    const result = extractJson(content);

    if (!result) {
      throw new Error("Failed to synthesize playbook");
    }

    return result;
  } catch (error) {
    console.error("Synthesis failed:", error);
    // Fallback synthesis
    return {
      title: `Rip & Replace Playbook: ${request.target_account}`,
      topInsight: "Research completed with detailed findings across multiple intelligence areas.",
      accountSnapshot: {
        type: (request.target_categories || []).join(", "),
        size: "See organization profile section",
        budget: "See procurement section",
        location: (request.territory_states || []).join(", "),
        jurisdiction: "See organization profile section"
      },
      sections: [
        {
          id: "org_profile",
          heading: "Organization Profile",
          content: agentResults.org_profile?.mission || "Organization research completed",
          bullets: agentResults.org_profile?.keyFacts || [],
          sources: []
        },
        {
          id: "people_intel",
          heading: "Key Decision Makers",
          content: `${agentResults.people_intel?.people?.length || 0} key stakeholders identified`,
          bullets: agentResults.people_intel?.people?.map((p: any) => `${p.name} - ${p.title}`) || [],
          sources: []
        },
        {
          id: "procurement",
          heading: "Procurement Activity",
          content: `${agentResults.procurement?.contracts?.length || 0} contracts and ${agentResults.procurement?.rfps?.length || 0} RFPs identified`,
          bullets: agentResults.procurement?.contracts?.map((c: any) => `${c.vendor}: $${c.value || 'unknown'}`) || [],
          sources: []
        },
        {
          id: "competitive_intel",
          heading: "Competitive Landscape",
          content: `${agentResults.competitive_intel?.incumbents?.length || 0} competitors identified`,
          bullets: agentResults.competitive_intel?.incumbents?.map((c: any) => `${c.competitor}: ${c.products?.join(', ')}`) || [],
          sources: []
        },
        {
          id: "news_timing",
          heading: "Timing Signals",
          content: `${agentResults.news_timing?.signals?.length || 0} timing signals identified`,
          bullets: agentResults.news_timing?.signals?.map((s: any) => `${s.date}: ${s.title}`) || [],
          sources: []
        }
      ],
      playbook: {
        outreachSequence: [
          "Research completed - review findings above for outreach strategy",
          "Contact decision makers identified in people intelligence section"
        ],
        talkingPoints: [
          "Reference specific findings from the research sections",
          "Use timing signals to create urgency"
        ],
        whatToAvoid: ["Generic sales pitches without account-specific context"],
        keyDates: agentResults.news_timing?.signals?.map((s: any) => ({
          date: s.date,
          event: s.title,
          relevance: s.relevance
        })) || []
      },
      recommendedActions: [
        "Review the detailed findings in each section above",
        "Use the outreach sequence and talking points provided",
        "Monitor key dates for optimal timing"
      ]
    };
  }
}

async function callPerplexity(
  systemPrompt: string,
  userPrompt: string,
  searchFilters?: {
    domain_filter?: string[];
    recency_filter?: string;
  }
): Promise<{ content: string; citations: any[]; tokens_used?: number }> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      search_domain_filter: searchFilters?.domain_filter || ["-reddit.com", "-twitter.com", "-pinterest.com", "-quora.com"],
      search_recency_filter: searchFilters?.recency_filter || "year",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const citations = data.citations || [];
  const tokens_used = data.usage?.total_tokens;

  return { content, citations, tokens_used };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
          return new Response(
            JSON.stringify({ error: "Invalid or expired token" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        userId = user.id;
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(
        JSON.stringify({ error: "Missing requestId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: request, error: requestError } = await supabase
      .from("research_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: "Research request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If request has a user_id, authentication is required
    if (request.user_id && !userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (request.user_id && userId && request.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to researching
    await supabase
      .from("research_requests")
      .update({ status: "researching", research_started_at: new Date().toISOString() })
      .eq("id", requestId);

    // Run all 5 research agents in parallel
    const agentPromises = [
      researchOrgProfile(request, supabase),
      researchPeopleIntel(request, supabase),
      researchProcurement(request, supabase),
      researchCompetitiveIntel(request, supabase),
      researchNewsAndTiming(request, supabase)
    ];

    const [orgProfile, peopleIntel, procurement, competitiveIntel, newsTiming] = await Promise.all(agentPromises);

    const agentResults = {
      org_profile: orgProfile,
      people_intel: peopleIntel,
      procurement: procurement,
      competitive_intel: competitiveIntel,
      news_timing: newsTiming
    };

    // Synthesize the playbook
    const playbook = await synthesizePlaybook(agentResults, request);

    // Collect all sources from agent memory
    const { data: agentMemories } = await supabase
      .from("agent_memory")
      .select("content")
      .eq("request_id", requestId);

    const allSources = agentMemories?.flatMap(memory =>
      memory.content.sources?.map((citation: any) => {
        if (typeof citation === "string") {
          let title = "Source";
          try {
            title = new URL(citation).hostname.replace("www.", "");
          } catch {
            // ignore invalid URLs
          }
          return { url: citation, title, excerpt: "Source" };
        }
        return {
          url: citation.url || "",
          title: citation.title || "Source",
          excerpt: citation.snippet || "Source",
        };
      }) || []
    ) || [];

    // Save the final report
    await supabase
      .from("research_reports")
      .upsert({
        request_id: requestId,
        user_id: request.user_id,
        content: playbook,
        summary: playbook.topInsight || playbook.summary || null,
        sources: allSources,
        generated_at: new Date().toISOString(),
      }, { onConflict: "request_id" });

    // Update status to completed
    await supabase
      .from("research_requests")
      .update({ status: "completed", research_completed_at: new Date().toISOString() })
      .eq("id", requestId);

    return new Response(
      JSON.stringify({ success: true, report: playbook }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
