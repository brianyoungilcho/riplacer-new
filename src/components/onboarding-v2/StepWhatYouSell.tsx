import { useState } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface StepWhatYouSellProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}

export function StepWhatYouSell({ data, updateData, onNext }: StepWhatYouSellProps) {
  const { signInWithGoogle } = useAuth();
  const [description, setDescription] = useState(data.productDescription);
  const [websiteUrl, setWebsiteUrl] = useState(data.companyDomain || '');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleContinue = () => {
    if (description.trim()) {
      updateData({ productDescription: description.trim() });
      onNext();
    }
  };

  const handleAnalyzeWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    // Normalize URL
    let url = websiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setIsAnalyzing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('analyze-company', {
        body: { website_url: url }
      });

      if (error) throw error;

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Update form with AI analysis
      const newDescription = result.selling_proposition || '';
      setDescription(newDescription);
      
      updateData({
        productDescription: newDescription,
        companyName: result.company_name || undefined,
        companyDomain: url,
        competitors: result.competitors || [],
      });

      toast.success('Website analyzed! Review the description below.');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze website. Try entering your description manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error('Sign in failed. Please try again.');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      toast.error('Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const canContinue = description.trim().length > 0;

  return (
    <div className="py-20 px-8">
      <div className="max-w-xl mx-auto">
        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-4">
          What are you selling?
        </h1>
        
        <p className="text-gray-600 text-center mb-12">
          Tell us what you are trying to sell. You can be as descriptive as possible, or simply drop your company's URL.
        </p>

        {/* Website URL Input */}
        <div className="mb-6">
          <div className="flex gap-2">
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="yourcompany.com"
              className="flex-1 h-12 text-base border-gray-300 focus:border-gray-400 focus:ring-0 rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeWebsite()}
            />
            <Button
              onClick={handleAnalyzeWebsite}
              disabled={isAnalyzing || !websiteUrl.trim()}
              variant="outline"
              className="h-12 px-4 rounded-xl border-gray-300"
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Enter your website and we'll analyze it with AI
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-500 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Text Input */}
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Body-worn cameras and fleet safety solutions for law enforcement agencies..."
          className="min-h-[120px] text-base resize-none border-gray-300 focus:border-gray-400 focus:ring-0 rounded-xl mb-6"
        />

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full h-12 text-base font-medium rounded-xl"
          variant={canContinue ? "default" : "outline"}
        >
          Continue
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-500 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Google Sign In */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          variant="outline"
          className="w-full h-12 text-base font-medium rounded-xl border-gray-300 hover:bg-gray-50"
        >
          {isSigningIn ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <GoogleIcon className="w-5 h-5 mr-2" />
              Log in to let us consolidate your company's offering
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
