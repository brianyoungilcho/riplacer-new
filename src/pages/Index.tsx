import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile?.onboarding_complete) {
      navigate('/discover');
    }
  }, [profile, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="fixed inset-0 gradient-glow pointer-events-none" />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  if (!profile?.onboarding_complete) {
    return (
      <OnboardingFlow 
        onComplete={() => {
          refetch();
          navigate('/discover');
        }} 
      />
    );
  }

  return null; // Will redirect to discover
}
