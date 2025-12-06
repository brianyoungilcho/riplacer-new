import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Globe, 
  Sparkles, 
  Check, 
  Loader2, 
  X, 
  ArrowRight,
  Building2,
  Zap
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [website, setWebsite] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    selling_proposition: string;
    competitors: string[];
  } | null>(null);
  const [editedAnalysis, setEditedAnalysis] = useState<{
    selling_proposition: string;
    competitors: string[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  
  const { updateProfile } = useProfile();
  const { toast } = useToast();

  const analyzeWebsite = async () => {
    if (!website) return;
    
    setAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-company', {
        body: { website_url: website }
      });

      if (error) throw error;

      const result = {
        selling_proposition: data.selling_proposition || 'Unable to determine',
        competitors: data.competitors || [],
      };
      
      setAnalysis(result);
      setEditedAnalysis(result);
      setStep(2);
    } catch (error) {
      console.error('Error analyzing website:', error);
      toast({
        title: 'Analysis failed',
        description: 'Could not analyze the website. Please try again or enter details manually.',
        variant: 'destructive',
      });
      // Allow manual entry
      setAnalysis({
        selling_proposition: '',
        competitors: [],
      });
      setEditedAnalysis({
        selling_proposition: '',
        competitors: [],
      });
      setStep(2);
    } finally {
      setAnalyzing(false);
    }
  };

  const removeCompetitor = (index: number) => {
    if (!editedAnalysis) return;
    setEditedAnalysis({
      ...editedAnalysis,
      competitors: editedAnalysis.competitors.filter((_, i) => i !== index),
    });
  };

  const addCompetitor = (name: string) => {
    if (!editedAnalysis || !name.trim()) return;
    setEditedAnalysis({
      ...editedAnalysis,
      competitors: [...editedAnalysis.competitors, name.trim()],
    });
  };

  const saveAndComplete = async () => {
    if (!editedAnalysis) return;
    
    setSaving(true);
    
    try {
      const { error } = await updateProfile({
        company_website: website,
        selling_proposition: editedAnalysis.selling_proposition,
        competitor_names: editedAnalysis.competitors,
        onboarding_complete: true,
      });

      if (error) throw error;

      toast({
        title: 'Setup complete!',
        description: 'Your profile has been configured. Start discovering opportunities!',
      });
      
      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      <Card className="w-full max-w-xl glass border-border/50 animate-fade-in-up">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-pulse-glow">
            {step === 1 ? (
              <Building2 className="w-8 h-8 text-primary-foreground" />
            ) : (
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            )}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {step === 1 ? "Let's set you up" : 'Confirm your profile'}
            </CardTitle>
            <CardDescription className="mt-2">
              {step === 1 
                ? "We'll analyze your company to find the best opportunities" 
                : 'Review and edit the AI analysis'}
            </CardDescription>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="website">Your Company Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll analyze your website to understand what you sell and who you compete with
                </p>
              </div>

              <Button
                variant="glow"
                size="lg"
                className="w-full"
                onClick={analyzeWebsite}
                disabled={!website || analyzing}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>What You Sell</Label>
                  <Input
                    value={editedAnalysis?.selling_proposition || ''}
                    onChange={(e) => setEditedAnalysis(prev => prev ? {
                      ...prev,
                      selling_proposition: e.target.value
                    } : null)}
                    placeholder="Describe what your company sells..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Your Competitors</Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-secondary/50 rounded-lg min-h-[60px]">
                    {editedAnalysis?.competitors.map((competitor, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {competitor}
                        <button
                          onClick={() => removeCompetitor(index)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {editedAnalysis?.competitors.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        No competitors added yet
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a competitor..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addCompetitor((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousSibling as HTMLInputElement);
                        addCompetitor(input.value);
                        input.value = '';
                      }}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="glow"
                  onClick={saveAndComplete}
                  disabled={saving || !editedAnalysis?.selling_proposition}
                  className="flex-1"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Start Discovering
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
