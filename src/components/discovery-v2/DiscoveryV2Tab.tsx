import { useState, useCallback, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDiscoverySession, type DiscoverySessionCriteria, type DiscoveryProspect } from '@/hooks/useDiscoverySession';
import { useDiscoveryPolling } from '@/hooks/useDiscoveryPolling';
import { AdvantagesBrief, ProspectDossierCardMemo, ProspectDossierCard, AccountPlanView, type AccountPlan } from '@/components/discovery-v2';
import { Loader2, Lock, Zap, Search, SlidersHorizontal, ArrowUpDown, ChevronDown, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { STATE_ABBREVIATIONS } from '@/data/us-regions';

// Unauth users see 3 prospects, rest are paywalled
const UNAUTH_PROSPECT_LIMIT = 3;

// Sort options
type SortOption = 'score' | 'name';

// Filter types
interface Filters {
  scoreRange: 'all' | 'above80' | '60-80' | 'below60';
}

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
  
  // Search, Sort, and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  // Use deferred value for search to debounce filtering (React 18+)
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    scoreRange: 'all',
  });

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

  // Polling for updates with adaptive intervals
  // Pass fetchSession so polling updates the state in useDiscoverySession
  const { isPolling, stopPolling } = useDiscoveryPolling({
    sessionId: session?.id || null,
    enabled: !!session && progress < 100,
    fetchSession, // This ensures state updates flow through useDiscoverySession
    onUpdate: (state) => {
      // Debug: log polling updates
      console.log('[DiscoveryV2] Poll update:', {
        prospectsCount: state.prospects?.length,
        jobsCount: state.jobs?.length,
        progress: state.progress,
      });
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

  // Refs for prospect cards to enable scroll-to-view
  const prospectCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Track the last externally selected prospect ID to detect when it changes from map click
  const lastExternalSelectionRef = useRef<string | null>(null);
  
  // Sync expanded prospect with selected AND scroll to it when map marker is clicked
  useEffect(() => {
    if (selectedProspectId) {
      // Only scroll if this is a NEW selection from map (not from clicking the card itself)
      // We detect this by comparing with expandedProspectId - if they're different, it came from map
      const isFromMap = expandedProspectId !== selectedProspectId;
      
      console.log('[DiscoveryV2Tab] selectedProspectId changed:', {
        selectedProspectId,
        expandedProspectId,
        isFromMap,
        hasRef: prospectCardRefs.current.has(selectedProspectId),
        availableRefs: Array.from(prospectCardRefs.current.keys()),
      });
      
      setExpandedProspectId(selectedProspectId);
      
      // Scroll the prospect card into view when selected from map
      if (isFromMap) {
        // Use a small delay to ensure state has updated and card is expanded
        setTimeout(() => {
          const cardEl = prospectCardRefs.current.get(selectedProspectId);
          console.log('[DiscoveryV2Tab] Scrolling to:', selectedProspectId, 'found:', !!cardEl);
          if (cardEl) {
            cardEl.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 50);
      }
    }
  }, [selectedProspectId]); // Note: intentionally not including expandedProspectId to avoid loops

  // Handle prospect click
  const handleProspectToggle = (prospect: DiscoveryProspect, isLocked: boolean) => {
    if (isLocked) {
      toast.error('Sign up to unlock all prospects');
      return;
    }
    const isCurrentlyExpanded = expandedProspectId === prospect.prospectId;
    const newExpanded = isCurrentlyExpanded ? null : prospect.prospectId;
    
    setExpandedProspectId(newExpanded);
    
    // Only notify map when opening a card (not when closing)
    // This ensures map pans to prospect immediately when card opens, not when it closes
    if (!isCurrentlyExpanded && newExpanded) {
      // Opening: notify map to pan to this prospect immediately
      onProspectSelect?.(prospect);
    }
    // When closing, we don't notify the map - it stays centered on the last selected prospect
    // This prevents the map from panning when closing a card
  };

  // Filter and sort prospects - using deferredSearchQuery for smooth typing
  const filteredAndSortedProspects = useMemo(() => {
    let result = [...prospects];
    
    // Apply search filter (using deferred value for debouncing)
    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.dossier?.summary || '').toLowerCase().includes(query)
      );
    }
    
    // Apply score filter
    if (filters.scoreRange !== 'all') {
      result = result.filter(p => {
        const score = p.dossier?.score || p.score || p.initialScore || 0;
        switch (filters.scoreRange) {
          case 'above80': return score >= 80;
          case '60-80': return score >= 60 && score < 80;
          case 'below60': return score < 60;
          default: return true;
        }
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const scoreA = a.dossier?.score || a.score || a.initialScore || 0;
      const scoreB = b.dossier?.score || b.score || b.initialScore || 0;
      
      switch (sortBy) {
        case 'score':
          return scoreB - scoreA;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    
    return result;
  }, [prospects, deferredSearchQuery, filters, sortBy]);
  
  // Count active filters
  const activeFilterCount = filters.scoreRange !== 'all' ? 1 : 0;
  
  // Determine which prospects to show and which are locked
  const visibleProspects = useMemo(() => {
    const filtered = user ? filteredAndSortedProspects : filteredAndSortedProspects.slice(0, UNAUTH_PROSPECT_LIMIT);
    return filtered;
  }, [filteredAndSortedProspects, user]);

  // Memoize the callback to prevent unnecessary parent re-renders
  const handleProspectsChange = useCallback((prospects: DiscoveryProspect[]) => {
    onProspectsChange?.(prospects);
  }, [onProspectsChange]);

  // Notify parent when prospects change (for map) - only send visible prospects (already limited to 3 for unauth)
  useEffect(() => {
    // visibleProspects already limits to 3 for unauth users, so just pass it directly
    handleProspectsChange(visibleProspects);
  }, [visibleProspects, handleProspectsChange]);
  
  const lockedProspects = user ? [] : filteredAndSortedProspects.slice(UNAUTH_PROSPECT_LIMIT);
  const hiddenProspectCount = lockedProspects.length;
  
  // Sort option labels
  const sortLabels: Record<SortOption, string> = {
    score: 'Riplace Score',
    name: 'Name (A-Z)',
  };
  
  // Clear filters
  const clearAllFilters = useCallback(() => {
    setFilters({ scoreRange: 'all' });
    setSearchQuery('');
  }, []);
  
  const clearFilter = useCallback((filterType: 'scoreRange') => {
    setFilters(prev => ({ ...prev, [filterType]: 'all' }));
  }, []);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setSortDropdownOpen(false);
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  // Skeleton loader component with industry-leading shimmer animation
  const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-gray-200 skeleton-shimmer relative overflow-hidden" />
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-48 mb-2 skeleton-shimmer relative overflow-hidden" />
          <div className="h-4 bg-gray-100 rounded w-32 mb-2 skeleton-shimmer relative overflow-hidden" />
          <div className="h-3 bg-gray-100 rounded w-24 skeleton-shimmer relative overflow-hidden" />
        </div>
        <div className="w-9 h-9 rounded-lg bg-gray-100 skeleton-shimmer relative overflow-hidden" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full skeleton-shimmer relative overflow-hidden" />
        <div className="h-3 bg-gray-100 rounded w-3/4 skeleton-shimmer relative overflow-hidden" />
      </div>
    </div>
  );

  return (
    <div className={cn("h-full flex flex-col bg-gray-50", className)}>
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Discovery
            </h2>
            <p className="text-sm text-gray-500">Sorted by {sortLabels[sortBy]}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Strategic Advantage Brief Button */}
            {(advantageBriefStatus === 'ready' || advantageBriefStatus === 'researching') && (
              <div className="relative" data-dropdown>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowBrief(!showBrief);
                    setSortDropdownOpen(false);
                    setFilterDropdownOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors",
                    showBrief && "bg-gray-50 border-gray-300"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Strategic Brief
                  {!showBrief && advantageBriefStatus === 'ready' && (
                    <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                </button>
              </div>
            )}
            
            {/* Sort Dropdown */}
            <div className="relative" data-dropdown>
              <button
                onClick={(e) => { e.stopPropagation(); setSortDropdownOpen(!sortDropdownOpen); setFilterDropdownOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                Sort
                <ChevronDown className="w-4 h-4" />
              </button>
              {sortDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  {(['score', 'name'] as SortOption[]).map(option => (
                    <button
                      key={option}
                      onClick={() => { setSortBy(option); setSortDropdownOpen(false); }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg",
                        sortBy === option ? "bg-gray-50 text-primary font-medium" : "text-gray-700"
                      )}
                    >
                      {sortLabels[option]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Filter Dropdown */}
            <div className="relative" data-dropdown>
              <button
                onClick={(e) => { e.stopPropagation(); setFilterDropdownOpen(!filterDropdownOpen); setSortDropdownOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filterDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 space-y-4">
                  {/* Score Range */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Riplace Score</p>
                    <div className="space-y-1">
                      {[
                        { value: 'all', label: 'All scores' },
                        { value: 'above80', label: '80+ (Hot)' },
                        { value: '60-80', label: '60-80 (Warm)' },
                        { value: 'below60', label: 'Below 60' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setFilters(prev => ({ ...prev, scoreRange: option.value as Filters['scoreRange'] }))}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded text-sm transition-colors",
                            filters.scoreRange === option.value
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="w-full text-center text-sm text-gray-500 hover:text-gray-700 pt-2 border-t border-gray-100"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prospects or type to add new..."
            className="pl-10 pr-10 h-10 bg-gray-50 border-gray-200 focus-visible:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
          )}
        </div>
        
        {/* Active Filters */}
        {(activeFilterCount > 0 || searchQuery) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <span className="text-sm text-gray-500">Active:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                Search: "{searchQuery.slice(0, 20)}{searchQuery.length > 20 ? '...' : ''}"
                <button onClick={() => setSearchQuery('')} className="hover:text-gray-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.scoreRange !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                Score: {filters.scoreRange === 'above80' ? '80+' : filters.scoreRange === '60-80' ? '60-80' : '<60'}
                <button onClick={() => clearFilter('scoreRange')} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-sm text-gray-500 hover:text-gray-700 ml-2">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Advantage Brief Content - shown when button is active */}
        {showBrief && advantageBrief && (
          <AdvantagesBrief brief={advantageBrief} sessionId={session?.id || null} />
        )}

        {/* Prospects List */}
        <div className="space-y-3">
          {/* Loading skeletons - show when discovery is starting or loading */}
          {(((isCreating || isLoading) && prospects.length === 0) || 
            (session && prospects.length === 0 && (isLoading || isPolling || progress < 100))) ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
              {/* Subtle loading message */}
              <div className="text-center pt-4 pb-2">
                <p className="text-sm text-gray-400">
                  Researching prospects... This may take a moment
                </p>
              </div>
            </div>
          ) : visibleProspects.length > 0 ? (
            <>
              {visibleProspects.map((prospect) => (
                <div 
                  key={prospect.prospectId}
                  ref={(el) => {
                    if (el) {
                      prospectCardRefs.current.set(prospect.prospectId, el);
                    } else {
                      prospectCardRefs.current.delete(prospect.prospectId);
                    }
                  }}
                >
                  <ProspectDossierCardMemo
                    prospect={prospect}
                    isExpanded={expandedProspectId === prospect.prospectId}
                    onToggle={() => handleProspectToggle(prospect, false)}
                    onGeneratePlan={() => handleGeneratePlan(prospect.prospectId, prospect.name)}
                    showGeneratePlan={!!user}
                  />
                </div>
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
            </>
          ) : deferredSearchQuery.trim().length > 2 ? (
            /* No results - show add prospect prompt */
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No prospects found</h3>
              <p className="text-sm text-gray-500 mb-4">
                Can't find "{deferredSearchQuery}"? Add it as a new prospect.
              </p>
              {user ? (
                <button
                  onClick={() => toast.info('Add prospect feature coming soon')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Add "{deferredSearchQuery}"
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">Sign up to add custom prospects</p>
                  <a
                    href="/auth"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                  >
                    Sign Up Free
                  </a>
                </div>
              )}
            </div>
          ) : null}
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