import { useMemo, useState } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2, Mail, MessageSquare, RefreshCw } from 'lucide-react';

interface StepResultsProps {
  data: OnboardingData;
  onComplete: (email: string) => void;
  onBack: () => void;
  onEditStep?: (step: number) => void;
  isSaving?: boolean;
}

// State abbreviations
const STATE_ABBREV: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
};

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  'police': 'Police Departments',
  'sheriff': 'Sheriff Offices',
  'fire': 'Fire Departments',
  'ems': 'EMS/Ambulance',
  'schools_k12': 'K-12 Schools',
  'higher_ed': 'Higher Education',
  'city_gov': 'City Government',
  'county_gov': 'County Government',
  'state_agency': 'State Agencies',
  'transit': 'Transit Authorities',
  'utilities': 'Public Utilities',
  'hospitals': 'Public Hospitals',
};

const isValidEmail = (email: string) => /.+@.+\..+/.test(email.trim());

const formatTerritory = (data: OnboardingData) => {
  if (data.isCustomTerritory && data.territoryDescription) {
    return data.territoryDescription;
  }

  if (data.states.length === 0) {
    return 'Not specified';
  }

  return data.states.length <= 4
    ? data.states.map(s => STATE_ABBREV[s] || s).join(', ')
    : `${data.states.slice(0, 3).map(s => STATE_ABBREV[s] || s).join(', ')} +${data.states.length - 3} more`;
};

const formatCategories = (data: OnboardingData) => {
  if (data.targetCategories.length === 0) {
    return 'Not specified';
  }

  return data.targetCategories.map(c => CATEGORY_LABELS[c] || c).join(', ');
};

const truncate = (value: string, max = 120) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
};

export function StepResults({ data, onComplete, onBack, onEditStep, isSaving }: StepResultsProps) {
  const [email, setEmail] = useState(data.email || '');
  const [touched, setTouched] = useState(false);

  const summaryItems = useMemo(() => {
    const items = [
      {
        label: 'Product',
        value: data.productDescription || data.companyDomain || 'Not specified',
        step: 1,
      },
      {
        label: 'Territory',
        value: formatTerritory(data),
        step: 2,
      },
      {
        label: 'Target Buyers',
        value: formatCategories(data),
        step: 3,
      },
      {
        label: 'Competitors',
        value: data.competitors.length > 0 ? data.competitors.join(', ') : 'Not specified',
        step: 4,
      },
      {
        label: 'Target Account',
        value: data.targetAccount || 'Not specified',
        step: 5,
      },
    ];

    if (data.additionalContext) {
      items.push({
        label: 'Context',
        value: truncate(data.additionalContext),
        step: 6,
      });
    }

    return items;
  }, [data]);

  const canSubmit = isValidEmail(email) && !isSaving;

  const handleSubmit = () => {
    setTouched(true);
    if (!isValidEmail(email)) return;
    onComplete(email.trim());
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="w-full max-w-lg mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">
            Ready to hunt {data.targetAccount || 'your target'}?
          </h1>
          <p className="text-gray-500 mb-10">
            Review your setup and enter your email below to get started.
          </p>

          {/* Review Section */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Review
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {summaryItems.map((item) => (
                <SummaryCard 
                  key={item.label} 
                  label={item.label} 
                  value={item.value}
                  onClick={() => onEditStep?.(item.step)}
                />
              ))}
            </div>
          </div>

          {/* What Happens Next Section */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-8 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">What happens next</h3>
            </div>
            
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">First briefing in 15-30 minutes</h4>
                  <p className="text-gray-600 text-sm">
                    You'll receive everything you need to rip & replace {data.targetAccount || 'your target'} straight to your inbox.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">No login needed</h4>
                  <p className="text-gray-600 text-sm">
                    Just reply to any email if you need an agent to dig deeper or answer questions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Weekly updates</h4>
                  <p className="text-gray-600 text-sm">
                    We'll send you fresh intel on your target and territory every week.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-sm font-bold text-primary">4</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Update anytime</h4>
                  <p className="text-gray-600 text-sm">
                    Change your criteria by replying to any email - we'll adjust immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="p-4 sm:p-6 border-t border-gray-200 bg-white">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 font-medium">
              Work Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                className="pl-11 h-14 sm:h-12 text-base border-gray-200 focus:border-primary focus:ring-primary"
              />
            </div>
            {touched && !isValidEmail(email) && (
              <p className="text-sm text-red-600">Enter a valid email address.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              className="h-14 sm:h-12 text-base font-medium rounded-xl"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              variant="glow"
              size="lg"
              className="h-14 sm:h-12 text-base font-semibold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Start Ripping'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer text-left w-full group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 mb-0.5 group-hover:text-primary transition-colors">{label}</p>
        <p className="font-medium text-gray-900 break-words">{value}</p>
      </div>
      <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
