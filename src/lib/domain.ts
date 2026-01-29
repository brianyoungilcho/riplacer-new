/**
 * Domain utilities for handling cross-subdomain navigation and auth
 */

// Domain detection
export const isAppSubdomain = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'app.riplacer.com' || hostname === 'app.localhost';
};

export const isMainDomain = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'riplacer.com' || 
         hostname === 'www.riplacer.com' || 
         hostname === 'localhost' ||
         // Local dev without subdomain
         (hostname !== 'app.localhost' && hostname.includes('localhost'));
};

// Get the appropriate base URLs
export const getAppUrl = (): string => {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === 'app.localhost') {
    return `http://app.localhost:${window.location.port}`;
  }
  
  // Production
  return 'https://app.riplacer.com';
};

export const getMainUrl = (): string => {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === 'app.localhost') {
    return `http://localhost:${window.location.port}`;
  }
  
  // Production
  return 'https://riplacer.com';
};

/**
 * Redirect to app subdomain with optional session transfer
 * @param path - The path to navigate to on the app subdomain (default: '/')
 * @param sessionTokens - Optional session tokens to transfer
 */
export const redirectToApp = (
  path: string = '/',
  sessionTokens?: { access_token: string; refresh_token: string }
): void => {
  const appUrl = getAppUrl();
  let url = `${appUrl}${path}`;
  
  if (sessionTokens) {
    // Add session tokens as URL hash (more secure than query params, not sent to server)
    const params = new URLSearchParams({
      access_token: sessionTokens.access_token,
      refresh_token: sessionTokens.refresh_token,
      type: 'session_transfer',
    });
    url = `${url}#${params.toString()}`;
  }
  
  window.location.href = url;
};

/**
 * Redirect to main domain (for auth, marketing, etc.)
 * @param path - The path to navigate to on the main domain
 */
export const redirectToMain = (path: string = '/'): void => {
  const mainUrl = getMainUrl();
  window.location.href = `${mainUrl}${path}`;
};

/**
 * Parse session tokens from URL hash (for receiving transferred sessions)
 */
export const parseSessionFromUrl = (): { 
  access_token: string; 
  refresh_token: string 
} | null => {
  const hash = window.location.hash;
  if (!hash || !hash.includes('type=session_transfer')) {
    return null;
  }
  
  const params = new URLSearchParams(hash.substring(1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  
  if (access_token && refresh_token) {
    // Clean up URL after parsing
    window.history.replaceState(null, '', window.location.pathname);
    return { access_token, refresh_token };
  }
  
  return null;
};
