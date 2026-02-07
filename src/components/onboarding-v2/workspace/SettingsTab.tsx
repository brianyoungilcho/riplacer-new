import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OnboardingData } from '../OnboardingPage';
import { useAuth } from '@/hooks/useAuth';
import { STATE_ABBREV } from '@/constants/states';
import { BUYER_CATEGORY_LABELS } from '@/constants/buyerCategories';
import {
  Loader2,
  Check,
  X,
  Plus,
  User
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsTabProps {
  data: OnboardingData;
  onEditCriteria: (step: number) => void;
}


export function SettingsTab({ data, onEditCriteria }: SettingsTabProps) {
  const { user, signOut } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load from user metadata or localStorage
    if (user) {
      setCompanyEmail(user.email || '');
    }
    const saved = localStorage.getItem('riplacer_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompanyName(parsed.companyName || '');
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    // Save to localStorage for now
    localStorage.setItem('riplacer_settings', JSON.stringify({
      companyName,
    }));

    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
    toast.success('Settings saved');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage your account and search criteria</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">

          {/* Account Section */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Account</h3>
            </div>
            <div className="p-6 space-y-4">
              {user ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.email}</p>
                      <p className="text-sm text-gray-500">Signed in</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await signOut();
                      window.location.href = '/';
                    }}
                    className="text-gray-600"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div>
                    <p className="font-medium text-amber-800">Guest Mode</p>
                    <p className="text-sm text-amber-600">Sign up to save your data across devices</p>
                  </div>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    Sign Up Free
                  </Button>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Label htmlFor="company-name" className="text-gray-700">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Inc."
                  className="border-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Search Criteria Summary */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Search Criteria</h3>
              <span className="text-xs text-gray-500">Click any section to edit</span>
            </div>
            <div className="divide-y divide-gray-100">
              {/* Product */}
              <button
                onClick={() => onEditCriteria(1)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Product</p>
                    <p className="text-gray-900 mt-0.5">
                      {data.productDescription || data.companyDomain || 'Not specified'}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">Edit →</span>
                </div>
              </button>

              {/* Territory */}
              <button
                onClick={() => onEditCriteria(2)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Territory</p>
                    <p className="text-gray-900 mt-0.5">
                      {data.states.length > 0
                        ? data.states.length <= 5
                          ? data.states.map(s => STATE_ABBREV[s] || s).join(', ')
                          : `${data.states.slice(0, 4).map(s => STATE_ABBREV[s] || s).join(', ')} +${data.states.length - 4} more`
                        : 'Not specified'}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">Edit →</span>
                </div>
              </button>

              {/* Target Buyers */}
              <button
                onClick={() => onEditCriteria(3)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Target Buyers</p>
                    <p className="text-gray-900 mt-0.5">
                      {data.targetCategories.length > 0
                        ? data.targetCategories.map(c => BUYER_CATEGORY_LABELS[c] || c).join(', ')
                        : 'Not specified'}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">Edit →</span>
                </div>
              </button>

              {/* Competitors */}
              <button
                onClick={() => onEditCriteria(4)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Competitors</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {data.competitors.length > 0 ? (
                        data.competitors.map((comp, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-100 rounded text-sm text-gray-700"
                          >
                            {comp}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-900">Not specified</span>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">Edit →</span>
                </div>
              </button>
            </div>
          </div>

          {/* Data & Privacy */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Data & Privacy</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Clear Local Data</p>
                  <p className="text-sm text-gray-500">Remove all saved prospects and settings from this browser</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Are you sure? This will clear all local data.')) {
                      localStorage.removeItem('riplacer_onboarding_progress');
                      localStorage.removeItem('riplacer_onboarding');
                      localStorage.removeItem('riplacer_saved_leads');
                      localStorage.removeItem('riplacer_favorited_ids');
                      localStorage.removeItem('riplacer_settings');
                      toast.success('Local data cleared');
                      window.location.reload();
                    }
                  }}
                >
                  Clear Data
                </Button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
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
    </div>
  );
}

