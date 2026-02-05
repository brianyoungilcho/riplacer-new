import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isAppSubdomain, redirectToMain } from "@/lib/domain";

type ReportContentSection = {
  heading?: string;
  content?: string;
  bullets?: string[];
};

type ResearchReport = {
  id: string;
  summary?: string | null;
  content: {
    title?: string;
    summary?: string;
    sections?: ReportContentSection[];
    recommendedActions?: string[];
  };
  sources?: Array<{ url: string; title?: string; excerpt?: string }>;
  generated_at?: string;
};

type ResearchRequest = {
  id: string;
  target_account: string;
  status: string;
  created_at: string;
};

export default function ReportDashboard() {
  const { user, loading, signOut } = useAuth();
  const onAppSubdomain = isAppSubdomain();
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [request, setRequest] = useState<ResearchRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadReport = async () => {
      setIsLoading(true);

      const { data: latestRequest } = await supabase
        .from("research_requests")
        .select("id, target_account, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setRequest(latestRequest || null);

      if (latestRequest?.id) {
        const { data: latestReport } = await supabase
          .from("research_reports")
          .select("id, summary, content, sources, generated_at")
          .eq("request_id", latestRequest.id)
          .maybeSingle();

        setReport(latestReport || null);
      } else {
        setReport(null);
      }

      setIsLoading(false);
    };

    loadReport();
  }, [user]);

  const handleSignOut = async () => {
    // CRITICAL: Set flag BEFORE signOut() to prevent SubdomainRedirect from
    // redirecting to /auth before we can redirect to /
    if (onAppSubdomain) {
      sessionStorage.setItem('riplacer_signing_out', 'true');
    }
    await signOut();
    if (onAppSubdomain) {
      // Redirect to main domain with signed_out flag so it clears session there too
      redirectToMain("/?signed_out=1");
    } else {
      window.location.href = "/";
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const title = report?.content?.title || request?.target_account || "Research Report";
  const summary = report?.content?.summary || report?.summary;
  const sections = report?.content?.sections || [];
  const actions = report?.content?.recommendedActions || [];
  const sources = report?.sources || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Riplacer Report</p>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-primary transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {!report && request?.status === "researching" && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Research in progress</h2>
            <p className="text-gray-600">We are compiling the report for {request.target_account}. Check back soon.</p>
          </div>
        )}

        {!report && !request && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No report yet</h2>
            <p className="text-gray-600">Complete onboarding to trigger your first research report.</p>
          </div>
        )}

        {summary && (
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </section>
        )}

        {sections.length > 0 && (
          <section className="space-y-6">
            {sections.map((section, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6">
                {section.heading && (
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">{section.heading}</h2>
                )}
                {section.content && (
                  <p className="text-gray-700 leading-relaxed">{section.content}</p>
                )}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="mt-4 space-y-2 text-gray-700 list-disc list-inside">
                    {section.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {actions.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recommended Actions</h2>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              {actions.map((action, actionIndex) => (
                <li key={actionIndex}>{action}</li>
              ))}
            </ul>
          </section>
        )}

        {sources.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Sources</h2>
            <div className="space-y-3">
              {sources.map((source, sourceIndex) => (
                <div key={sourceIndex}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    {source.title || source.url}
                  </a>
                  {source.excerpt && <p className="text-xs text-gray-500 mt-1">{source.excerpt}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
