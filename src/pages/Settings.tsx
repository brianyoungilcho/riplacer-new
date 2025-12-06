import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Check,
  X,
  Plus
} from 'lucide-react';

export default function Settings() {
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [sellingProposition, setSellingProposition] = useState('');
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [saving, setSaving] = useState(false);

  // Territory from localStorage
  const [territory, setTerritory] = useState<{ state: string; city: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || '');
      setCompanyWebsite(profile.company_website || '');
      setSellingProposition(profile.selling_proposition || '');
      setCompetitors(profile.competitor_names || []);
    }

    // Load territory
    const savedTerritory = localStorage.getItem('riplacer_territory');
    if (savedTerritory) {
      setTerritory(JSON.parse(savedTerritory));
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const { error } = await updateProfile({
        company_name: companyName,
        company_website: companyWebsite,
        selling_proposition: sellingProposition,
        competitor_names: competitors,
      });

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addCompetitor = () => {
    if (newCompetitor.trim() && !competitors.includes(newCompetitor.trim())) {
      setCompetitors([...competitors, newCompetitor.trim()]);
      setNewCompetitor('');
    }
  };

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center bg-gray-950">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto bg-gray-950">
        {/* Header */}
        <header className="h-16 border-b border-gray-800 flex items-center px-6 bg-gray-900">
          <h1 className="text-lg font-semibold text-white">Settings</h1>
        </header>

        <div className="p-6 max-w-2xl space-y-6">
          {/* Company Info */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">Company Information</h2>
              <p className="text-sm text-gray-400 mt-1">
                This information helps us find the best rip & replace opportunities for you.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name" className="text-gray-300">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Inc."
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company-website" className="text-gray-300">Website</Label>
                <Input
                  id="company-website"
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selling-proposition" className="text-gray-300">What You Sell</Label>
                <Textarea
                  id="selling-proposition"
                  value={sellingProposition}
                  onChange={(e) => setSellingProposition(e.target.value)}
                  placeholder="Describe what your company sells in 1-2 sentences..."
                  className="min-h-[80px] bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Territory */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">Territory</h2>
              <p className="text-sm text-gray-400 mt-1">
                Your assigned sales territory for prospecting.
              </p>
            </div>
            <div className="p-6">
              {territory ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {territory.city ? `${territory.city}, ${territory.state}` : territory.state}
                    </p>
                    <p className="text-sm text-gray-500">
                      Change territory by re-running onboarding
                    </p>
                  </div>
                  <Badge className="bg-gray-800 text-gray-300">
                    Active
                  </Badge>
                </div>
              ) : (
                <p className="text-gray-400">No territory set. Complete onboarding to set your territory.</p>
              )}
            </div>
          </div>

          {/* Competitors */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">Competitors</h2>
              <p className="text-sm text-gray-400 mt-1">
                Who are you trying to rip and replace? We'll look for their presence at prospects.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {competitors.map((competitor, index) => (
                  <Badge 
                    key={index} 
                    className="flex items-center gap-1 pr-1 h-8 bg-gray-800 text-gray-200"
                  >
                    {competitor}
                    <button
                      onClick={() => removeCompetitor(index)}
                      className="ml-1 hover:bg-red-500/20 hover:text-red-400 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {competitors.length === 0 && (
                  <span className="text-sm text-gray-500">
                    No competitors added yet
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  placeholder="Add a competitor..."
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCompetitor();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addCompetitor}
                  disabled={!newCompetitor.trim()}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              variant="glow"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
