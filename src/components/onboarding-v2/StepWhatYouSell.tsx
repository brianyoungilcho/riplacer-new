import { useState } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2 } from 'lucide-react';

interface StepWhatYouSellProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}

export function StepWhatYouSell({ data, updateData, onNext }: StepWhatYouSellProps) {
  const [input, setInput] = useState(data.companyDomain || data.productDescription || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isValid = input.trim().length > 0;

  const handleContinue = async () => {
    if (!isValid) return;
    
    setIsAnalyzing(true);
    
    const trimmedInput = input.trim();
    
    // Check if input contains a URL/domain (even with extra text like "flocksafety.com - specifically alpr")
    // Extract domain pattern: domain.com or domain.co.uk etc
    const domainPattern = /([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})*)/;
    const domainMatch = trimmedInput.match(domainPattern);
    
    if (domainMatch) {
      // Found a domain in the input
      let cleanUrl = domainMatch[1].toLowerCase();
      cleanUrl = cleanUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(' ')[0]; // Remove protocol, www, path, and any trailing text
      
      updateData({ 
        companyDomain: cleanUrl,
        companyName: cleanUrl.split('.')[0].charAt(0).toUpperCase() + cleanUrl.split('.')[0].slice(1),
        productDescription: trimmedInput.includes(' - ') || trimmedInput.length > cleanUrl.length + 5
          ? trimmedInput // Keep original if it has extra context
          : `Products and services from ${cleanUrl}`
      });
    } else {
      // It's a description without a domain
      updateData({ 
        productDescription: trimmedInput,
        companyDomain: undefined,
        companyName: undefined
      });
    }
    
    // Brief delay for UX
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setIsAnalyzing(false);
    onNext();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && isValid && !isAnalyzing) {
      e.preventDefault();
      handleContinue();
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-8 relative overflow-hidden">
      {/* Subtle dotted background pattern */}
      <div className="dotted-bg dotted-bg-gentle-float" />
      
      <div className="w-full max-w-lg text-center relative z-10">
        {/* Title */}
        <h1 className="text-3xl font-semibold text-gray-900 mb-3 tracking-tight">
          What are you selling?
        </h1>
        <p className="text-gray-500 mb-8">
          Drop your website or describe your product.
        </p>

        {/* Single textarea - left-aligned text */}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="axon.com or 'Body-worn cameras for law enforcement...'"
          className="min-h-[120px] text-base resize-none border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-400 placeholder:text-gray-400 bg-white"
          autoFocus
        />

        {/* Continue button */}
        <Button
          onClick={handleContinue}
          disabled={!isValid || isAnalyzing}
          className="w-full mt-6 h-12 bg-primary hover:bg-primary/90 text-white rounded-xl"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {/* Helper text */}
        <p className="text-sm text-gray-400 mt-4">
          We'll figure out what you're selling either way
        </p>
      </div>
    </div>
  );
}
