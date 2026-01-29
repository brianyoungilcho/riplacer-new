import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubdomainRedirect } from "@/components/SubdomainRedirect";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Loader2 } from "lucide-react";
import { isAppSubdomain } from "@/lib/domain";

// Eagerly load the landing page (most common entry point)
import Index from "./pages/Index";

// Lazy load all other routes for better initial bundle size
const Auth = lazy(() => import("./pages/Auth"));
const OnboardingV2 = lazy(() => import("./pages/OnboardingV2"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const AcceptableUsePolicy = lazy(() => import("./pages/AcceptableUsePolicy"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Pricing = lazy(() => import("./pages/Pricing"));

const queryClient = new QueryClient();

// Loading fallback for lazy routes
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
);

/**
 * App routes configuration
 * 
 * On app.riplacer.com:
 * - "/" → Dashboard (the main app experience)
 * - "/auth" → Auth page (for direct auth on app subdomain)
 * 
 * On riplacer.com:
 * - "/" → Landing page
 * - "/start" → Onboarding
 * - "/app" → Dashboard (legacy route, still works)
 * - "/auth" → Auth page
 */
const App = () => {
  // Determine if we're on the app subdomain
  const onAppSubdomain = isAppSubdomain();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SubdomainRedirect />
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Root route: Dashboard on app subdomain, Landing page on main domain */}
                <Route path="/" element={onAppSubdomain ? <Dashboard /> : <Index />} />

                {/* Auth - works on both domains */}
                <Route path="/auth" element={<Auth />} />

                {/* Main domain only routes (marketing, onboarding) */}
                {!onAppSubdomain && (
                  <>
                    <Route path="/start" element={<OnboardingV2 />} />
                    <Route path="/thank-you" element={<ThankYou />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/cookies" element={<CookiePolicy />} />
                    <Route path="/acceptable-use" element={<AcceptableUsePolicy />} />
                    <Route path="/disclaimer" element={<Disclaimer />} />
                    <Route path="/refund" element={<RefundPolicy />} />
                    <Route path="/pricing" element={<Pricing />} />
                  </>
                )}

                {/* Legacy /app route - works on both domains for backwards compatibility */}
                <Route path="/app" element={<Dashboard />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
