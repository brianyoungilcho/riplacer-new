import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, LogOut, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [request, setRequest] = useState<ResearchRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const hasLoadedOnce = useRef(false);

  const loadReport = useCallback(async () => {
    if (!user) return;
    if (!hasLoadedOnce.current) setIsLoading(true);

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

    hasLoadedOnce.current = true;
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadReport();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to research_requests updates for status changes
    const requestChannel = supabase
      .channel('research_requests_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'research_requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Research request updated:', payload);
          setRequest(payload.new as ResearchRequest);
        }
      )
      .subscribe();

    // Subscribe to research_reports inserts for new reports
    const reportChannel = supabase
      .channel('research_reports_inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'research_reports',
        },
        (payload) => {
          console.log('Research report inserted:', payload);
          // Only update if this report matches our current request
          if (request && payload.new.request_id === request.id) {
            setReport(payload.new as ResearchReport);
          }
        }
      )
      .subscribe();

    return () => {
      requestChannel.unsubscribe();
      reportChannel.unsubscribe();
    };
  }, [user, request?.id]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const handleRetryResearch = async () => {
    if (!request?.id || isRetrying) return;
    setIsRetrying(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const token = sessionData.session?.access_token;

      const { data: invokeData, error: invokeError } = await supabase.functions.invoke("research-target-account", {
        body: { requestId: request.id },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (invokeError) {
        console.error("Failed to retry research:", invokeError);
        
        if (invokeError && typeof invokeError === 'object' && 'context' in invokeError) {
             const response = (invokeError as any).context as Response;
             if (response?.status === 401) {
                 toast.error("Your session has expired. Please sign out and sign in again.");
                 return;
             }
        }

        toast.error("We could not restart the research. Please try again.");
        return;
      }
      toast.success("Research has been re-queued.");
      await loadReport();
    } catch (error) {
      console.error("Failed to retry research:", error);
      toast.error("We could not restart the research. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCreateAndStartResearch = async () => {
    if (!user || isRetrying) return;
    setIsRetrying(true);
    try {
      // Try to get onboarding data from localStorage
      const submissionRaw = localStorage.getItem("riplacer_onboarding_submission");
      if (!submissionRaw) {
        toast.error("No onboarding data found. Please complete onboarding first.");
        setIsRetrying(false);
        return;
      }

      const submission = JSON.parse(submissionRaw);

      // Clear any stale request ID
      localStorage.removeItem("riplacer_research_request_id");

      // Create the research request
      const { data: newRequest, error: insertError } = await supabase
        .from("research_requests")
        .insert({
          user_id: user.id,
          product_description: submission.productDescription,
          company_name: submission.companyName || null,
          company_domain: submission.companyDomain || null,
          territory_states: submission.states || [],
          target_categories: submission.targetCategories || [],
          competitors: submission.competitors || [],
          target_account: submission.targetAccount,
          additional_context: submission.additionalContext || null,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Failed to create research request:", insertError);
        toast.error("We could not create your research request. Please try again.");
        setIsRetrying(false);
        return;
      }

      localStorage.setItem("riplacer_research_request_id", newRequest.id);

      // Invoke the edge function
      const { error: invokeError } = await supabase.functions.invoke("research-target-account", {
        body: { requestId: newRequest.id },
      });

      if (invokeError) {
        console.error("Failed to invoke research function:", invokeError);
        toast.error("Research request created but could not start. Click re-queue to try again.");
      } else {
        toast.success("Research started!");
      }

      await loadReport();
    } catch (error) {
      console.error("Failed to create and start research:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsRetrying(false);
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
    return <Navigate to="/login" replace />;
  }

  const title = report?.content?.title || request?.target_account || "Research Report";
  const summary = report?.content?.summary || report?.summary;
  const sections = report?.content?.sections || [];
  const actions = report?.content?.recommendedActions || [];
  const sources = report?.sources || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Riplacer Report</p>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Desktop view - show email and sign out button */}
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-sm text-gray-500">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-primary transition-colors"
              >
                Sign out
              </button>
            </div>

            {/* Mobile view - show dropdown menu */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                    <span className="sr-only">User menu</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Account</span>
                      <span className="text-xs text-gray-500 truncate max-w-[180px]">
                        {user?.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {!report && request && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            {request.status === "pending" && (
              <>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Research queued</h2>
                <p className="text-gray-600">
                  We have queued your report for {request.target_account}. It will start shortly.
                </p>
              </>
            )}
            {request.status === "researching" && (
              <>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Research in progress</h2>
                <p className="text-gray-600">
                  We are compiling the report for {request.target_account}. Check back soon.
                </p>
              </>
            )}
            {request.status === "failed" && (
              <>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Research failed</h2>
                <p className="text-gray-600">
                  We ran into a problem generating the report. Please refresh in a few minutes or contact support.
                </p>
              </>
            )}
            {request.status === "completed" && (
              <>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Report processing</h2>
                <p className="text-gray-600">
                  Your research is completed, but the report is not available yet. Please refresh shortly.
                </p>
              </>
            )}
            <div className="mt-4">
              <button
                onClick={handleRetryResearch}
                disabled={isRetrying || request.status === "researching"}
                className="text-sm text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRetrying ? "Re-queuing research..." : "Re-queue research"}
              </button>
            </div>
          </div>
        )}

        {!report && !request && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No report yet</h2>
            <p className="text-gray-600 mb-4">Complete onboarding to trigger your first research report.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleCreateAndStartResearch}
                disabled={isRetrying}
                className="text-sm text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                {isRetrying ? "Starting research..." : "Start research from saved onboarding"}
              </button>
              <a
                href="/start"
                className="text-sm text-gray-500 hover:text-primary transition-colors"
              >
                Go to onboarding →
              </a>
            </div>
          </div>
        )}

        {summary && (
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Summary</h2>
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </section>
        )}

        {sections.length > 0 && (
          <section className="space-y-6">
            {sections.map((section, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6">
                {section.heading && (
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">{section.heading}</h2>
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
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Recommended Actions</h2>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              {actions.map((action, actionIndex) => (
                <li key={actionIndex}>{action}</li>
              ))}
            </ul>
          </section>
        )}

        {sources.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Sources</h2>
            <div className="space-y-3">
              {sources.map((source, sourceIndex) => (
                <div key={sourceIndex}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline text-sm font-medium break-words"
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
