import { useState } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface StepAdditionalContextProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepAdditionalContext({ data, updateData, onNext, onBack }: StepAdditionalContextProps) {
  const [context, setContext] = useState(data.additionalContext || '');

  const handleContinue = () => {
    const trimmed = context.trim();
    updateData({ additionalContext: trimmed.length > 0 ? trimmed : undefined });
    onNext();
  };

  const handleSkip = () => {
    updateData({ additionalContext: undefined });
    onNext();
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="w-full max-w-lg mx-auto relative z-10">
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">
            Anything else we should know?
          </h1>
          <p className="text-gray-500 mb-8">
            The more you share, the better your first briefing will be.
          </p>

          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Pain points you've heard, budget cycles, renewal dates, existing relationships, recent trigger events..."
            className="min-h-[160px] sm:min-h-[140px] text-base resize-none border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-400 bg-white"
          />

          <button
            onClick={handleSkip}
            className="block w-full text-right text-sm text-gray-500 hover:text-gray-700 mt-4"
          >
            Skip for now
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 border-t border-gray-200 bg-white">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="flex-1 h-14 sm:h-12 text-base font-medium rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1 h-14 sm:h-12 text-base font-medium rounded-xl"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
