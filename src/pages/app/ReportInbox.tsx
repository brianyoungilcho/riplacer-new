import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, Check, Plus, ArrowUpDown } from "lucide-react";

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
    id?: string;
    summary: string | null;
    generated_at?: string | null;
    content?: {
      topInsight?: string;
      summary?: string;
      accountSnapshot?: {
        type?: string;
        size?: string;
        budget?: string;
        location?: string;
      };
    };
  }> | {
    summary: string | null;
    content?: {
      topInsight?: string;
      summary?: string;
      accountSnapshot?: {
        type?: string;
        size?: string;
        budget?: string;
        location?: string;
      };
    };
  } | null;
};

export default function ReportInbox() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const [accountGroups, setAccountGroups] = useState<Map<string, ResearchRequestWithReport[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isNewResearchOpen, setIsNewResearchOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newContext, setNewContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {

    if (!user) {
      return;
    }

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
        research_reports(id, summary, content, generated_at)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load reports");
      setIsLoading(false);
      return;
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
  }, [loadRequests]);

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
          // If status changed to completed, reload the full request with reports
          if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
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
                research_reports(id, summary, content, generated_at)
              `)
              .eq("id", payload.new.id)
              .single();

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
              research_reports(id, summary, content, generated_at)
            `)
            .eq("id", payload.new.request_id)
            .single();

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

  const getReportContent = (request: ResearchRequestWithReport) => {
    if (!request.research_reports) return null;
    const report = Array.isArray(request.research_reports)
      ? request.research_reports[0]
      : request.research_reports;
    return report?.content ?? null;
  };

  const getSummaryExcerpt = (request: ResearchRequestWithReport) => {
    if (request.status === "completed") {
      const report = Array.isArray(request.research_reports)
        ? request.research_reports[0]
        : request.research_reports;
      const content = getReportContent(request);
      const candidate =
        content?.topInsight
        || content?.summary
        || report?.summary;

      if (candidate) {
        return candidate.length > 120
          ? `${candidate.substring(0, 120)}...`
          : candidate;
      }
    }

    switch (request.status) {
      case "pending":
        return "Your research request has been queued and will start shortly.";
      case "researching":
        return "Research in progress. This may take a few minutes.";
      case "failed":
        return "Research failed. Click to retry or contact support.";
      case "completed":
        return "Report available. Expand to see details.";
      default:
        return "";
    }
  };

  const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const sortedAndFilteredGroups = useMemo(() => {
    const entries = Array.from(accountGroups.entries());
    const filteredEntries = normalizedQuery
      ? entries.filter(([account, requests]) => {
          const accountMatch = account.toLowerCase().includes(normalizedQuery);
          const reportMatch = requests.some((request) => {
            const report = Array.isArray(request.research_reports)
              ? request.research_reports[0]
              : request.research_reports;
            const content = getReportContent(request);
            const candidates = [
              content?.topInsight,
              content?.summary,
              report?.summary,
            ].filter(Boolean) as string[];
            return candidates.some((text) => text.toLowerCase().includes(normalizedQuery));
          });
          return accountMatch || reportMatch;
        })
      : entries;

    const sortedEntries = filteredEntries.map(([account, requests]) => {
      const sortedRequests = [...requests].sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortOrder === "newest" ? -diff : diff;
      });
      return [account, sortedRequests] as const;
    });

    sortedEntries.sort(([, a], [, b]) => {
      const aDate = a[0]?.created_at ? new Date(a[0].created_at).getTime() : 0;
      const bDate = b[0]?.created_at ? new Date(b[0].created_at).getTime() : 0;
      return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
    });

    return sortedEntries;
  }, [accountGroups, normalizedQuery, sortOrder]);

  const handleRowClick = (requestId: string) => {
    navigate(`/app/report/${requestId}`);
  };

  const openNewResearchDialog = (accountName?: string) => {
    setNewAccountName(accountName || "");
    setNewContext("");
    setIsNewResearchOpen(true);
  };

  const getCompanyDomain = () => {
    const domain = profile?.onboarding_data?.companyDomain;
    if (domain) return domain;
    const website = profile?.company_website;
    if (!website) return null;
    try {
      const normalized = website.startsWith("http") ? website : `https://${website}`;
      return new URL(normalized).hostname;
    } catch (error) {
      return website;
    }
  };

  const handleCreateResearch = async () => {
    if (!user) {
      toast.error("Please sign in to start research.");
      return;
    }

    const accountName = newAccountName.trim();
    if (!accountName) {
      toast.error("Account name is required.");
      return;
    }

    const productDescription = profile?.product_description || profile?.onboarding_data?.productDescription;
    if (!productDescription) {
      toast.error("Please complete your profile before starting research.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: insertedRequest, error } = await supabase
        .from("research_requests")
        .insert({
          user_id: user.id,
          target_account: accountName,
          product_description: productDescription,
          company_name: profile?.company_name || profile?.onboarding_data?.companyName || null,
          company_domain: getCompanyDomain(),
          territory_states: profile?.onboarding_data?.states || [],
          target_categories: profile?.onboarding_data?.targetCategories || [],
          competitors: profile?.competitor_names || profile?.onboarding_data?.competitors || [],
          additional_context: newContext.trim() || null,
          status: "pending",
        })
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
        .single();

      if (error) {
        toast.error("Failed to create research request.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { error: invokeError } = await supabase.functions.invoke("research-target-account", {
        body: { requestId: insertedRequest.id },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (invokeError) {
        toast.warning("Research was created but could not start. Please try again.");
      } else {
        toast.success("Research started. You'll see updates here shortly.");
      }

      await loadRequests();
      setIsNewResearchOpen(false);
      setNewAccountName("");
      setNewContext("");
    } catch (error) {
      toast.error("Failed to start research. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpanded = (accountName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation when clicking expand/collapse
    setExpandedRows(prev => {
      const newSet = new Set(prev);

      if (newSet.has(accountName)) {
        newSet.delete(accountName);
      } else {
        newSet.add(accountName);
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

      const { error: invokeError } = await supabase.functions.invoke("research-target-account", {
        body: { requestId },
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
      toast.error("We could not restart the research. Please try again.");
    } finally {
      setRetryingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("research_requests")
        .delete()
        .eq("id", requestId);

      if (error) {
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

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={() => openNewResearchDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            New Research
          </Button>
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="gap-2"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort: {sortOrder === "newest" ? "Newest" : "Oldest"}
          </Button>
        </div>
        {accountGroups.size > 0 && (
          <span className="text-sm text-gray-500">
            {normalizedQuery && sortedAndFilteredGroups.length !== accountGroups.size
              ? `Showing ${sortedAndFilteredGroups.length} of ${accountGroups.size} accounts`
              : `${accountGroups.size} account${accountGroups.size === 1 ? "" : "s"}`}
          </span>
        )}
      </div>

      {accountGroups.size === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No accounts yet</h2>
          <p className="text-gray-600 mb-6">
            Start your first research by adding an account. Reports will appear here as a scannable list.
          </p>
          <Button onClick={() => openNewResearchDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            New Research
          </Button>
        </div>
      ) : sortedAndFilteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No matches</h2>
          <p className="text-gray-600">Try a different search term.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAndFilteredGroups.map(([accountName, requests], accountIndex) => {
            const latestRequest = requests[0];
            const reportCount = requests.length;
            const isExpanded = expandedRows.has(accountName);
            const latestCompletedRequest = requests.reduce<ResearchRequestWithReport | null>((latest, request) => {
              if (request.status !== "completed") return latest;
              if (!latest) return request;
              return new Date(request.created_at).getTime() > new Date(latest.created_at).getTime()
                ? request
                : latest;
            }, null);
            const accountSnapshot = latestCompletedRequest
              ? getReportContent(latestCompletedRequest)?.accountSnapshot
              : null;

            return (
              <div key={accountName}>
                {/* Account Card */}
                <div
                  className="bg-white border rounded-lg p-4 hover:bg-gray-50 hover:shadow-sm cursor-pointer transition-all border-gray-200"
                  onClick={(event) => toggleExpanded(accountName, event)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(event) => toggleExpanded(accountName, event)}
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
                        {getStatusBadge(latestRequest.status)}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {getSummaryExcerpt(latestRequest)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Last researched: {formatDate(latestRequest.created_at)}</span>
                        <span>{reportCount} report{reportCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeletingAccount(accountName);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label={`Delete all reports for ${accountName}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 011-1v1z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Account Content */}
                {isExpanded && (
                  <div className="bg-gray-50 border-x border-b border-gray-200 rounded-b-lg px-4 py-4 mx-0 -mt-2 mb-2">
                    <div className="space-y-4">
                      {accountSnapshot && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Snapshot</h3>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-700">
                            {[
                              { label: "Type", value: accountSnapshot.type },
                              { label: "Size", value: accountSnapshot.size },
                              { label: "Budget", value: accountSnapshot.budget },
                              { label: "Location", value: accountSnapshot.location },
                            ]
                              .filter((item) => item.value)
                              .map((item) => (
                                <span
                                  key={item.label}
                                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1"
                                >
                                  <span className="text-gray-500">{item.label}:</span>
                                  <span className="font-medium text-gray-900">{item.value}</span>
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Report History</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openNewResearchDialog(accountName);
                          }}
                        >
                          Run New Research
                        </Button>
                      </div>

                      {/* List of Report Runs */}
                      <div className="space-y-2">
                        {requests.map((request) => (
                          <div key={request.id} className="flex items-center justify-between bg-white p-3 rounded border">
                            <div className="flex flex-wrap items-center gap-3">
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
                                  onClick={(event) => handleRetryResearch(request.id, event)}
                                  disabled={retryingIds.has(request.id)}
                                  className="text-sm text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                  {retryingIds.has(request.id) ? "Re-queuing..." : "Retry"}
                                </button>
                              )}
                            </div>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
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
                    </div>
                  </div>
                )}

                {accountIndex < sortedAndFilteredGroups.length - 1 && <div className="h-2" />}
              </div>
            );
          })}
        </div>
      )}

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

      {/* New Research Dialog */}
      <Dialog open={isNewResearchOpen} onOpenChange={setIsNewResearchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Research</DialogTitle>
            <DialogDescription>
              We will use your profile to personalize the research for this account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account name
              </label>
              <Input
                value={newAccountName}
                onChange={(event) => setNewAccountName(event.target.value)}
                placeholder="e.g. Hartford Police Department"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional context (optional)
              </label>
              <Textarea
                value={newContext}
                onChange={(event) => setNewContext(event.target.value)}
                placeholder="Any specific angles or timing to research?"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsNewResearchOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateResearch} disabled={isSubmitting}>
              {isSubmitting ? "Starting..." : "Start Research"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}