import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DiscoverySessionCriteria {
  productDescription: string;
  territory: {
    states: string[];
    cities?: string[];
    customDescription?: string;
    isCustomTerritory?: boolean;
  };
  targetCategories: string[];
  competitors: string[];
  companyDomain?: string;
}

export interface DiscoveryProspect {
  prospectId: string;
  name: string;
  state?: string;
  lat?: number;
  lng?: number;
  initialScore?: number;
  score?: number;
  angles?: string[];
  researchStatus: 'queued' | 'researching' | 'ready' | 'failed';
  dossierStatus?: 'queued' | 'researching' | 'ready' | 'failed';
  dossierLastUpdated?: string;
  dossier?: ProspectDossier;
}

export interface ProspectDossier {
  summary: string;
  score: number;
  anglesForList?: string[];
  incumbent?: {
    vendor?: string;
    confidence: number;
    citations: Citation[];
  };
  contract?: {
    estimatedAnnualValue?: string;
    estimatedExpiration?: string;
    contractNotes?: string;
    citations: Citation[];
  };
  stakeholders?: Stakeholder[];
  macroSignals?: MacroSignal[];
  recommendedAngles?: RecommendedAngle[];
  sources?: Citation[];
  lastUpdated: string;
}

export interface Citation {
  url: string;
  title?: string;
  excerpt?: string;
  publishedDate?: string;
}

export interface Stakeholder {
  name?: string;
  title?: string;
  stance: 'supporter' | 'opponent' | 'neutral' | 'unknown';
  confidence: number;
  citations: Citation[];
}

export interface MacroSignal {
  type: 'budget' | 'leadership' | 'election' | 'public_sentiment' | 'audit' | 'rfp' | 'other';
  description: string;
  confidence: number;
  citations: Citation[];
}

export interface RecommendedAngle {
  title: string;
  message: string;
  mappedAdvantageTitles: string[];
  confidence: number;
  citations: Citation[];
}

export interface AdvantageBrief {
  positioningSummary: string;
  advantages: Advantage[];
  lastUpdated: string;
}

export interface Advantage {
  title: string;
  whyItMattersToBuyer: string;
  competitorComparisons: CompetitorComparison[];
  talkTrackBullets: string[];
  objectionsAndResponses: { objection: string; response: string }[];
}

export interface CompetitorComparison {
  competitor: string;
  claim: string;
  confidence: number;
  citations: Citation[];
}

export interface ResearchJob {
  id: string;
  type: string;
  prospectKey?: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  progress?: number;
  error?: string;
}

export interface DiscoverySession {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  criteria?: DiscoverySessionCriteria;
  isAnonymous?: boolean;
}

export interface DiscoverySessionState {
  session: DiscoverySession | null;
  advantageBrief: AdvantageBrief | null;
  advantageBriefStatus: 'pending' | 'researching' | 'ready' | 'failed';
  prospects: DiscoveryProspect[];
  jobs: ResearchJob[];
  progress: number;
}

// Shallow comparison helper to prevent unnecessary state updates
function isStateEqual(prev: DiscoverySessionState, next: DiscoverySessionState): boolean {
  // Fast path - if basic properties differ, definitely not equal
  if (
    prev.session?.id !== next.session?.id ||
    prev.advantageBriefStatus !== next.advantageBriefStatus ||
    prev.progress !== next.progress ||
    prev.prospects.length !== next.prospects.length ||
    prev.jobs.length !== next.jobs.length
  ) {
    return false;
  }

  // Compare prospects including dossier status AND whether dossier has content
  // This ensures we update when dossier data arrives (even if status doesn't change)
  const prevProspectState = prev.prospects.map(p => ({
    id: p.prospectId,
    status: p.dossierStatus,
    hasDossier: !!p.dossier,
    dossierSummary: p.dossier?.summary?.slice(0, 50), // Include part of summary to detect changes
    score: p.dossier?.score,
  }));
  
  const nextProspectState = next.prospects.map(p => ({
    id: p.prospectId,
    status: p.dossierStatus,
    hasDossier: !!p.dossier,
    dossierSummary: p.dossier?.summary?.slice(0, 50),
    score: p.dossier?.score,
  }));

  return JSON.stringify(prevProspectState) === JSON.stringify(nextProspectState);
}

