import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  ArrowLeft,
  Crosshair,
  AlertTriangle,
  LogIn
} from 'lucide-react';

// US States for territory selection
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington D.C.' }
];

// Target sectors (government/public focus)
const TARGET_SECTORS = [
  { id: 'police', name: 'Police Departments', description: 'Law enforcement agencies' },
  { id: 'fire', name: 'Fire Departments', description: 'Fire and rescue services' },
  { id: 'schools', name: 'K-12 Schools', description: 'Public school districts' },
  { id: 'higher_ed', name: 'Higher Education', description: 'Universities and colleges' },
  { id: 'city', name: 'City Government', description: 'Municipal offices and agencies' },
  { id: 'county', name: 'County Government', description: 'County-level agencies' },
  { id: 'state', name: 'State Agencies', description: 'State departments and offices' },
];

// Mock company analysis for dev environment
const MOCK_ANALYSIS = {
  selling_proposition: 'Cloud-based fleet management software for government agencies',
  competitors: ['Samsara', 'Verizon Connect', 'Geotab', 'Fleet Complete'],
};

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const { toast } = useToast();
  
  const isGuest = !user;
  
  // Step 1: What you sell
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [sellingProposition, setSellingProposition] = useState('');
  
  // Step 2: Where you sell
  const [selectedState, setSelectedState] = useState('');
  const [city, setCity] = useState('');
  
  // Step 3: Who you sell to
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  
  // Step 4: Competitors
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  
  const [saving, setSaving] = useState(false);

  // Load saved data from localStorage on mount (for returning guests or users)
  useEffect(() => {
    const savedData = localStorage.getItem('riplacer_onboarding');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setCompanyWebsite(data.companyWebsite || '');
        setSellingProposition(data.sellingProposition || '');
        setSelectedState(data.state || '');
        setCity(data.city || '');
        setSelectedSectors(data.sectors || []);
        setCompetitors(data.competitors || []);
      } catch (e) {
        console.error('Error loading saved onboarding data:', e);
      }
    }
  }, []);

  // For logged-in users, try to extract domain from email
  useEffect(() => {
    if (user?.email && !companyWebsite) {
      const domain = user.email.split('@')[1];
      if (domain && !domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('hotmail')) {
        setCompanyWebsite(`https://${domain}`);
      }
    }
  }, [user]);

  const analyzeCompany = async () => {
    if (!companyWebsite) return;
    
    setAnalyzing(true);
    setUseMockData(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-company', {
        body: { website_url: companyWebsite }
      });

      if (error) throw error;

      if (data?.selling_proposition) {
        setSellingProposition(data.selling_proposition);
        setCompetitors(data.competitors || []);
      } else {
        throw new Error('No data returned');
      }
      
      setStep(2);
    } catch (error) {
      console.error('Error analyzing website:', error);
      
      // Use mock data in dev
      toast({
        title: 'Using sample data',
        description: 'Could not reach AI service. Using sample data for demonstration.',
      });
      
      setUseMockData(true);
      setSellingProposition(MOCK_ANALYSIS.selling_proposition);
      setCompetitors(MOCK_ANALYSIS.competitors);
      setStep(2);
    } finally {
      setAnalyzing(false);
    }
  };

  const skipToManualEntry = () => {
    setStep(2);
  };

  const toggleSector = (sectorId: string) => {
    setSelectedSectors(prev => 
      prev.includes(sectorId) 
        ? prev.filter(s => s !== sectorId)
        : [...prev, sectorId]
    );
  };

  const addCompetitor = () => {
    if (newCompetitor.trim() && !competitors.includes(newCompetitor.trim())) {
      setCompetitors([...competitors, newCompetitor.trim()]);
      setNewCompetitor('');
    }
  };

  const removeCompetitor = (name: string) => {
    setCompetitors(competitors.filter(c => c !== name));
  };

  const saveAndComplete = async () => {
    setSaving(true);
    
    try {
      // Always save to localStorage (for both guests and users)
      const onboardingData = {
        companyWebsite,
        sellingProposition,
        state: selectedState,
        city,
        sectors: selectedSectors,
        competitors,
        completedAt: new Date().toISOString(),
      };
      localStorage.setItem('riplacer_onboarding', JSON.stringify(onboardingData));
      localStorage.setItem('riplacer_territory', JSON.stringify({ state: selectedState, city }));
      localStorage.setItem('riplacer_sectors', JSON.stringify(selectedSectors));

      // If logged in, also save to profile
      if (user) {
        const { error } = await updateProfile({
          company_website: companyWebsite,
          selling_proposition: sellingProposition,
          competitor_names: competitors,
          onboarding_complete: true,
        });

        if (error) {
          console.error('Error saving to profile:', error);
          // Still continue - localStorage has the data
        }
      }

      toast({
        title: isGuest ? 'Setup complete!' : 'Profile saved!',
        description: isGuest 
          ? 'Start exploring prospects. Sign up anytime to save your work!'
          : 'Start discovering opportunities in your territory.',
      });
      
      onComplete();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return sellingProposition.trim().length > 0;
      case 2: return selectedState.length > 0;
      case 3: return selectedSectors.length > 0;
      case 4: return true; // Competitors are optional
      default: return false;
    }
  };

  const stepTitles = [
    'What do you sell?',
    'Where is your territory?',
    'Who do you sell to?',
    'Who are your competitors?'
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Mock data indicator */}
      {useMockData && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-amber-100 border border-amber-300 rounded-full shadow-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Demo Mode: Sample Data</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl text-gray-900">Riplacer</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Progress */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div 
                  key={s}
                  className={`w-8 h-1 rounded-full transition-colors ${
                    s <= step ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-500 ml-2">{step}/4</span>
            </div>

            {/* Sign in button for guests */}
            {isGuest && (
              <Link to="/auth">
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {/* Guest mode badge */}
          {isGuest && step === 1 && (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <h3 className="font-semibold text-gray-900">Try it free — no signup required</h3>
              <p className="text-sm text-gray-600 mt-1">
                Experience Riplacer now. Create an account later to save your prospects and access premium features.
              </p>
            </div>
          )}

          {/* Step Title */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {stepTitles[step - 1]}
            </h1>
            <p className="text-gray-600">
              {step === 1 && "Enter your company website and we'll figure out the rest"}
              {step === 2 && "Select the state and city where you're hunting prospects"}
              {step === 3 && "Choose the sectors you're targeting (government & public)"}
              {step === 4 && "Review the competitors we found — add or remove as needed"}
            </p>
          </div>

          {/* Step Content */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              
              {/* Step 1: What you sell */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-gray-700 font-medium">
                      Company Website
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://yourcompany.com"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="pl-11 h-12 text-base"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      We'll analyze your website to understand what you sell
                    </p>
                  </div>

                  <Button
                    variant="glow"
                    size="lg"
                    className="w-full"
                    onClick={analyzeCompany}
                    disabled={!companyWebsite || analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Analyze with AI
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      Describe what you sell manually
                    </Label>
                    <Input
                      placeholder="e.g., Fleet management software for government agencies"
                      value={sellingProposition}
                      onChange={(e) => setSellingProposition(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>

                  {sellingProposition && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={skipToManualEntry}
                    >
                      Continue with manual entry
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              )}

              {/* Step 2: Where you sell */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      Select Your State
                    </Label>
                    <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
                      {US_STATES.map((state) => (
                        <button
                          key={state.code}
                          onClick={() => setSelectedState(state.code)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                            selectedState === state.code
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:bg-primary/5'
                          }`}
                        >
                          {state.code}
                        </button>
                      ))}
                    </div>
                    {selectedState && (
                      <p className="text-sm text-primary font-medium">
                        Selected: {US_STATES.find(s => s.code === selectedState)?.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-700 font-medium">
                      City (Optional)
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g., Los Angeles, Chicago, Houston"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-12 text-base"
                    />
                    <p className="text-sm text-gray-500">
                      Leave blank to target the entire state
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Who you sell to */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Select all sectors that apply to your sales targets:
                  </p>
                  <div className="space-y-3">
                    {TARGET_SECTORS.map((sector) => {
                      const isSelected = selectedSectors.includes(sector.id);
                      return (
                        <button
                          key={sector.id}
                          onClick={() => toggleSector(sector.id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-primary/5 border-primary ring-1 ring-primary'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-gray-900">{sector.name}</div>
                            <div className="text-sm text-gray-500">{sector.description}</div>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 4: Competitors */}
              {step === 4 && (
                <div className="space-y-6">
                  {useMockData && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        These are sample competitors (demo mode). In production, AI will detect actual competitors from your website.
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      Your Competitors
                    </Label>
                    <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg min-h-[80px] border border-gray-200">
                      {competitors.length === 0 ? (
                        <span className="text-sm text-gray-500">No competitors added yet</span>
                      ) : (
                        competitors.map((competitor) => (
                          <Badge 
                            key={competitor} 
                            variant="secondary"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200"
                          >
                            {competitor}
                            <button
                              onClick={() => removeCompetitor(competitor)}
                              className="hover:text-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a competitor..."
                      value={newCompetitor}
                      onChange={(e) => setNewCompetitor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCompetitor();
                        }
                      }}
                      className="h-12"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={addCompetitor}
                      className="h-12 w-12 shrink-0"
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Summary before finish */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Selling:</dt>
                        <dd className="text-gray-900 font-medium text-right max-w-[250px] truncate">
                          {sellingProposition || '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Territory:</dt>
                        <dd className="text-gray-900 font-medium">
                          {city ? `${city}, ` : ''}{selectedState || '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Sectors:</dt>
                        <dd className="text-gray-900 font-medium">
                          {selectedSectors.length} selected
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Competitors:</dt>
                        <dd className="text-gray-900 font-medium">
                          {competitors.length} added
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Guest signup nudge */}
                  {isGuest && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Want to save your prospects?</p>
                          <p className="text-sm text-gray-600">Create a free account to save and track leads.</p>
                        </div>
                        <Link to="/auth">
                          <Button variant="outline" size="sm">
                            Sign Up
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button
                variant="glow"
                size="lg"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                variant="glow"
                size="lg"
                onClick={saveAndComplete}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Start Finding Prospects
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
