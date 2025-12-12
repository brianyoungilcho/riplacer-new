import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DiscoverySessionState } from './useDiscoverySession';

interface UseDiscoveryPollingOptions {
  sessionId: string | null;
  enabled?: boolean;
  intervalMs?: number;
  onUpdate?: (state: DiscoverySessionState) => void;
  onComplete?: () => void;
}

export function useDiscoveryPolling({
  sessionId,
  enabled = true,
  intervalMs = 3000,
  onUpdate,
  onComplete,
}: UseDiscoveryPollingOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCompleteRef = useRef(false);

  const poll = useCallback(async () => {
    if (!sessionId || isCompleteRef.current) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-discovery-session', {
        body: { sessionId, processNextJob: true },
      });

      if (error) {
        console.error('Polling error:', error);
        return;
      }

      setPollCount(prev => prev + 1);

      const state: DiscoverySessionState = {
        session: data.session,
        advantageBrief: data.advantageBrief || null,
        advantageBriefStatus: data.advantageBriefStatus || 'pending',
        prospects: data.prospects || [],
        jobs: data.jobs || [],
        progress: data.progress || 0,
      };

      onUpdate?.(state);

      // Check if all research is complete
      const allJobsComplete = state.jobs.every(
        j => j.status === 'complete' || j.status === 'failed'
      );
      const allDossiersReady = state.prospects.every(
        p => p.dossierStatus === 'ready' || p.dossierStatus === 'failed'
      );

      if (state.progress >= 100 || (allJobsComplete && allDossiersReady && state.prospects.length > 0)) {
        isCompleteRef.current = true;
        setIsPolling(false);
        onComplete?.();
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      console.error('Polling failed:', err);
    }
  }, [sessionId, onUpdate, onComplete]);

  // Start polling when enabled and sessionId is set
  useEffect(() => {
    if (!enabled || !sessionId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
      return;
    }

    isCompleteRef.current = false;
    setIsPolling(true);
    setPollCount(0);

    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, sessionId, intervalMs, poll]);

  const stopPolling = useCallback(() => {
    isCompleteRef.current = true;
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const restartPolling = useCallback(() => {
    isCompleteRef.current = false;
    setIsPolling(true);
    setPollCount(0);
    poll();
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(poll, intervalMs);
  }, [poll, intervalMs]);

  return {
    isPolling,
    pollCount,
    stopPolling,
    restartPolling,
  };
}
