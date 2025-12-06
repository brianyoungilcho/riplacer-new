import { useState } from 'react';
import { OnboardingData } from './OnboardingPage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Star, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface StepResultsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onComplete: () => void;
  onBack: () => void;
}

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
    highlight: 'Contract Expiring in <6 months',
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
    highlight: 'New Chief in town',
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
    score: 75,
    contractValue: '$125,000/yr',
    highlight: 'Competitor under attack in PR',
    highlightType: 'weakness',
    riplaceAngle: 'Current vendor (Axon) facing class action lawsuit over data privacy concerns. City attorney flagged potential liability issues in recent memo. Department leadership open to evaluating alternatives.',
    sources: [
      { label: 'Lawsuit Filing', url: 'https://courtrecords.gov/case/2024-cv-1234' },
      { label: 'City Attorney Memo', url: 'https://chelsea.gov/legal/memos/2024-11' },
    ],
    lastUpdated: '2025.12.04',
  },
];

export function StepResults({ data, onComplete, onBack }: StepResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const updateNote = (id: string, note: string) => {
    setUserNotes(prev => ({ ...prev, [id]: note }));
  };

  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'timing': return 'bg-green-100 text-green-800';
      case 'opportunity': return 'bg-blue-100 text-blue-800';
      case 'weakness': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filter Pills */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          {data.filters.map((filter, idx) => (
            <span 
              key={idx}
              className="px-3 py-1.5 bg-white rounded-full text-sm border border-gray-200"
            >
              {filter}
            </span>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {MOCK_PROSPECTS.map(prospect => (
          <div
            key={prospect.id}
            className={cn(
              "border-b border-gray-200 transition-colors",
              expandedId === prospect.id ? "bg-blue-50/50" : "hover:bg-gray-50"
            )}
          >
            {/* Main Row */}
            <div 
              className="px-6 py-4 cursor-pointer"
              onClick={() => toggleExpand(prospect.id)}
            >
              <div className="flex items-center gap-4">
                {/* Score */}
                <div className="text-3xl font-bold text-gray-900 w-12">
                  {prospect.score}
                </div>

                {/* Name & Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{prospect.name}</h3>
                    <span className="text-green-600 font-medium text-sm">
                      {prospect.contractValue}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      getHighlightColor(prospect.highlightType)
                    )}>
                      {prospect.highlight}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(prospect.id);
                    }}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      favorites.has(prospect.id)
                        ? "bg-amber-100 text-amber-600"
                        : "bg-gray-100 text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <Star className={cn(
                      "w-4 h-4",
                      favorites.has(prospect.id) && "fill-current"
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
              <div className="px-6 pb-6 pt-2">
                <div className="pl-16">
                  {/* Riplace Angle */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Riplace Angle</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {prospect.riplaceAngle}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      — As of {prospect.lastUpdated}
                    </p>
                  </div>

                  {/* Sources */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {prospect.sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          {source.label}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* User Notes */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Add your own knowledge to refine your Riplace Strategies
                    </h4>
                    <Textarea
                      value={userNotes[prospect.id] || ''}
                      onChange={(e) => updateNote(prospect.id, e.target.value)}
                      placeholder="Chief is not a huge fan of something and is a dead zone. We should avoid and need a different way to navigate the market."
                      className="min-h-[80px] text-sm resize-none border-gray-300 focus:border-gray-400 focus:ring-0 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            className="h-12 px-6 text-base font-medium rounded-xl"
          >
            Back
          </Button>
          
          <div className="flex items-center gap-4">
            {favorites.size > 0 && (
              <span className="text-sm text-gray-600">
                {favorites.size} prospect{favorites.size > 1 ? 's' : ''} saved
              </span>
            )}
            <Button
              onClick={onComplete}
              className="h-12 px-8 text-base font-medium rounded-xl"
            >
              {favorites.size > 0 ? 'Continue to Dashboard' : 'Skip for Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

