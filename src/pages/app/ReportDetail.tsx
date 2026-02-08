import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";

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
    topInsight?: string;
    accountSnapshot?: {
      type: string;
      size: string;
      budget: string;
      location: string;
      jurisdiction: string;
    };
    sections?: ReportContentSection[];
    playbook?: {
      outreachSequence: string[];
      talkingPoints: string[];
      whatToAvoid: string[];
      keyDates: Array<{ date: string; event: string; relevance: string }>;
    };
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

type RequestWithReport = ResearchRequest & {
  research_reports: ResearchReport[] | null;
};

type AgentProgress = {
  org_profile: boolean;
  people_intel: boolean;
  procurement: boolean;
  competitive_intel: boolean;
  news_timing: boolean;
};

export default function ReportDetail() {
  const { requestId } = useParams<{ requestId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<RequestWithReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [agentProgress, setAgentProgress] = useState<AgentProgress>({
    org_profile: false,
    people_intel: false,
    procurement: false,
    competitive_intel: false,
    news_timing: false,
  });

  const loadData = useCallback(async () => {
    if (!user || !requestId) {
      return;
    }

    const { data: requestData, error } = await supabase
      .from("research_requests")
      .select(`
        *,
        research_reports(*)
      `)
      .eq("id", requestId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      setIsLoading(false);
      if (error.code === 'PGRST116') {
        toast.error("Report not found");
        navigate("/app");
      } else {
        toast.error("Failed to load report");
      }
      return;
    }

    setData(requestData);
    setIsLoading(false);
  }, [user, requestId, navigate]);

  useEffect(() => {
    loadData();
  }, []); // Only run once on mount

  useEffect(() => {
    if (!user || !requestId) return;

    // Subscribe to research_reports inserts for new reports
    const reportChannel = supabase
      .channel(`report_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'research_reports',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          setData(prev => prev ? {
            ...prev,
            research_reports: payload.new as ResearchReport,
            status: 'completed'
          } : null);
        }
      )
      .subscribe();

    // Subscribe to agent_memory inserts for progress updates
    const agentChannel = supabase
      .channel(`agent_progress_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_memory',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const memoryType = payload.new.memory_type as keyof AgentProgress;
          if (memoryType in agentProgress) {
            setAgentProgress(prev => ({
              ...prev,
              [memoryType]: true
            }));
          }
        }
      )
      .subscribe();

    return () => {
      reportChannel.unsubscribe();
      agentChannel.unsubscribe();
    };
  }, [user, requestId]);

  const handleRetryResearch = async () => {
    if (!data?.id || isRetrying) return;
    setIsRetrying(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const token = sessionData.session?.access_token;

      const { error: invokeError } = await supabase.functions.invoke("research-target-account", {
        body: { requestId: data.id },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (invokeError) {
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
      // Update local state to show pending status
      setData(prev => prev ? { ...prev, status: 'pending' } : null);
    } catch (error) {
      toast.error("We could not restart the research. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case "researching":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Researching</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Report not found</h2>
        <p className="text-gray-600 mb-6">The report you're looking for doesn't exist or you don't have access to it.</p>
        <Link
          to="/app"
          className="text-primary hover:text-primary/80 font-medium"
        >
          ← Back to reports
        </Link>
      </div>
    );
  }

  // Handle both array (multiple reports) and object (single report) cases
  const report = Array.isArray(data.research_reports)
    ? data.research_reports[0]
    : (data.research_reports && typeof data.research_reports === 'object')
      ? data.research_reports
      : undefined;
  const title = report?.content?.title || data.target_account;
  const sources = report?.sources || [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to reports
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-tight">
          Research Report: {title}
        </h1>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
          <span>{formatDate(data.created_at)}</span>
          <span className="hidden sm:inline">·</span>
          {getStatusBadge(data.status)}
          {sources.length > 0 && (
            <>
              <span className="hidden sm:inline">·</span>
              <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>

        {data.status === "failed" && (
          <div className="mt-4">
            <Button
              onClick={handleRetryResearch}
              disabled={isRetrying}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? "Re-queuing..." : "Re-queue research"}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {data.status === "pending" && (
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Research queued</h2>
          <p className="text-gray-600">
            We have queued your report for {data.target_account}. It will start shortly.
          </p>
        </div>
      )}

      {data.status === "researching" && (
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Research in progress</h2>
          <p className="text-gray-600 mb-6">
            We are compiling the report for {data.target_account}. This may take a few minutes.
          </p>

          {/* Agent Progress */}
          <div className="max-w-md mx-auto">
            <div className="space-y-3">
              {[
                { key: 'org_profile', label: 'Organization Profile' },
                { key: 'people_intel', label: 'Key Decision Makers' },
                { key: 'procurement', label: 'Procurement Activity' },
                { key: 'competitive_intel', label: 'Competitive Landscape' },
                { key: 'news_timing', label: 'Timing Signals' },
              ].map((agent) => (
                <div key={agent.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{agent.label}</span>
                  <div className="flex items-center gap-2">
                    {agentProgress[agent.key as keyof AgentProgress] ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium">Done</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full" />
                        <span className="text-xs">Researching</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-xs text-gray-500">
                Final synthesis in progress...
              </p>
            </div>
          </div>
        </div>
      )}

      {data.status === "completed" && report && (
        <div className="prose prose-gray prose-lg max-w-none">
          {/* Top Insight (new format) */}
          {report.content?.topInsight && (
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-primary p-6 mb-8 rounded-r-lg">
              <h2 className="text-lg font-semibold text-primary mb-2">Key Finding</h2>
              <p className="text-gray-800 font-medium text-lg leading-relaxed">
                {report.content.topInsight}
              </p>
            </div>
          )}

          {/* Summary (old format compatibility) */}
          {(report.content?.summary || report.summary) && !report.content?.topInsight && (
            <div className="mb-8">
              <p className="text-lg leading-relaxed text-gray-700 first-letter:text-xl first-letter:font-semibold first-letter:float-left first-letter:mr-1 first-letter:mt-0.5">
                {report.content?.summary || report.summary}
              </p>
            </div>
          )}

          {/* Account Snapshot (new format) */}
          {report.content?.accountSnapshot && (
            <div className="bg-gray-50 border border-gray-200 p-6 mb-8 rounded-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Account Snapshot</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Type</span>
                  <p className="text-gray-900 font-medium">{report.content.accountSnapshot.type}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Size</span>
                  <p className="text-gray-900 font-medium">{report.content.accountSnapshot.size}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Budget</span>
                  <p className="text-gray-900 font-medium">{report.content.accountSnapshot.budget}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Location</span>
                  <p className="text-gray-900 font-medium">{report.content.accountSnapshot.location}</p>
                </div>
              </div>
            </div>
          )}

          {/* Summary (only show if not already shown as topInsight) */}
          {(report.content?.summary || report.summary) && !report.content?.topInsight && (
            <div className="mb-8">
              <p className="text-lg leading-relaxed text-gray-700 first-letter:text-xl first-letter:font-semibold first-letter:float-left first-letter:mr-1 first-letter:mt-0.5">
                {report.content?.summary || report.summary}
              </p>
            </div>
          )}

          {/* Fallback for older report formats */}
          {data.status === "completed" && report && !report.content?.topInsight && !report.content?.accountSnapshot && !Array.isArray(report.content?.sections) && (
            <div className="bg-amber-50 border border-amber-200 p-6 mb-8 rounded-lg">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Older Report Format</h3>
              <p className="text-amber-800 mb-4">
                This report uses an older format. Re-run research to get the latest version with structured insights.
              </p>
              <Button
                onClick={handleRetryResearch}
                disabled={isRetrying}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? "Re-queuing..." : "Re-run research"}
              </Button>
            </div>
          )}

          {/* Sections */}
          {report.content?.sections?.map((section, index) => (
            <div key={index} className="mb-8">
              {section.heading && (
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 mt-8 leading-tight">
                  {section.heading}
                </h2>
              )}
              {section.content && (
                <p className="text-gray-700 leading-relaxed mb-4 text-base">
                  {section.content}
                </p>
              )}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-3 ml-4">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex} className="text-base">{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Playbook */}
          {report.content?.playbook && (
            <>
              <Separator className="my-8" />
              <div className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 leading-tight">
                  Rip & Replace Playbook
                </h2>

                {/* Outreach Sequence */}
                {report.content.playbook.outreachSequence && report.content.playbook.outreachSequence.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Outreach Sequence</h3>
                    <ol className="list-decimal list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
                      {report.content.playbook.outreachSequence.map((step, stepIndex) => (
                        <li key={stepIndex} className="text-base">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Talking Points */}
                {report.content.playbook.talkingPoints && report.content.playbook.talkingPoints.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Talking Points</h3>
                    <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
                      {report.content.playbook.talkingPoints.map((point, pointIndex) => (
                        <li key={pointIndex} className="text-base">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* What to Avoid */}
                {report.content.playbook.whatToAvoid && report.content.playbook.whatToAvoid.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">What to Avoid</h3>
                    <ul className="list-disc list-inside text-red-700 leading-relaxed space-y-2 ml-4">
                      {report.content.playbook.whatToAvoid.map((avoid, avoidIndex) => (
                        <li key={avoidIndex} className="text-base">{avoid}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Dates */}
                {report.content.playbook.keyDates && report.content.playbook.keyDates.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Dates</h3>
                    <div className="space-y-3">
                      {report.content.playbook.keyDates.map((dateItem, dateIndex) => (
                        <div key={dateIndex} className="bg-white border border-gray-200 p-4 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{dateItem.event}</p>
                              <p className="text-sm text-gray-600 mt-1">{dateItem.relevance}</p>
                            </div>
                            <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                              {new Date(dateItem.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Recommended Actions (new format) or old format */}
          {(report.content?.recommendedActions || report.recommendedActions) && (report.content?.recommendedActions || report.recommendedActions).length > 0 && (
            <>
              <Separator className="my-8" />
              <div className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 leading-tight">
                  Recommended Actions
                </h2>
                <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-3 ml-4">
                  {(report.content?.recommendedActions || report.recommendedActions).map((action, actionIndex) => (
                    <li key={actionIndex} className="text-base">{action}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <>
              <Separator className="my-8" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 leading-tight">
                  Sources
                </h2>
                <ol className="space-y-4 text-sm">
                  {sources.map((source, sourceIndex) => (
                    <li key={sourceIndex} className="flex items-start gap-3">
                      <span className="text-gray-500 font-medium min-w-[1.5rem] mt-0.5">
                        {sourceIndex + 1}.
                      </span>
                      <div className="flex-1">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary/80 font-medium break-words transition-colors text-base"
                        >
                          {source.title || source.url}
                        </a>
                        {source.excerpt && (
                          <p className="text-gray-600 mt-1 leading-relaxed">{source.excerpt}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}