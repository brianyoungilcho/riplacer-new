import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DiscoverySessionState } from './useDiscoverySession';

interface UseDiscoveryPollingOptions {
  sessionId: string | null;
  enabled?: boolean;
  /**
   * Called with the latest session state from the server.
   * Use this to update your local state.
   */
  onUpdate?: (state: DiscoverySessionState) => void;
  onComplete?: () => void;
  /**
   * Optional: pass fetchSession from useDiscoverySession to update state directly.
   * If provided, this will be called instead of fetching via supabase.functions.invoke.
   */
  fetchSession?: (sessionId: string, processNextJob?: boolean) => Promise<any>;
  /**
   * Enable realtime subscriptions for more responsive updates.
   * Falls back to polling if realtime is not available.
   */
  useRealtime?: boolean;
}

// Adaptive polling intervals based on activity state
const POLLING_INTERVALS = {
  ACTIVE: 3000,      // 3s when jobs are running - user is actively waiting
  EARLY: 5000,       // 5s in early stage (< 50% progress)
  LATE: 10000,       // 10s when mostly complete (50-99%)
  BACKGROUND: 30000, // 30s when tab is hidden
  REALTIME: 15000,   // 15s when using realtime (as fallback/refresh)
} as const;

// Calculate optimal polling interval based on current state
function getAdaptiveInterval(
  progress: number,
  hasRunningJobs: boolean,
  isTabVisible: boolean,
  useRealtime: boolean
): number {
  // When using realtime, poll less frequently (just for sync/refresh)
  if (useRealtime && isTabVisible) return POLLING_INTERVALS.REALTIME;
  
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
  fetchSession,
  useRealtime = false,
}: UseDiscoveryPollingOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCompleteRef = useRef(false);
  const isTabVisibleRef = useRef(true);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
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
    
    const interval = getAdaptiveInterval(progress, hasRunningJobs, isTabVisibleRef.current, useRealtime);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      poll();
    }, interval);
  }, [useRealtime]);

  const poll = useCallback(async () => {
    if (!sessionId || isCompleteRef.current) return;

    try {
      let data: any;
      
      // Use fetchSession if provided (updates state directly in useDiscoverySession)
      if (fetchSession) {
        data = await fetchSession(sessionId, true);
        if (!data) {
          console.error('Polling: fetchSession returned no data');
          scheduleNextPoll(lastStateRef.current.progress, false);
          return;
        }
      } else {
        // Fallback: call edge function directly
        const result = await supabase.functions.invoke('get-discovery-session', {
          body: { sessionId, processNextJob: true },
        });
        
        if (result.error) {
          console.error('Polling error:', result.error);
          scheduleNextPoll(lastStateRef.current.progress, false);
          return;
        }
        data = result.data;
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

      // Check if any jobs are still running OR pending
      const hasRunningJobs = state.jobs.some(
        j => j.status === 'queued' || j.status === 'running'
      );
      
      // Check if any dossiers are still pending research
      const hasPendingDossiers = state.prospects.some(
        p => p.dossierStatus === 'queued' || p.dossierStatus === 'researching'
      );
      
      // Update state refs for next interval calculation
      lastStateRef.current = {
        progress: state.progress,
        hasRunningJobs: hasRunningJobs || hasPendingDossiers,
      };

      // Warm-up period: keep polling for at least 30 seconds after session start
      // This handles the race condition where jobs are created after the first poll
      const timeSinceStart = Date.now() - sessionStartTimeRef.current;
      const inWarmUpPeriod = timeSinceStart < 30000; // 30 seconds

      // Check if all research is complete
      // IMPORTANT: Only consider complete if we have jobs AND they're all done
      // Empty jobs array does NOT mean complete (jobs may not be created yet)
      const hasJobs = state.jobs.length > 0;
      const allJobsComplete = hasJobs && state.jobs.every(
        j => j.status === 'complete' || j.status === 'failed'
      );
      const allDossiersReady = state.prospects.length > 0 && state.prospects.every(
        p => p.dossierStatus === 'ready' || p.dossierStatus === 'failed'
      );

      // Only mark as complete if:
      // 1. We're past the warm-up period AND
      // 2. Either progress is 100% OR (all jobs done AND all dossiers ready)
      const isActuallyComplete = !inWarmUpPeriod && (
        state.progress >= 100 || 
        (allJobsComplete && allDossiersReady && state.prospects.length > 0)
      );

      if (isActuallyComplete) {
        console.log('[Polling] Research complete:', { 
          progress: state.progress, 
          jobsCount: state.jobs.length,
          allJobsComplete, 
          allDossiersReady,
          timeSinceStart: Math.round(timeSinceStart / 1000) + 's'
        });
        isCompleteRef.current = true;
        setIsPolling(false);
        onCompleteRef.current?.();
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // Cleanup realtime channel
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
        }
      } else {
        // Schedule next poll with adaptive interval
        // If in warm-up or has pending work, poll more frequently
        const effectiveHasRunning = hasRunningJobs || hasPendingDossiers || inWarmUpPeriod;
        scheduleNextPoll(state.progress, effectiveHasRunning);
      }
    } catch (err) {
      console.error('Polling failed:', err);
      // On error, schedule retry
      scheduleNextPoll(lastStateRef.current.progress, false);
    }
  }, [sessionId, scheduleNextPoll, fetchSession]);

  // Setup realtime subscription for faster updates
  useEffect(() => {
    if (!useRealtime || !sessionId || !enabled) return;

    console.log('[Realtime] Setting up subscription for session:', sessionId);

    const channel = supabase
      .channel(`discovery-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prospect_dossiers',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[Realtime] Dossier updated:', payload.new);
          // Trigger immediate poll to refresh state
          poll();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'research_jobs',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[Realtime] Job updated:', payload.new);
          // Trigger immediate poll to refresh state
          poll();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('[Realtime] Cleaning up subscription');
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [useRealtime, sessionId, enabled, poll]);

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
    sessionStartTimeRef.current = Date.now(); // Reset warm-up timer
    lastStateRef.current = { progress: 0, hasRunningJobs: true };

    console.log('[Polling] Starting polling for session:', sessionId);

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
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
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
