import { useNavigate } from 'react-router-dom';
import { OnboardingV2 } from '@/components/onboarding/OnboardingV2';

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <OnboardingV2 
      onComplete={() => {
        navigate('/discover');
      }} 
    />
  );
}

