import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDiscoverySession, type DiscoverySessionCriteria, type DiscoveryProspect } from '@/hooks/useDiscoverySession';
import { useDiscoveryPolling } from '@/hooks/useDiscoveryPolling';
import { ResearchProgress, AdvantagesBrief, ProspectDossierCard, AccountPlanView, type AccountPlan } from '@/components/discovery-v2';
import { Loader2, RefreshCw, ChevronRight, Lock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Unauth users see 3 prospects, rest are paywalled
const UNAUTH_PROSPECT_LIMIT = 3;

interface DiscoveryV2TabProps {
  criteria: DiscoverySessionCriteria;
  onProspectSelect?: (prospect: DiscoveryProspect | null) => void;
  onProspectsChange?: (prospects: DiscoveryProspect[]) => void;
  selectedProspectId?: string | null;
  className?: string;
}

export function DiscoveryV2Tab({ 
  criteria, 
  onProspectSelect, 
  onProspectsChange,
  selectedProspectId,
  className 
}: DiscoveryV2TabProps) {
  const { user } = useAuth();
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const [accountPlan, setAccountPlan] = useState<{ plan: AccountPlan; prospectName: string } | null>(null);
  const hasStartedRef = useRef(false);

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
    onUpdate: () => {
      // State is automatically updated in useDiscoverySession via fetchSession
    },
    onComplete: () => {
      toast.success('Research complete!');
    },
  });

  // Auto-start discovery when component mounts with valid criteria
  const startDiscovery = useCallback(async () => {
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

    toast.success('Research started!');
  }, [criteria, clearSession, createSession, discoverProspects, researchAdvantages]);

  // Auto-start on mount if criteria is valid and hasn't started yet
  useEffect(() => {
    const hasValidCriteria = 
      criteria.productDescription && 
      criteria.territory?.states?.length > 0 &&
      criteria.targetCategories?.length > 0;
    
    if (hasValidCriteria && !hasStartedRef.current && !session) {
      hasStartedRef.current = true;
      startDiscovery();
    }
  }, [criteria, session, startDiscovery]);

  // Handle generating account plan for a prospect (auth only)
  const handleGeneratePlan = useCallback(async (prospectId: string, prospectName: string) => {
    if (!user) {
      toast.error('Please sign up to generate account plans');
      return;
    }
    if (!session?.id) return;

    toast.loading('Generating account plan...', { id: 'plan' });
    
    const plan = await generateAccountPlan(session.id, prospectId);
    
    if (plan) {
      setAccountPlan({ plan, prospectName });
      toast.success('Account plan ready!', { id: 'plan' });
    } else {
      toast.error('Failed to generate plan', { id: 'plan' });
    }
  }, [user, session?.id, generateAccountPlan]);

  // Sync expanded prospect with selected
  useEffect(() => {
    if (selectedProspectId) {
      setExpandedProspectId(selectedProspectId);
    }
  }, [selectedProspectId]);

  // Notify parent when prospects change (for map)
  useEffect(() => {
    onProspectsChange?.(prospects);
  }, [prospects, onProspectsChange]);

  // Handle prospect click
  const handleProspectToggle = (prospect: DiscoveryProspect, isLocked: boolean) => {
    if (isLocked) {
      toast.error('Sign up to unlock all prospects');
      return;
    }
    const newExpanded = expandedProspectId === prospect.prospectId ? null : prospect.prospectId;
    setExpandedProspectId(newExpanded);
    onProspectSelect?.(newExpanded ? prospect : null);
  };

  // Determine which prospects to show and which are locked
  const visibleProspects = user ? prospects : prospects.slice(0, UNAUTH_PROSPECT_LIMIT);
  const lockedProspects = user ? [] : prospects.slice(UNAUTH_PROSPECT_LIMIT);
  const hiddenProspectCount = lockedProspects.length;

  // No valid criteria - show prompt
  const hasValidCriteria = 
    criteria.productDescription && 
    criteria.territory?.states?.length > 0 &&
    criteria.targetCategories?.length > 0;

  if (!hasValidCriteria) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", className)}>
        <Zap className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Complete Setup First</h3>
        <p className="text-gray-500 text-center mb-4">
          Fill in your product, territory, and target categories to start AI-powered discovery.
        </p>
      </div>
    );
  }

  // Loading initial session
  if (!session && (isCreating || isLoading)) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", className)}>
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Starting Research...</h3>
        <p className="text-gray-500 text-center">
          Our AI is finding the best prospects for you.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col bg-gray-50", className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Discovery
            </h2>
            <p className="text-sm text-gray-500">
              {prospects.length} prospects found • {progress}% complete
            </p>
          </div>
          <button
            onClick={() => {
              hasStartedRef.current = false;
              startDiscovery();
            }}
            disabled={isPolling || isCreating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", (isPolling || isCreating) && "animate-spin")} />
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
                <Zap className="w-4 h-4 text-primary" />
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

        {/* Visible Prospects List */}
        <div className="space-y-3">
          {visibleProspects.map((prospect) => (
            <ProspectDossierCard
              key={prospect.prospectId}
              prospect={prospect}
              isExpanded={expandedProspectId === prospect.prospectId}
              onToggle={() => handleProspectToggle(prospect, false)}
              onGeneratePlan={() => handleGeneratePlan(prospect.prospectId, prospect.name)}
              showGeneratePlan={!!user}
            />
          ))}

          {/* Locked prospects preview (blurred) */}
          {lockedProspects.slice(0, 2).map((prospect) => (
            <div 
              key={prospect.prospectId}
              onClick={() => handleProspectToggle(prospect, true)}
              className="relative cursor-pointer"
            >
              <div className="blur-sm pointer-events-none">
                <ProspectDossierCard
                  prospect={prospect}
                  isExpanded={false}
                  onToggle={() => {}}
                  onGeneratePlan={() => {}}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 rounded-xl">
                <Lock className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          ))}
        </div>

        {/* Unauth user paywall card */}
        {!user && hiddenProspectCount > 0 && (
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-center">
            <h4 className="font-bold text-white text-lg mb-1">Unlock {hiddenProspectCount} more prospects</h4>
            <p className="text-gray-400 text-sm mb-4">Plus: Save leads, generate account plans, AI insights & more</p>
            <a
              href="/auth"
              className="inline-block w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Sign Up Free →
            </a>
            <p className="text-xs text-gray-500 mt-3">No credit card required</p>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && prospects.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
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