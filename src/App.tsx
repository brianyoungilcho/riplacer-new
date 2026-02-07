import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Eagerly load the landing page (most common entry point)
import Index from "./pages/Index";

// Lazy load all other routes for better initial bundle size
const Login = lazy(() => import("./pages/Login"));
const OnboardingV2 = lazy(() => import("./pages/OnboardingV2"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const ReportDashboard = lazy(() => import("./pages/app/ReportDashboard"));
const ReportInbox = lazy(() => import("./pages/app/ReportInbox"));
const ReportDetail = lazy(() => import("./pages/app/ReportDetail"));
const SellerProfile = lazy(() => import("./pages/app/SellerProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const AcceptableUsePolicy = lazy(() => import("./pages/AcceptableUsePolicy"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Pricing = lazy(() => import("./pages/Pricing"));
const VerificationPending = lazy(() => import("./pages/VerificationPending"));

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
 * Single-domain routing:
 * - "/" → Landing page
 * - "/start" → Onboarding
 * - "/thank-you" → Post-onboarding
 * - "/app" → Dashboard
 * - "/login" → Login page
 */
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                <Route path="/" element={<Index />} />

                {/* Auth - works on both domains */}
                <Route path="/login" element={<Login />} />

                <Route path="/start" element={<OnboardingV2 />} />
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/cookies" element={<CookiePolicy />} />
                <Route path="/acceptable-use" element={<AcceptableUsePolicy />} />
                <Route path="/disclaimer" element={<Disclaimer />} />
                <Route path="/refund" element={<RefundPolicy />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/verification-pending" element={<VerificationPending />} />

                <Route path="/app" element={<ReportDashboard />}>
                  <Route index element={<ReportInbox />} />
                  <Route path="report/:requestId" element={<ReportDetail />} />
                  <Route path="profile" element={<SellerProfile />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
