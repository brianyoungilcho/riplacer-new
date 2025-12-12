import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDiscoverySession, type DiscoverySessionCriteria, type DiscoveryProspect } from '@/hooks/useDiscoverySession';
import { useDiscoveryPolling } from '@/hooks/useDiscoveryPolling';
import { ResearchProgress, AdvantagesBrief, ProspectDossierCard, AccountPlanView, type AccountPlan } from '@/components/discovery-v2';
import { Loader2, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DiscoveryV2TabProps {
  criteria: DiscoverySessionCriteria;
  onProspectSelect?: (prospect: DiscoveryProspect | null) => void;
  selectedProspectId?: string | null;
  className?: string;
}

export function DiscoveryV2Tab({ 
  criteria, 
  onProspectSelect, 
  selectedProspectId,
  className 
}: DiscoveryV2TabProps) {
  const { user } = useAuth();
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const [accountPlan, setAccountPlan] = useState<{ plan: AccountPlan; prospectName: string } | null>(null);

  const {
    session,
    advantageBrief,
    advantageBriefStatus,
    prospects,
    jobs,
    progress,
    isCreating,
    isLoading,
    createSession,
    fetchSession,
    discoverProspects,
    researchAdvantages,
    generateAccountPlan,
    clearSession,
  } = useDiscoverySession();

  // Polling for updates
  const { isPolling, stopPolling } = useDiscoveryPolling({
    sessionId: session?.id || null,
    enabled: !!session && progress < 100,
    intervalMs: 3000,
    onUpdate: (state) => {
      // State is automatically updated in useDiscoverySession via fetchSession
    },
    onComplete: () => {
      toast.success('Research complete!');
    },
  });

  // Start a new discovery session
  const startDiscovery = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to use deep research');
      return;
    }

    // Clear previous state
    clearSession();

    // Create session
    const sessionId = await createSession(criteria);
    if (!sessionId) return;

    // Start parallel research
    await Promise.all([
      discoverProspects(sessionId, criteria),
      researchAdvantages(sessionId, criteria),
    ]);

    toast.success('Deep research started!');
  }, [user, criteria, clearSession, createSession, discoverProspects, researchAdvantages]);

  // Handle generating account plan for a prospect
  const handleGeneratePlan = useCallback(async (prospectId: string, prospectName: string) => {
    if (!session?.id) return;

    toast.loading('Generating account plan...', { id: 'plan' });
    
    const plan = await generateAccountPlan(session.id, prospectId);
    
    if (plan) {
      setAccountPlan({ plan, prospectName });
      toast.success('Account plan ready!', { id: 'plan' });
    } else {
      toast.error('Failed to generate plan', { id: 'plan' });
    }
  }, [session?.id, generateAccountPlan]);

  // Sync expanded prospect with selected
  useEffect(() => {
    if (selectedProspectId) {
      setExpandedProspectId(selectedProspectId);
    }
  }, [selectedProspectId]);

  // Handle prospect click
  const handleProspectToggle = (prospect: DiscoveryProspect) => {
    const newExpanded = expandedProspectId === prospect.prospectId ? null : prospect.prospectId;
    setExpandedProspectId(newExpanded);
    onProspectSelect?.(newExpanded ? prospect : null);
  };

  // Not authenticated
  if (!user) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", className)}>
        <Sparkles className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Deep Research</h3>
        <p className="text-gray-500 text-center mb-4">
          Sign in to access AI-powered competitive intelligence and account planning.
        </p>
      </div>
    );
  }

  // No session yet - show start button
  if (!session) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", className)}>
        <Sparkles className="w-12 h-12 text-primary/30 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Deep Research Mode</h3>
        <p className="text-gray-500 text-center mb-6 max-w-md">
          Get AI-powered competitive intelligence, stakeholder analysis, and personalized account plans for your top prospects.
        </p>
        <button
          onClick={startDiscovery}
          disabled={isCreating}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Start Deep Research
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col bg-gray-50", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Deep Research
            </h2>
            <p className="text-sm text-gray-500">
              {prospects.length} prospects • {progress}% complete
            </p>
          </div>
          <button
            onClick={startDiscovery}
            disabled={isPolling}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", isPolling && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Progress indicator */}
        {jobs.length > 0 && progress < 100 && (
          <ResearchProgress jobs={jobs} progress={progress} />
        )}

        {/* Advantage Brief Toggle */}
        {(advantageBriefStatus === 'ready' || advantageBriefStatus === 'researching') && (
          <button
            onClick={() => setShowBrief(!showBrief)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-gray-900">Strategic Advantage Brief</h4>
                <p className="text-xs text-gray-500">
                  {advantageBriefStatus === 'researching' ? 'Researching...' : 'View competitive intelligence'}
                </p>
              </div>
            </div>
            <ChevronRight className={cn(
              "w-5 h-5 text-gray-400 transition-transform",
              showBrief && "rotate-90"
            )} />
          </button>
        )}

        {/* Advantage Brief Content */}
        {showBrief && advantageBrief && (
          <AdvantagesBrief brief={advantageBrief} />
        )}

        {/* Prospects List */}
        <div className="space-y-3">
          {prospects.map((prospect) => (
            <ProspectDossierCard
              key={prospect.prospectId}
              prospect={prospect}
              isExpanded={expandedProspectId === prospect.prospectId}
              onToggle={() => handleProspectToggle(prospect)}
              onGeneratePlan={() => handleGeneratePlan(prospect.prospectId, prospect.name)}
            />
          ))}
        </div>

        {/* Loading state */}
        {isLoading && prospects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-gray-500">Finding prospects...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && prospects.length === 0 && session && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500">No prospects found yet. Research is in progress...</p>
          </div>
        )}
      </div>

      {/* Account Plan Modal */}
      {accountPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AccountPlanView
              plan={accountPlan.plan}
              prospectName={accountPlan.prospectName}
              onClose={() => setAccountPlan(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
