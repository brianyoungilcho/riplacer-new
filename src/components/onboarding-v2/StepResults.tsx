import { useState, useEffect } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Star, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface StepResultsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onComplete: () => void;
  onBack: () => void;
  isSaving?: boolean;
  isWorkspaceMode?: boolean;
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

// Mock prospect data
interface Prospect {
  id: string;
  name: string;
  score: number;
  contractValue: string;
  highlight: string;
  highlightType: 'opportunity' | 'timing' | 'weakness';
  riplaceAngle: string;
  sources: { label: string; url: string }[];
  lastUpdated: string;
}

const MOCK_PROSPECTS: Prospect[] = [
  {
    id: '1',
    name: 'Havensville PD',
    score: 85,
    contractValue: '$500,000/yr',
    highlight: 'Contract Expiring',
    highlightType: 'timing',
    riplaceAngle: 'Current contract with ShotSpotter expires March 2025. Recent city council meeting notes indicate budget concerns with renewal pricing. New police chief (appointed Sept 2024) has publicly discussed modernization initiatives.',
    sources: [
      { label: 'City Council Minutes', url: 'https://havensville.gov/council/minutes/2024-10' },
      { label: 'Police Chief Interview', url: 'https://localgazette.com/new-chief-plans' },
      { label: 'Budget Report', url: 'https://havensville.gov/budget/2025' },
    ],
    lastUpdated: '2025.12.06',
  },
  {
    id: '2',
    name: 'Tontown PD',
    score: 75,
    contractValue: '$250,000/yr',
    highlight: 'New Leadership',
    highlightType: 'opportunity',
    riplaceAngle: 'New police chief hired from neighboring county where they successfully implemented body cameras. Department currently has no body camera program. Recent community pressure for accountability measures.',
    sources: [
      { label: 'Chief Announcement', url: 'https://tontown.gov/news/new-chief' },
      { label: 'Community Forum', url: 'https://tontownforum.com/thread/12345' },
    ],
    lastUpdated: '2025.12.05',
  },
  {
    id: '3',
    name: 'Chelsea PD',
    score: 72,
    contractValue: '$125,000/yr',
    highlight: 'Competitor Issues',
    highlightType: 'weakness',
    riplaceAngle: 'Current vendor (Axon) facing class action lawsuit over data privacy concerns. City attorney flagged potential liability issues in recent memo. Department leadership open to evaluating alternatives.',
    sources: [
      { label: 'Lawsuit Filing', url: 'https://courtrecords.gov/case/2024-cv-1234' },
      { label: 'City Attorney Memo', url: 'https://chelsea.gov/legal/memos/2024-11' },
    ],
    lastUpdated: '2025.12.04',
  },
  {
    id: '4',
    name: 'Riverside Sheriff',
    score: 68,
    contractValue: '$180,000/yr',
    highlight: 'Budget Increase',
    highlightType: 'opportunity',
    riplaceAngle: 'County approved 15% increase to sheriff department technology budget for FY2025. Sheriff has publicly stated interest in modernizing evidence management systems.',
    sources: [
      { label: 'Budget Approval', url: 'https://riverside.gov/budget/2025' },
    ],
    lastUpdated: '2025.12.03',
  },
  {
    id: '5',
    name: 'Millbrook PD',
    score: 65,
    contractValue: '$95,000/yr',
    highlight: 'RFP Open',
    highlightType: 'timing',
    riplaceAngle: 'Active RFP for body-worn camera solution. Deadline is January 15, 2025. Current provider not meeting SLA requirements per public complaint records.',
    sources: [
      { label: 'RFP Document', url: 'https://millbrook.gov/procurement/rfp-2024-123' },
    ],
    lastUpdated: '2025.12.02',
  },
];

