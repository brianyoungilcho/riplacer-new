import { Navigate, Outlet, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Input } from "@/components/ui/input";
import { Search, Zap } from "lucide-react";
import SellerProfile from "@/pages/app/SellerProfile";


export default function ReportDashboard() {
  const { user, loading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileUpdatedAt = profile?.updated_at || profile?.created_at;
  const isProfileStale = !profileUpdatedAt
    || Date.now() - new Date(profileUpdatedAt).getTime() > 1000 * 60 * 60 * 24 * 30;
  const emailLabel = user?.email ? user.email.split("@")[0] : "Account";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-14">
            {/* Logo and brand */}
            <Link to="/app" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg tracking-tight text-gray-900">Riplacer</span>
            </Link>

            {/* Search */}
            <div className="flex-1">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search accounts or report summaries"
                  className="pl-9 bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
            </div>

            {/* Profile pill */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-full"
            >
              <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white text-gray-700 text-sm font-semibold border border-gray-200">
                {user?.email?.charAt(0).toUpperCase()}
                {!profileLoading && isProfileStale && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" />
                )}
              </span>
              <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
                {emailLabel}
              </span>
              <span className="sr-only">Open profile</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Outlet context={{ searchQuery }} />
      </main>

      <SellerProfile
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
