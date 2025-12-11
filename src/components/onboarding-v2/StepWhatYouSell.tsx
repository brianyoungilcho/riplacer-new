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
    
    // Check if input looks like a URL/domain
    const isUrl = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z]{2,})+/.test(trimmedInput.replace(/^https?:\/\//, '').replace(/^www\./, ''));
    
    if (isUrl) {
      // Clean up URL
      let cleanUrl = trimmedInput.toLowerCase();
      cleanUrl = cleanUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      
      updateData({ 
        companyDomain: cleanUrl,
        companyName: cleanUrl.split('.')[0].charAt(0).toUpperCase() + cleanUrl.split('.')[0].slice(1),
        productDescription: `Products and services from ${cleanUrl}`
      });
    } else {
      // It's a description
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
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} 
      />
      
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
