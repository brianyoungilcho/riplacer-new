import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DiscoverySessionState } from './useDiscoverySession';

interface UseDiscoveryPollingOptions {
  sessionId: string | null;
  enabled?: boolean;
  onUpdate?: (state: DiscoverySessionState) => void;
  onComplete?: () => void;
  fetchSession?: (sessionId: string, processNextJob?: boolean) => Promise<any>;
  useRealtime?: boolean;
}

// Adaptive polling intervals
const POLLING_INTERVALS = {
  ACTIVE: 3000,      // 3s when jobs are running
  EARLY: 5000,       // 5s in early stage
  LATE: 10000,       // 10s when mostly complete
  BACKGROUND: 30000, // 30s when tab is hidden
  REALTIME: 15000,   // 15s when using realtime
} as const;

function getAdaptiveInterval(
  progress: number,
  hasRunningJobs: boolean,
  isTabVisible: boolean,
  useRealtime: boolean
): number {
  if (useRealtime && isTabVisible) return POLLING_INTERVALS.REALTIME;
  if (!isTabVisible) return POLLING_INTERVALS.BACKGROUND;
  if (hasRunningJobs) return POLLING_INTERVALS.ACTIVE;
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
  
  // CRITICAL: Use refs for callbacks AND for poll function to avoid stale closures
  const onUpdateRef = useRef(onUpdate);
  const onCompleteRef = useRef(onComplete);
  const fetchSessionRef = useRef(fetchSession);
  const sessionIdRef = useRef(sessionId);
  const useRealtimeRef = useRef(useRealtime);

  // Update refs when values change
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onCompleteRef.current = onComplete;
    fetchSessionRef.current = fetchSession;
    sessionIdRef.current = sessionId;
    useRealtimeRef.current = useRealtime;
  }, [onUpdate, onComplete, fetchSession, sessionId, useRealtime]);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Schedule next poll - uses refs to always get current values
  const scheduleNextPoll = useCallback((progress: number, hasRunningJobs: boolean) => {
    if (isCompleteRef.current) return;
    
    const interval = getAdaptiveInterval(progress, hasRunningJobs, isTabVisibleRef.current, useRealtimeRef.current);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    console.log(`[Polling] Scheduling next poll in ${interval}ms (progress: ${progress}%, running: ${hasRunningJobs})`);
    
    timeoutRef.current = setTimeout(() => {
      // CRITICAL FIX: Call pollRef.current() instead of poll() to avoid stale closure
      pollRef.current();
    }, interval);
  }, []); // No dependencies - uses refs internally

  // The actual poll function
  const doPoll = useCallback(async () => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId || isCompleteRef.current) {
      console.log('[Polling] Skipping poll - no sessionId or complete');
      return;
    }

    console.log(`[Polling] Poll #${pollCount + 1} for session:`, currentSessionId);

    try {
      let data: any;
      const currentFetchSession = fetchSessionRef.current;
      
      if (currentFetchSession) {
        data = await currentFetchSession(currentSessionId, true);
        if (!data) {
          console.error('[Polling] fetchSession returned no data');
          scheduleNextPoll(lastStateRef.current.progress, true);
          return;
        }
      } else {
        const result = await supabase.functions.invoke('get-discovery-session', {
          body: { sessionId: currentSessionId, processNextJob: true },
        });
        
        if (result.error) {
          console.error('[Polling] Error:', result.error);
          scheduleNextPoll(lastStateRef.current.progress, true);
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

      // Check status
      const hasRunningJobs = state.jobs.some(j => j.status === 'queued' || j.status === 'running');
      const hasPendingDossiers = state.prospects.some(p => p.dossierStatus === 'queued' || p.dossierStatus === 'researching');
      
      lastStateRef.current = {
        progress: state.progress,
        hasRunningJobs: hasRunningJobs || hasPendingDossiers,
      };

      // Warm-up period: keep polling for at least 30 seconds after session start
      // This handles the race condition where jobs are created after the first poll
      const timeSinceStart = Date.now() - sessionStartTimeRef.current;
      const inWarmUpPeriod = timeSinceStart < 45000;

      // Completion check - only complete if we have jobs AND they're all done
      const hasJobs = state.jobs.length > 0;
      const allJobsComplete = hasJobs && state.jobs.every(j => j.status === 'complete' || j.status === 'failed');
      const allDossiersReady = state.prospects.length > 0 && state.prospects.every(p => p.dossierStatus === 'ready' || p.dossierStatus === 'failed');

      const isActuallyComplete = !inWarmUpPeriod && (
        state.progress >= 100 || 
        (allJobsComplete && allDossiersReady && state.prospects.length > 0)
      );

      console.log('[Polling] State:', {
        jobs: state.jobs.length,
        queued: state.jobs.filter(j => j.status === 'queued').length,
        running: state.jobs.filter(j => j.status === 'running').length,
        complete: state.jobs.filter(j => j.status === 'complete').length,
        pendingDossiers: state.prospects.filter(p => p.dossierStatus === 'queued' || p.dossierStatus === 'researching').length,
        warmUp: inWarmUpPeriod,
        timeSinceStart: Math.round(timeSinceStart / 1000) + 's',
      });

      if (isActuallyComplete) {
        console.log('[Polling] Research complete!');
        isCompleteRef.current = true;
        setIsPolling(false);
        onCompleteRef.current?.();
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
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
      console.error('[Polling] Failed:', err);
      scheduleNextPoll(lastStateRef.current.progress, true);
    }
  }, [scheduleNextPoll, pollCount]);

  // CRITICAL: Store poll in a ref so scheduleNextPoll always calls the latest version
  const pollRef = useRef(doPoll);
  useEffect(() => {
    pollRef.current = doPoll;
  }, [doPoll]);

  // Expose poll as a stable callback
  const poll = useCallback(() => {
    pollRef.current();
  }, []);

  // Setup realtime subscription - listen for BOTH updates AND inserts
  useEffect(() => {
    if (!useRealtime || !sessionId || !enabled) return;

    console.log('[Realtime] Setting up subscription for session:', sessionId);

    const channel = supabase
      .channel(`discovery-${sessionId}`)
      // Listen for dossier updates
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
          poll();
        }
      )
      // Listen for job updates
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
          poll();
        }
      )
      // CRITICAL: Listen for job INSERTS to catch newly created jobs
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'research_jobs',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[Realtime] New job inserted:', payload.new);
          // Immediate poll when new jobs are created
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

  // Start polling when enabled
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
    sessionStartTimeRef.current = Date.now();
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
    sessionStartTimeRef.current = Date.now();
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