export function useDiscoverySession() {
  const [sessionState, setSessionState] = useState<DiscoverySessionState>({
    session: null,
    advantageBrief: null,
    advantageBriefStatus: 'pending',
    prospects: [],
    jobs: [],
    progress: 0,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch session state (polling endpoint) - defined first so restoreSession can use it
  const fetchSession = useCallback(async (sessionId: string, processNextJob = true) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-discovery-session', {
        body: { sessionId, processNextJob },
      });

      if (fnError) throw fnError;

      const newState: DiscoverySessionState = {
        session: data.session,
        advantageBrief: data.advantageBrief || null,
        advantageBriefStatus: data.advantageBriefStatus || 'pending',
        prospects: data.prospects || [],
        jobs: data.jobs || [],
        progress: data.progress || 0,
      };

      // Only update state if data actually changed (shallow comparison)
      setSessionState(prev => {
        if (isStateEqual(prev, newState)) {
          return prev; // Return previous state to prevent re-render
        }
        return newState;
      });

      return data;
    } catch (err: any) {
      const message = err.message || 'Failed to fetch session';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a hash of criteria for localStorage key
  const getCriteriaHash = useCallback((criteria: DiscoverySessionCriteria): string => {
    return JSON.stringify({
      productDescription: criteria.productDescription,
      states: criteria.territory?.states?.sort(),
      categories: criteria.targetCategories?.sort(),
      competitors: criteria.competitors?.sort(),
      companyDomain: criteria.companyDomain,
    });
  }, []);

  // Restore session from localStorage if criteria matches
  const restoreSession = useCallback(async (criteria: DiscoverySessionCriteria): Promise<string | null> => {
    try {
      const criteriaHash = getCriteriaHash(criteria);
      const saved = localStorage.getItem(`riplacer_discovery_session_${criteriaHash}`);
      
      if (!saved) return null;

      const { sessionId, timestamp } = JSON.parse(saved);
      
      // Check if session is less than 7 days old
      const sessionAge = Date.now() - timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (sessionAge > maxAge) {
        localStorage.removeItem(`riplacer_discovery_session_${criteriaHash}`);
        return null;
      }

      // Try to fetch the session to verify it still exists
      const sessionData = await fetchSession(sessionId, false);
      if (sessionData) {
        return sessionId;
      } else {
        // Session doesn't exist, remove from localStorage
        localStorage.removeItem(`riplacer_discovery_session_${criteriaHash}`);
        return null;
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      return null;
    }
  }, [getCriteriaHash, fetchSession]);

  // Create a new discovery session (works for both auth and anon users)
  const createSession = useCallback(async (criteria: DiscoverySessionCriteria) => {
    setIsCreating(true);
    setError(null);

    try {
      // First try to restore existing session
      const restoredSessionId = await restoreSession(criteria);
      if (restoredSessionId) {
        console.log('Restored existing session:', restoredSessionId);
        return restoredSessionId;
      }

      // Create new session if none found
      const { data, error: fnError } = await supabase.functions.invoke('create-discovery-session', {
        body: criteria,
      });

      if (fnError) throw fnError;

      const newSession: DiscoverySession = {
        id: data.sessionId,
        status: data.status,
        createdAt: new Date().toISOString(),
        criteria,
        isAnonymous: data.isAnonymous,
      };

      setSessionState(prev => ({
        ...prev,
        session: newSession,
      }));

      // Save session ID to localStorage
      const criteriaHash = getCriteriaHash(criteria);
      localStorage.setItem(`riplacer_discovery_session_${criteriaHash}`, JSON.stringify({
        sessionId: data.sessionId,
        timestamp: Date.now(),
      }));

      return data.sessionId;
    } catch (err: any) {
      const message = err.message || 'Failed to create session';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [restoreSession, getCriteriaHash]);

  // Discover prospects (v2) - works for both auth and anon
  const discoverProspects = useCallback(async (sessionId: string, criteria: DiscoverySessionCriteria, limit = 8) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('discover-prospects-v2', {
        body: {
          sessionId,
          productDescription: criteria.productDescription,
          territory: criteria.territory,
          targetCategories: criteria.targetCategories,
          competitors: criteria.competitors,
          limit,
        },
      });

      if (fnError) throw fnError;

      setSessionState(prev => ({
        ...prev,
        prospects: data.prospects || [],
        jobs: [...prev.jobs, ...(data.jobs || [])],
      }));

      return data;
    } catch (err: any) {
      const message = err.message || 'Failed to discover prospects';
      setError(message);
      toast.error(message);
      return null;
    }
  }, []);

  // Research competitive advantages - works for both auth and anon
  const researchAdvantages = useCallback(async (sessionId: string, criteria: DiscoverySessionCriteria) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('research-competitive-advantages', {
        body: {
          sessionId,
          productDescription: criteria.productDescription,
          targetCategories: criteria.targetCategories,
          competitors: criteria.competitors,
          companyDomain: criteria.companyDomain,
        },
      });

      if (fnError) throw fnError;

      setSessionState(prev => ({
        ...prev,
        advantageBrief: data.brief,
        advantageBriefStatus: 'ready',
      }));

      return data.brief;
    } catch (err: any) {
      const message = err.message || 'Failed to research advantages';
      setError(message);
      toast.error(message);
      return null;
    }
  }, []);

  // Generate account plan (requires auth)
  const generateAccountPlan = useCallback(async (sessionId: string, prospectId: string, repNotes?: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-account-plan', {
        body: { sessionId, prospectId, repNotes },
      });

      if (fnError) throw fnError;

      return data.plan;
    } catch (err: any) {
      const message = err.message || 'Failed to generate account plan';
      toast.error(message);
      return null;
    }
  }, []);

  // Clear session state (only in-memory, keeps localStorage for restoration)
  const clearSession = useCallback((clearLocalStorage = false) => {
    setSessionState({
      session: null,
      advantageBrief: null,
      advantageBriefStatus: 'pending',
      prospects: [],
      jobs: [],
      progress: 0,
    });
    setError(null);
    
    // Only clear localStorage if explicitly requested
    if (clearLocalStorage) {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('riplacer_discovery_session_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (err) {
        console.error('Failed to clear localStorage sessions:', err);
      }
    }
  }, []);

  return {
    ...sessionState,
    isCreating,
    isLoading,
    error,
    createSession,
    fetchSession,
    discoverProspects,
    researchAdvantages,
    generateAccountPlan,
    clearSession,
  };
}