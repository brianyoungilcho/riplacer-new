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
}

export interface DiscoverySessionState {
  session: DiscoverySession | null;
  advantageBrief: AdvantageBrief | null;
  advantageBriefStatus: 'pending' | 'researching' | 'ready' | 'failed';
  prospects: DiscoveryProspect[];
  jobs: ResearchJob[];
  progress: number;
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

  // Create a new discovery session
  const createSession = useCallback(async (criteria: DiscoverySessionCriteria) => {
    setIsCreating(true);
    setError(null);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        throw new Error('Please sign in to use deep research');
      }

      const { data, error: fnError } = await supabase.functions.invoke('create-discovery-session', {
        body: criteria,
      });

      if (fnError) throw fnError;

      const newSession: DiscoverySession = {
        id: data.sessionId,
        status: data.status,
        createdAt: new Date().toISOString(),
        criteria,
      };

      setSessionState(prev => ({
        ...prev,
        session: newSession,
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
  }, []);

  // Fetch session state (polling endpoint)
  const fetchSession = useCallback(async (sessionId: string, processNextJob = true) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-discovery-session', {
        body: { sessionId, processNextJob },
      });

      if (fnError) throw fnError;

      setSessionState({
        session: data.session,
        advantageBrief: data.advantageBrief || null,
        advantageBriefStatus: data.advantageBriefStatus || 'pending',
        prospects: data.prospects || [],
        jobs: data.jobs || [],
        progress: data.progress || 0,
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

  // Discover prospects (v2)
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

  // Research competitive advantages
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

  // Generate account plan
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

  // Clear session state
  const clearSession = useCallback(() => {
    setSessionState({
      session: null,
      advantageBrief: null,
      advantageBriefStatus: 'pending',
      prospects: [],
      jobs: [],
      progress: 0,
    });
    setError(null);
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
