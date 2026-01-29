import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isAppSubdomain, redirectToMain, parseSessionFromUrl } from '@/lib/domain';
import { supabase } from '@/integrations/supabase/client';

/**
 * Handles subdomain-aware routing and session transfer between domains
 * 
 * On app.riplacer.com:
 * - Receives and processes transferred sessions from main domain
 * - Redirects unauthenticated users to riplacer.com/auth
 * 
 * On riplacer.com:
 * - Normal routing (no special handling needed)
 */
export function SubdomainRedirect() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [sessionProcessed, setSessionProcessed] = useState(false);

  // Handle incoming session transfer (runs once on mount)
  useEffect(() => {
    const handleSessionTransfer = async () => {
      const sessionTokens = parseSessionFromUrl();
      
      if (sessionTokens) {
        try {
          // Set the session from transferred tokens
          await supabase.auth.setSession({
            access_token: sessionTokens.access_token,
            refresh_token: sessionTokens.refresh_token,
          });
        } catch (error) {
          console.error('Failed to restore session:', error);
        }
      }
      
      setSessionProcessed(true);
    };

    handleSessionTransfer();
  }, []);

  // Handle auth redirects on app subdomain
  useEffect(() => {
    // Wait for session processing and auth loading to complete
    if (!sessionProcessed || loading) {
      return;
    }

    // Only apply redirect logic on app subdomain
    if (!isAppSubdomain()) {
      // On main domain, clear sign-out flag if present
      sessionStorage.removeItem('riplacer_signing_out');
      return;
    }

    // Don't redirect if we're in the process of signing out
    // (This prevents a race condition where signOut triggers redirect before navigation completes)
    if (sessionStorage.getItem('riplacer_signing_out') === 'true') {
      return;
    }

    // If on app subdomain and not authenticated, redirect to main domain auth
    // Exception: allow /auth route on app subdomain for direct auth
    if (!user && location.pathname !== '/auth') {
      redirectToMain('/auth');
    }
  }, [user, loading, location.pathname, sessionProcessed]);

  return null;
}
