import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronDown, Check, RefreshCw } from "lucide-react";

type ResearchRequestWithReport = {
  id: string;
  target_account: string;
  status: string;
  created_at: string;
  product_description: string;
  company_name: string | null;
  company_domain: string | null;
  territory_states: any;
  target_categories: any;
  competitors: any;
  additional_context: string | null;
  research_reports: Array<{
    summary: string | null;
  }> | null;
};

export default function ReportInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accountGroups, setAccountGroups] = useState<Map<string, ResearchRequestWithReport[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [accountIntelligence, setAccountIntelligence] = useState<Map<string, any>>(new Map());
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);

  const loadRequests = useCallback(async () => {
    // 1. Log user authentication status
    console.log("🔐 [ReportInbox] User authentication status:", {
      user: user ? {
        id: user.id,
        email: user.email,
        authenticated: true
      } : null,
      hasUser: !!user
    });

    if (!user) {
      console.warn("⚠️ [ReportInbox] No user found, aborting loadRequests");
      return;
    }

    // 2. Log exact query parameters being sent to Supabase
    const queryParams = {
      table: "research_requests",
      select: `
        id,
        target_account,
        status,
        created_at,
        product_description,
        company_name,
        company_domain,
        territory_states,
        target_categories,
        competitors,
        additional_context,
        research_reports(id, summary, generated_at)
      `,
      filters: {
        user_id: user.id
      },
      order: {
        column: "created_at",
        ascending: false
      }
    };
    console.log("📤 [ReportInbox] Supabase query parameters:", JSON.stringify(queryParams, null, 2));

    const { data, error } = await supabase
      .from("research_requests")
      .select(`
        id,
        target_account,
        status,
        created_at,
        product_description,
        company_name,
        company_domain,
        territory_states,
        target_categories,
        competitors,
        additional_context,
        research_reports(id, summary, generated_at)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // 3. Log raw response data from Supabase queries
    console.log("📥 [ReportInbox] Raw Supabase response:", {
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      } : null,
      dataCount: data?.length || 0,
      rawData: data
    });

    if (error) {
      console.error("❌ [ReportInbox] Failed to load requests:", error);
      toast.error("Failed to load reports");
      setIsLoading(false);
      return;
    }

    // 4. Check specifically for Hartford PD report
    const hartfordReports = (data || []).filter(req => 
      req.target_account?.toLowerCase().includes("hartford") || 
      req.target_account?.toLowerCase().includes("hartford pd")
    );
    
    console.log("🔍 [ReportInbox] Hartford PD report search:", {
      totalReports: data?.length || 0,
      hartfordReportsFound: hartfordReports.length,
      hartfordReports: hartfordReports.map(req => ({
        id: req.id,
        target_account: req.target_account,
        status: req.status,
        created_at: req.created_at,
        has_report: Array.isArray(req.research_reports) && req.research_reports.length > 0,
        report_count: Array.isArray(req.research_reports) ? req.research_reports.length : 0,
        report_ids: Array.isArray(req.research_reports) ? req.research_reports.map(r => r.id) : [],
        research_reports_type: typeof req.research_reports,
        research_reports_isArray: Array.isArray(req.research_reports)
      }))
    });

    // Log all target_accounts to see what we're getting
    const allAccounts = (data || []).map(req => req.target_account);
    console.log("📋 [ReportInbox] All target_accounts in response:", {
      uniqueAccounts: [...new Set(allAccounts)],
      accountCounts: allAccounts.reduce((acc, account) => {
        acc[account] = (acc[account] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });

    // Log data for debugging
    console.log("✅ [ReportInbox] Loaded requests:", data?.length || 0);
    if (data && data.length > 0) {
      console.log("📄 [ReportInbox] Sample request:", {
        id: data[0].id,
        target_account: data[0].target_account,
        status: data[0].status,
        has_report: Array.isArray(data[0].research_reports) && data[0].research_reports.length > 0,
        report_count: Array.isArray(data[0].research_reports) ? data[0].research_reports.length : 0
      });
    }

    // Group requests by target_account
    const groups = new Map<string, ResearchRequestWithReport[]>();
    (data || []).forEach(request => {
      const account = request.target_account;
      if (!groups.has(account)) {
        groups.set(account, []);
      }
      groups.get(account)!.push(request);
    });

    // 5. Log whether reports exist but are filtered out
    console.log("🔀 [ReportInbox] Grouping results:", {
      totalRequests: data?.length || 0,
      accountGroups: Array.from(groups.entries()).map(([account, requests]) => ({
        account,
        requestCount: requests.length,
        statuses: requests.map(r => r.status),
        hasCompleted: requests.some(r => r.status === "completed"),
        hasReports: requests.some(r => Array.isArray(r.research_reports) && r.research_reports.length > 0)
      })),
      hartfordInGroups: groups.has("Hartford PD") || Array.from(groups.keys()).some(k => k.toLowerCase().includes("hartford"))
    });

    // Sort requests within each group by created_at desc
    groups.forEach(requests => {
      requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Sort groups by the most recent request in each group
    const sortedGroups = new Map(
      Array.from(groups.entries()).sort(([, a], [, b]) => {
        const aDate = a[0]?.created_at ? new Date(a[0].created_at).getTime() : 0;
        const bDate = b[0]?.created_at ? new Date(b[0].created_at).getTime() : 0;
        return bDate - aDate;
      })
    );

    setAccountGroups(sortedGroups);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadRequests();
  }, []); // Only run once on mount

  useEffect(() => {
    if (!user) return;

    // Subscribe to research_requests updates for status changes
    const requestsChannel = supabase
      .channel('research_requests_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'research_requests',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('🔄 [ReportInbox] Research request updated:', {
            requestId: payload.new.id,
            target_account: payload.new.target_account,
            oldStatus: payload.old.status,
            newStatus: payload.new.status,
            isHartford: payload.new.target_account?.toLowerCase().includes("hartford")
          });
          // If status changed to completed, reload the full request with reports
          if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
            console.log('✅ [ReportInbox] Status changed to completed, reloading request:', payload.new.id);
            // Reload the full request data including research_reports
            const { data: updatedRequest, error: reloadError } = await supabase
              .from("research_requests")
              .select(`
                id,
                target_account,
                status,
                created_at,
                product_description,
                company_name,
                company_domain,
                territory_states,
                target_categories,
                competitors,
                additional_context,
                research_reports(id, summary, generated_at)
              `)
              .eq("id", payload.new.id)
              .single();

            console.log('📥 [ReportInbox] Reloaded request after completion:', {
              error: reloadError,
              hasData: !!updatedRequest,
              target_account: updatedRequest?.target_account,
              reportCount: Array.isArray(updatedRequest?.research_reports) ? updatedRequest.research_reports.length : 0
            });

            if (updatedRequest) {
              setAccountGroups(prev => {
                const newGroups = new Map(prev);
                // Find and update the request in its group
                for (const [account, requests] of newGroups) {
                  const requestIndex = requests.findIndex(req => req.id === payload.new.id);
                  if (requestIndex !== -1) {
                    requests[requestIndex] = updatedRequest as ResearchRequestWithReport;
                    // Re-sort within the group
                    requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    break;
                  }
                }
                return newGroups;
              });
            }
          } else {
            // For other updates, just update the status
            setAccountGroups(prev => {
              const newGroups = new Map(prev);
              // Find and update the request in its group
              for (const [account, requests] of newGroups) {
                const requestIndex = requests.findIndex(req => req.id === payload.new.id);
                if (requestIndex !== -1) {
                  requests[requestIndex] = { ...requests[requestIndex], ...payload.new };
                  // Re-sort within the group
                  requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  break;
                }
              }
              return newGroups;
            });
          }
        }
      )
      .subscribe();

    // Subscribe to research_reports inserts as a backup
    // This ensures we catch reports even if the UPDATE event doesn't fire
    const reportsChannel = supabase
      .channel('research_reports_inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'research_reports',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('📝 [ReportInbox] Research report inserted:', {
            reportId: payload.new.id,
            requestId: payload.new.request_id,
            userId: payload.new.user_id,
            matchesCurrentUser: payload.new.user_id === user?.id
          });
          // Reload the full request data including the new report
          const { data: updatedRequest, error: reloadError } = await supabase
            .from("research_requests")
            .select(`
              id,
              target_account,
              status,
              created_at,
              product_description,
              company_name,
              company_domain,
              territory_states,
              target_categories,
              competitors,
              additional_context,
              research_reports(id, summary, generated_at)
            `)
            .eq("id", payload.new.request_id)
            .single();

          console.log('📥 [ReportInbox] Reloaded request after report insert:', {
            error: reloadError,
            hasData: !!updatedRequest,
            target_account: updatedRequest?.target_account,
            isHartford: updatedRequest?.target_account?.toLowerCase().includes("hartford"),
            reportCount: updatedRequest?.research_reports?.length || 0
          });

          if (updatedRequest) {
            setAccountGroups(prev => {
              const newGroups = new Map(prev);
              // Find and update the request in its group
              for (const [account, requests] of newGroups) {
                const requestIndex = requests.findIndex(req => req.id === payload.new.request_id);
                if (requestIndex !== -1) {
                  requests[requestIndex] = updatedRequest as ResearchRequestWithReport;
                  // Re-sort within the group
                  requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  break;
                }
              }
              return newGroups;
            });
          }
        }
      )
      .subscribe();

    return () => {
      requestsChannel.unsubscribe();
      reportsChannel.unsubscribe();
    };
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
            <Check className="w-3 h-3" />
            Completed
          </Badge>
        );
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
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString();
  };

  const getSummaryExcerpt = (request: ResearchRequestWithReport) => {
    if (request.status === "completed" && Array.isArray(request.research_reports) && request.research_reports[0]?.summary) {
      return request.research_reports[0].summary.length > 120
        ? `${request.research_reports[0].summary.substring(0, 120)}...`
        : request.research_reports[0].summary;
    }

    switch (request.status) {
      case "pending":
        return "Your research request has been queued and will start shortly.";
      case "researching":
        return "Research in progress. This may take a few minutes.";
      case "failed":
        return "Research failed. Click to retry or contact support.";
      case "completed":
        return "Report is being processed...";
      default:
        return "";
    }
  };

  const handleRowClick = (requestId: string) => {
    navigate(`/app/report/${requestId}`);
  };

  const fetchAccountIntelligence = async (accountName: string, requests: ResearchRequestWithReport[]) => {
    // Find the most recent completed request for this account
    const completedRequest = requests
      .filter(req => req.status === "completed")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!completedRequest) return;

    try {
      const { data: memories } = await supabase
        .from("agent_memory")
        .select("memory_type, content")
        .eq("request_id", completedRequest.id)
        .in("memory_type", ["org_profile"]);

      const orgProfile = memories?.find(m => m.memory_type === "org_profile");
      if (orgProfile) {
        setAccountIntelligence(prev => new Map(prev).set(accountName, orgProfile.content));
      }
    } catch (error) {
      console.error("Failed to fetch account intelligence:", error);
    }
  };

  const toggleExpanded = (accountName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation when clicking expand/collapse
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      const isExpanding = !newSet.has(accountName);

      if (newSet.has(accountName)) {
        newSet.delete(accountName);
      } else {
        newSet.add(accountName);
        // Fetch account intelligence when expanding
        const requests = accountGroups.get(accountName) || [];
        fetchAccountIntelligence(accountName, requests);
      }
      return newSet;
    });
  };

  const handleRetryResearch = async (requestId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation
    if (retryingIds.has(requestId)) return;

    setRetryingIds(prev => new Set([...prev, requestId]));

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const token = sessionData.session?.access_token;

      const { data: invokeData, error: invokeError } = await supabase.functions.invoke("research-target-account", {
        body: { requestId },
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

      // Update local state to show pending status
      setAccountGroups(prev => {
        const newGroups = new Map(prev);
        for (const [account, requests] of newGroups) {
          const requestIndex = requests.findIndex(req => req.id === requestId);
          if (requestIndex !== -1) {
            requests[requestIndex] = { ...requests[requestIndex], status: 'pending' };
            break;
          }
        }
        return newGroups;
      });
    } catch (error) {
      console.error("Failed to retry research:", error);
      toast.error("We could not restart the research. Please try again.");
    } finally {
      setRetryingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  async function handleRegenerateAllReports() {
    if (isRegeneratingAll) return;

    setIsRegeneratingAll(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Get all requests that have reports (completed ones)
      const allRequests = Array.from(accountGroups.values()).flat();
      const requestsWithReports = allRequests.filter(req =>
        req.status === 'completed' || Array.isArray(req.research_reports) && req.research_reports.length > 0
      );

      if (requestsWithReports.length === 0) {
        toast.info("No completed reports found to regenerate");
        setIsRegeneratingAll(false);
        return;
      }

      console.log(`🚀 Regenerating ${requestsWithReports.length} reports with multi-agent pipeline`);

      for (const request of requestsWithReports) {
        try {
          // Reset to pending
          const { error: updateError } = await supabase
            .from('research_requests')
            .update({
              status: 'pending',
              research_started_at: null,
              research_completed_at: null
            })
            .eq('id', request.id);

          if (updateError) {
            console.error(`❌ Failed to reset ${request.target_account}:`, updateError);
            errorCount++;
            continue;
          }

          // Start new research with multi-agent pipeline
          const { error: invokeError } = await supabase.functions.invoke('research-target-account', {
            body: { requestId: request.id },
          });

          if (invokeError) {
            console.error(`❌ Failed to start research for ${request.target_account}:`, invokeError);
            errorCount++;
          } else {
            console.log(`✅ Started multi-agent research for ${request.target_account}`);
            successCount++;

            // Update local state to show pending
            setAccountGroups(prev => {
              const newGroups = new Map(prev);
              for (const [account, requests] of newGroups) {
                const requestIndex = requests.findIndex(req => req.id === request.id);
                if (requestIndex !== -1) {
                  requests[requestIndex] = { ...requests[requestIndex], status: 'pending' };
                  break;
                }
              }
              return newGroups;
            });
          }
        } catch (error) {
          console.error(`❌ Error processing ${request.target_account}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Regenerated ${successCount} reports with enhanced multi-agent research!`);
        if (errorCount > 0) {
          toast.warning(`${errorCount} reports failed to regenerate`);
        }
      } else {
        toast.error("Failed to regenerate any reports");
      }

    } catch (error) {
      console.error("❌ Unexpected error in regenerate all:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsRegeneratingAll(false);
    }
  }

  const handleDeleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("research_requests")
        .delete()
        .eq("id", requestId);

      if (error) {
        console.error("Failed to delete request:", error);
        toast.error("Failed to delete report");
        return;
      }

      // Optimistically update local state
      setAccountGroups(prev => {
        const newGroups = new Map(prev);
        for (const [account, requests] of newGroups) {
          const filteredRequests = requests.filter(req => req.id !== requestId);
          if (filteredRequests.length === 0) {
            // If no requests left for this account, remove the entire group
            newGroups.delete(account);
          } else {
            // Update the group with remaining requests
            newGroups.set(account, filteredRequests);
          }
          break;
        }
        return newGroups;
      });

      toast.success("Report deleted successfully");
      setDeletingRequestId(null);
    } catch (error) {
      console.error("Failed to delete request:", error);
      toast.error("Failed to delete report");
    }
  };

  const handleDeleteAccount = async (targetAccount: string) => {
    try {
      const { error } = await supabase
        .from("research_requests")
        .delete()
        .eq("target_account", targetAccount)
        .eq("user_id", user?.id);

      if (error) {
        console.error("Failed to delete account:", error);
        toast.error("Failed to delete account");
        return;
      }

      // Remove the entire account group from local state
      setAccountGroups(prev => {
        const newGroups = new Map(prev);
        newGroups.delete(targetAccount);
        return newGroups;
      });

      toast.success("Account deleted successfully");
      setDeletingAccount(null);
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (accountGroups.size === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No reports yet</h2>
        <p className="text-gray-600 mb-6">Complete onboarding to trigger your first research report. Your reports will appear here as a scannable list, just like your email inbox.</p>
        <div className="flex flex-col gap-3 items-center">
          <Link
            to="/start"
            className="text-primary hover:text-primary/80 font-medium"
          >
            Go to onboarding →
          </Link>
        </div>
      </div>
    );
  }

  // Log what's being rendered
  console.log("🎨 [ReportInbox] Rendering component:", {
    accountGroupsCount: accountGroups.size,
    accountNames: Array.from(accountGroups.keys()),
    hartfordInRender: Array.from(accountGroups.keys()).some(k => k.toLowerCase().includes("hartford")),
    expandedRows: Array.from(expandedRows)
  });

  return (
    <div className="space-y-0">
      {/* Regenerate All Reports Button */}
      <div className="mb-6">
        <button
          onClick={handleRegenerateAllReports}
          disabled={isRegeneratingAll}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRegeneratingAll ? 'animate-spin' : ''}`} />
          {isRegeneratingAll ? 'Regenerating All Reports...' : 'Regenerate All Reports'}
        </button>
        <p className="text-sm text-gray-600 mt-2">
          This will restart research for all your reports using the new multi-agent pipeline with enhanced insights.
        </p>
      </div>

      {Array.from(accountGroups.entries()).map(([accountName, requests], accountIndex) => {
        const latestRequest = requests[0]; // Already sorted by created_at desc
        const reportCount = requests.length;
        const isExpanded = expandedRows.has(accountName);

        // Log Hartford PD specifically when rendering
        if (accountName.toLowerCase().includes("hartford")) {
          console.log("🏛️ [ReportInbox] Rendering Hartford PD account:", {
            accountName,
            reportCount,
            requests: requests.map(r => ({
              id: r.id,
              status: r.status,
              created_at: r.created_at,
              has_report: Array.isArray(r.research_reports) && r.research_reports.length > 0
            }))
          });
        }

        return (
          <div key={accountName}>
            {/* Account Row */}
            <div
              className="bg-white border rounded-lg p-4 hover:bg-gray-50 hover:shadow-sm cursor-pointer transition-all duration-200 hover:scale-[1.01] border-gray-200"
              onClick={(e) => toggleExpanded(accountName, e)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => toggleExpanded(accountName, e)}
                    className="p-1 hover:bg-gray-100 rounded transition-transform duration-200"
                    aria-label={isExpanded ? "Collapse account" : "Expand account"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                    {accountName}
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {reportCount} report{reportCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">
                    Latest: {formatDate(latestRequest.created_at)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingAccount(accountName);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    aria-label={`Delete all reports for ${accountName}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 011-1v1z" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                {getSummaryExcerpt(latestRequest)}
              </p>
            </div>

            {/* Expanded Account Content */}
            {isExpanded && (
              <div className="bg-gray-50 border-x border-b border-gray-200 rounded-b-lg px-4 py-4 mx-0 -mt-2 mb-2">
                <div className="space-y-4">
                  {/* List of Report Runs */}
                  <div className="space-y-2">
                    {requests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 font-medium">
                            {formatDate(request.created_at)}
                          </span>
                          {getStatusBadge(request.status)}
                          {request.status === "completed" && (
                            <button
                              onClick={() => handleRowClick(request.id)}
                              className="text-sm text-primary hover:text-primary/80 font-medium"
                            >
                              View Report →
                            </button>
                          )}
                          {request.status === "failed" && (
                            <button
                              onClick={(e) => handleRetryResearch(request.id, e)}
                              disabled={retryingIds.has(request.id)}
                              className="text-sm text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              {retryingIds.has(request.id) ? "Re-queuing..." : "Re-queue"}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingRequestId(request.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          aria-label={`Delete report from ${formatDate(request.created_at)}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Account Intelligence */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Account Intelligence</h3>

                    {accountIntelligence.has(accountName) ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                        {(() => {
                          const intel = accountIntelligence.get(accountName);
                          return (
                            <>
                              {intel?.mission && (
                                <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</span>
                                  <p className="text-gray-900 text-sm mt-1">{intel.mission}</p>
                                </div>
                              )}

                              {intel?.size && (
                                <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Size</span>
                                  <div className="text-gray-900 text-sm mt-1 space-y-1">
                                    {intel.size.employees && <div>~{intel.size.employees.toLocaleString()} employees</div>}
                                    {intel.size.population && <div>Serves ~{intel.size.population.toLocaleString()} people</div>}
                                    {intel.size.coverage && <div>Coverage: {intel.size.coverage}</div>}
                                  </div>
                                </div>
                              )}

                              {intel?.annualBudget && (
                                <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Budget</span>
                                  <p className="text-gray-900 text-sm mt-1">${intel.annualBudget.toLocaleString()}</p>
                                </div>
                              )}

                              {intel?.leadership && intel.leadership.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Leadership</span>
                                  <div className="text-gray-900 text-sm mt-1 space-y-1">
                                    {intel.leadership.slice(0, 2).map((leader: any, idx: number) => (
                                      <div key={idx}>
                                        {leader.title}: {leader.name}
                                        {leader.tenure && <span className="text-gray-600"> ({leader.tenure})</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {intel?.jurisdiction && (
                                <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Jurisdiction</span>
                                  <p className="text-gray-900 text-sm mt-1">{intel.jurisdiction}</p>
                                </div>
                              )}

                              {intel?.keyFacts && intel.keyFacts.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Key Facts</span>
                                  <ul className="text-gray-900 text-sm mt-1 list-disc list-inside space-y-1">
                                    {intel.keyFacts.slice(0, 3).map((fact: string, idx: number) => (
                                      <li key={idx}>{fact}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="text-center text-gray-500 text-sm">
                          Research in progress... Intelligence will appear here when complete.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {accountIndex < accountGroups.size - 1 && <div className="h-2" />}
          </div>
        );
      })}

      {/* Delete Request Confirmation Dialog */}
      <AlertDialog open={!!deletingRequestId} onOpenChange={() => setDeletingRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRequestId && handleDeleteRequest(deletingRequestId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={!!deletingAccount} onOpenChange={() => setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all reports for "{deletingAccount}"? This will remove{" "}
              {deletingAccount && accountGroups.get(deletingAccount)?.length} report(s) and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAccount && handleDeleteAccount(deletingAccount)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}