import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function SubdomainRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hostname = window.location.hostname;
    const isAppSubdomain = hostname === 'app.riplacer.com' || hostname === 'app.localhost';
    const isOnAppRoute = location.pathname.startsWith('/app');

    // If on app subdomain but not on /app route, redirect to /app
    if (isAppSubdomain && !isOnAppRoute) {
      navigate('/app', { replace: true });
    }
  }, [navigate, location.pathname]);

  return null;
}
