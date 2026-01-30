import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isAppSubdomain, redirectToMain } from '@/lib/domain';
import { supabase } from '@/integrations/supabase/client';

/**
 * Handles subdomain-aware routing and session transfer between domains.
 * 
 * This component MUST process session tokens before any redirect logic runs.
 * The key challenge is that React state updates (user from useAuth) happen
 * asynchronously after setSession() completes.
 */

// Check for session tokens in URL (synchronous check)
function hasSessionTokensInUrl(): boolean {
  const hash = window.location.hash;
  return hash.includes('type=session_transfer') && hash.includes('access_token=');
}

// Parse and consume session tokens from URL
function consumeSessionTokens(): { access_token: string; refresh_token: string } | null {
  const hash = window.location.hash;
  if (!hash || !hash.includes('type=session_transfer')) {
    return null;
  }

  const params = new URLSearchParams(hash.substring(1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (access_token && refresh_token) {
    // Clean up URL immediately
    window.history.replaceState(null, '', window.location.pathname);
    return { access_token, refresh_token };
  }

  return null;
}

export function SubdomainRedirect() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  // Track whether we've processed tokens
  const [tokensProcessed, setTokensProcessed] = useState(false);
  // Track whether session was set from tokens (and we should wait for user)
  const [waitingForUser, setWaitingForUser] = useState(false);
  // Track if we've already redirected
  const hasRedirected = useRef(false);
  const hasStarted = useRef(false);

  // Step 1: Process session tokens on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const processTokens = async () => {
      const tokens = consumeSessionTokens();

      if (tokens) {
        console.log('[SubdomainRedirect] Processing session tokens...');
        setWaitingForUser(true);

        try {
          const { error } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });

          if (error) {
            console.error('[SubdomainRedirect] setSession error:', error);
            setWaitingForUser(false);
            setTokensProcessed(true);
          } else {
            console.log('[SubdomainRedirect] Session set, waiting for user state...');
            // Don't set tokensProcessed yet - wait for user to appear
          }
        } catch (error) {
          console.error('[SubdomainRedirect] Error:', error);
          setWaitingForUser(false);
          setTokensProcessed(true);
        }
      }

      // If no tokens, we're ready immediately
      if (!tokens) {
        setTokensProcessed(true);
      }
    };

    processTokens();
  }, []);

  // Step 2: When waiting for user, mark as processed once user appears
  useEffect(() => {
    if (waitingForUser && user) {
      console.log('[SubdomainRedirect] User appeared:', user.email);
      setWaitingForUser(false);
      setTokensProcessed(true);
    }

    // Timeout: if user doesn't appear within 3 seconds, proceed anyway
    // (the session might have been invalid)
    if (waitingForUser) {
      const timeout = setTimeout(() => {
        console.log('[SubdomainRedirect] Timeout waiting for user');
        setWaitingForUser(false);
        setTokensProcessed(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [waitingForUser, user]);

  // Step 3: Apply redirect logic ONLY when ready
  useEffect(() => {
    // Block 1: Don't proceed until tokens are processed
    if (!tokensProcessed) {
      return;
    }

    // Block 2: Don't proceed while auth is still loading
    if (authLoading) {
      return;
    }

    // Block 3: Already redirected
    if (hasRedirected.current) {
      return;
    }

    // Block 4: Only apply on app subdomain
    if (!isAppSubdomain()) {
      sessionStorage.removeItem('riplacer_signing_out');
      return;
    }

    // Block 5: Don't redirect during sign out
    if (sessionStorage.getItem('riplacer_signing_out') === 'true') {
      return;
    }

    // Block 6: SAFETY - If there are still tokens in URL, don't redirect
    if (hasSessionTokensInUrl()) {
      console.log('[SubdomainRedirect] Tokens still in URL, skipping redirect');
      return;
    }

    // Finally: If no user and not on /auth, redirect to main auth
    if (!user && location.pathname !== '/auth') {
      console.log('[SubdomainRedirect] No user, redirecting to main /auth');
      hasRedirected.current = true;
      redirectToMain('/auth');
    }
  }, [tokensProcessed, authLoading, user, location.pathname]);

  return null;
}