export function StepResults({ data, updateData, onComplete, onBack, isSaving, isWorkspaceMode = false }: StepResultsProps) {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});
  const [visibleProspects, setVisibleProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(isWorkspaceMode);

  // Simulate prospect streaming in workspace mode
  useEffect(() => {
    if (isWorkspaceMode) {
      setIsLoading(true);
      setVisibleProspects([]);
      
      // Stream in prospects one by one
      MOCK_PROSPECTS.forEach((prospect, index) => {
        setTimeout(() => {
          setVisibleProspects(prev => [...prev, prospect]);
          if (index === MOCK_PROSPECTS.length - 1) {
            setTimeout(() => setIsLoading(false), 500);
          }
        }, 800 * (index + 1));
      });
    } else {
      setVisibleProspects(MOCK_PROSPECTS);
    }
  }, [isWorkspaceMode]);

  // Load favorites
  useEffect(() => {
    const saved = localStorage.getItem('riplacer_onboarding_favorites');
    if (saved) setFavoritedIds(new Set(JSON.parse(saved)));
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const toggleFavorite = (id: string) => {
    const newFavorited = new Set(favoritedIds);
    if (newFavorited.has(id)) {
      newFavorited.delete(id);
    } else {
      newFavorited.add(id);
    }
    setFavoritedIds(newFavorited);
    localStorage.setItem('riplacer_onboarding_favorites', JSON.stringify(Array.from(newFavorited)));
  };

  const updateNote = (id: string, note: string) => {
    setUserNotes(prev => ({ ...prev, [id]: note }));
  };

  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'timing': return 'bg-amber-100 text-amber-800';
      case 'opportunity': return 'bg-green-100 text-green-800';
      case 'weakness': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // REVIEW & LAUNCH MODE
  if (!isWorkspaceMode) {
    return (
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-semibold text-gray-900 text-center mb-3">
            Ready to find prospects?
          </h1>
          <p className="text-gray-500 text-center mb-10">
            Review your search criteria and launch.
          </p>

          {/* Summary Cards */}
          <div className="space-y-3 mb-10">
            <SummaryCard
              label="Product"
              value={data.productDescription || data.companyDomain || 'Not specified'}
            />
            <SummaryCard
              label="Territory"
              value={
                data.states.length > 0
                  ? data.states.length <= 4
                    ? data.states.map(s => STATE_ABBREV[s] || s).join(', ')
                    : `${data.states.slice(0, 3).map(s => STATE_ABBREV[s] || s).join(', ')} +${data.states.length - 3} more`
                  : 'Not specified'
              }
            />
            <SummaryCard
              label="Target Buyers"
              value={
                data.targetCategories.length > 0
                  ? data.targetCategories.map(c => CATEGORY_LABELS[c] || c).join(', ')
                  : 'Not specified'
              }
            />
            <SummaryCard
              label="Competitors"
              value={
                data.competitors.length > 0
                  ? data.competitors.join(', ')
                  : 'Not specified'
              }
            />
          </div>

          {/* Action Buttons */}
          <Button
            onClick={onComplete}
            disabled={isSaving}
            className="w-full h-14 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Launching...
              </>
            ) : (
              'Find Prospects →'
            )}
          </Button>

          <button
            onClick={onBack}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
          >
            ← Back to edit
          </button>
        </div>
      </div>
    );
  }

  // WORKSPACE MODE - Prospect List
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isLoading ? 'Finding prospects...' : `${visibleProspects.length} Prospects Found`}
            </h2>
            <p className="text-sm text-gray-500">Sorted by Riplace Score</p>
          </div>
          <div className="flex items-center gap-2">
            {data.states.slice(0, 3).map(state => (
              <span key={state} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                {STATE_ABBREV[state] || state}
              </span>
            ))}
            {data.states.length > 3 && (
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-500">
                +{data.states.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prospects List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleProspects.map((prospect, index) => (
          <div
            key={prospect.id}
            className={cn(
              "bg-white border border-gray-200 rounded-xl transition-all duration-300",
              expandedId === prospect.id ? "ring-2 ring-primary/20" : "hover:border-gray-300 hover:shadow-sm"
            )}
            style={{
              animation: isWorkspaceMode ? `fadeInUp 0.4s ease-out forwards` : undefined,
              animationDelay: isWorkspaceMode ? `${index * 0.1}s` : undefined,
            }}
          >
            {/* Main Row */}
            <div 
              className="p-4 cursor-pointer"
              onClick={() => toggleExpand(prospect.id)}
            >
              <div className="flex items-start gap-4">
                {/* Score Badge */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex flex-col items-center justify-center text-white flex-shrink-0">
                  <span className="text-xl font-bold">{prospect.score}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{prospect.name}</h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      getHighlightColor(prospect.highlightType)
                    )}>
                      {prospect.highlight}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {prospect.contractValue} • {prospect.riplaceAngle.slice(0, 80)}...
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(prospect.id);
                    }}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                      favoritedIds.has(prospect.id)
                        ? "bg-amber-100 text-amber-600"
                        : "bg-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    <Star className={cn(
                      "w-4 h-4",
                      favoritedIds.has(prospect.id) && "fill-current"
                    )} />
                  </button>
                  {expandedId === prospect.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedId === prospect.id && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-4 pl-18">
                  {/* Riplace Angle */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Riplace Angle</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {prospect.riplaceAngle}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Updated {prospect.lastUpdated}
                    </p>
                  </div>

                  {/* Sources */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Sources</h4>
                    <div className="flex flex-wrap gap-2">
                      {prospect.sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          {source.label}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Your Notes</h4>
                    <Textarea
                      value={userNotes[prospect.id] || ''}
                      onChange={(e) => updateNote(prospect.id, e.target.value)}
                      placeholder="Add your own insights about this prospect..."
                      className="min-h-[80px] text-sm resize-none border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Finding more prospects...</span>
            </div>
          </div>
        )}

        {/* Skeleton cards while loading */}
        {isLoading && visibleProspects.length < MOCK_PROSPECTS.length && (
          <>
            {Array.from({ length: Math.min(2, MOCK_PROSPECTS.length - visibleProspects.length) }).map((_, i) => (
              <div key={`skeleton-${i}`} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-200 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Add global animation styles */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// Summary card component for review mode
function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div>
        <p className="text-sm text-gray-500 mb-0.5">{label}</p>
        <p className="font-medium text-gray-900 truncate max-w-xs">{value}</p>
      </div>
    </div>
  );
}
