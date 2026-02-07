import { Location } from 'react-router-dom';

export function getReturnPath(location: Location): string {
  // Check URL state first (passed via navigate)
  const fromState = (location.state as { from?: string })?.from;
  if (fromState === '/start') {
    return fromState;
  }

  // Check if there's onboarding progress in localStorage
  const onboardingProgress = localStorage.getItem('riplacer_onboarding_progress');
  if (onboardingProgress) {
    try {
      const parsed = JSON.parse(onboardingProgress);
      if (parsed.step && parsed.step > 1) {
        return '/start';
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  return '/app';
}