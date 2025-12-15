import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DiscoverySessionState } from './useDiscoverySession';

interface UseDiscoveryPollingOptions {
  sessionId: string | null;
  enabled?: boolean;
  onUpdate?: (state: DiscoverySessionState) => void;
  onComplete?: () => void;
}

// Adaptive polling intervals based on activity state
const POLLING_INTERVALS = {
  ACTIVE: 2000,      // 2s when jobs are running - user is actively waiting
  EARLY: 4000,       // 4s in early stage (< 50% progress)
  LATE: 8000,        // 8s when mostly complete (50-99%)
  BACKGROUND: 30000, // 30s when tab is hidden
} as const;

// Calculate optimal polling interval based on current state
function getAdaptiveInterval(
  progress: number,
  hasRunningJobs: boolean,
  isTabVisible: boolean
): number {
  // When tab is hidden, poll very slowly to save resources
  if (!isTabVisible) return POLLING_INTERVALS.BACKGROUND;
  
  // When jobs are actively running, poll frequently
  if (hasRunningJobs) return POLLING_INTERVALS.ACTIVE;
  
  // Scale based on progress
  if (progress < 50) return POLLING_INTERVALS.EARLY;
  return POLLING_INTERVALS.LATE;
}

export function useDiscoveryPolling({
  sessionId,
  enabled = true,
  onUpdate,
  onComplete,
}: UseDiscoveryPollingOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCompleteRef = useRef(false);
  const isTabVisibleRef = useRef(true);
  const lastStateRef = useRef<{ progress: number; hasRunningJobs: boolean }>({
    progress: 0,
    hasRunningJobs: true,
  });
  
  // Use refs for callbacks to prevent unnecessary recreation
  const onUpdateRef = useRef(onUpdate);
  const onCompleteRef = useRef(onComplete);

  // Update refs when callbacks change
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onCompleteRef.current = onComplete;
  }, [onUpdate, onComplete]);

  // Track tab visibility for adaptive polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const scheduleNextPoll = useCallback((progress: number, hasRunningJobs: boolean) => {
    if (isCompleteRef.current) return;
    
    const interval = getAdaptiveInterval(progress, hasRunningJobs, isTabVisibleRef.current);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      poll();
    }, interval);
  }, []);

  const poll = useCallback(async () => {
    if (!sessionId || isCompleteRef.current) return;

    try {
      // Process next queued job on each poll to ensure all jobs get executed
      const { data, error } = await supabase.functions.invoke('get-discovery-session', {
        body: { sessionId, processNextJob: true },
      });

      if (error) {
        console.error('Polling error:', error);
        // On error, schedule retry with backoff
        scheduleNextPoll(lastStateRef.current.progress, false);
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

      onUpdateRef.current?.(state);

      // Check if any jobs are still running
      const hasRunningJobs = state.jobs.some(
        j => j.status === 'queued' || j.status === 'running'
      );
      
      // Update state refs for next interval calculation
      lastStateRef.current = {
        progress: state.progress,
        hasRunningJobs,
      };

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
        onCompleteRef.current?.();
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        // Schedule next poll with adaptive interval
        scheduleNextPoll(state.progress, hasRunningJobs);
      }
    } catch (err) {
      console.error('Polling failed:', err);
      // On error, schedule retry
      scheduleNextPoll(lastStateRef.current.progress, false);
    }
  }, [sessionId, scheduleNextPoll]);

  // Start polling when enabled and sessionId is set
  useEffect(() => {
    if (!enabled || !sessionId) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPolling(false);
      return;
    }

    isCompleteRef.current = false;
    setIsPolling(true);
    setPollCount(0);
    lastStateRef.current = { progress: 0, hasRunningJobs: true };

    // Initial poll immediately
    poll();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, sessionId, poll]);

  const stopPolling = useCallback(() => {
    isCompleteRef.current = true;
    setIsPolling(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const restartPolling = useCallback(() => {
    isCompleteRef.current = false;
    setIsPolling(true);
    setPollCount(0);
    lastStateRef.current = { progress: 0, hasRunningJobs: true };
    poll();
  }, [poll]);

  return {
    isPolling,
    pollCount,
    stopPolling,
    restartPolling,
  };
}
