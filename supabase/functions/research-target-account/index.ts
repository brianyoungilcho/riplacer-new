import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
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

    if (request.user_id && userId && request.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("research_requests")
      .update({ status: "researching", research_started_at: new Date().toISOString() })
      .eq("id", requestId);

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    const prompt = `You are a B2B sales intelligence analyst. Research the following target account and return a concise but comprehensive report.

TARGET ACCOUNT: ${request.target_account}

CONTEXT:
- Our client sells: ${request.product_description}
- Target territory: ${(request.territory_states || []).join(", ") || "Not specified"}
- Target buyers: ${(request.target_categories || []).join(", ") || "Not specified"}
- Key competitors: ${(request.competitors || []).join(", ") || "Not specified"}
- Additional context: ${request.additional_context || "None"}

RESEARCH TASKS:
1. Organization overview (mission, size, budget signals, recent news)
2. Current vendor/technology landscape (if visible)
3. Key decision-makers and stakeholders
4. Procurement activity (contracts, RFPs, budget allocations)
5. Timing signals (leadership changes, funding cycles, modernization initiatives)
6. Competitive intelligence (where competitors are involved)
7. Recommended approach and talking points

Return ONLY valid JSON. Use this structure:
{
  "title": "string",
  "summary": "string",
  "sections": [
    {
      "heading": "string",
      "content": "string",
      "bullets": ["string"]
    }
  ],
  "recommendedActions": ["string"]
}`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content:
              "You are a B2B sales intelligence analyst. Respond ONLY with valid JSON that matches the requested structure. No markdown, no extra text.",
          },
          { role: "user", content: prompt },
        ],
        search_domain_filter: ["-reddit.com", "-twitter.com", "-pinterest.com", "-quora.com"],
        search_recency_filter: "year",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await supabase
        .from("research_requests")
        .update({ status: "failed" })
        .eq("id", requestId);

      return new Response(
        JSON.stringify({ error: "Perplexity error", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const citations = data.citations || [];

    const report = extractJson(content) || {
      title: `Research Report: ${request.target_account}`,
      summary: "Research completed with limited structured output.",
      sections: [
        {
          heading: "Raw Findings",
          content: content.slice(0, 2000),
          bullets: [],
        },
      ],
      recommendedActions: [],
    };

    const sources = citations.map((citation: string | { url?: string; title?: string; snippet?: string }) => {
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
    });

    await supabase
      .from("research_reports")
      .upsert({
        request_id: requestId,
        user_id: request.user_id,
        content: report,
        summary: report.summary || null,
        sources,
        generated_at: new Date().toISOString(),
      }, { onConflict: "request_id" });

    await supabase
      .from("research_requests")
      .update({ status: "completed", research_completed_at: new Date().toISOString() })
      .eq("id", requestId);

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
