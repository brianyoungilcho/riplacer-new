import { useState, useEffect, useRef, useCallback } from 'react';
import { OnboardingData } from '../OnboardingPage';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Star, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';

interface DiscoveryTabProps {
  data: OnboardingData;
  onProspectSelect?: (prospect: Prospect | null) => void;
}

export interface Prospect {
  id: string;
  name: string;
  score: number;
  contractValue: string;
  highlight: string;
  highlightType: 'opportunity' | 'timing' | 'weakness';
  riplaceAngle: string;
  sources: { label: string; url: string }[];
  lastUpdated: string;
  lat?: number;
  lng?: number;
}

// Mock data generator for infinite scroll simulation
const generateMockProspects = (page: number, pageSize: number): Prospect[] => {
  const baseProspects = [
    { name: 'Havensville PD', highlight: 'Contract Expiring', highlightType: 'timing' as const, contractValue: '$500,000/yr', angle: 'Current contract with ShotSpotter expires March 2025. Recent city council meeting notes indicate budget concerns with renewal pricing.' },
    { name: 'Tontown PD', highlight: 'New Leadership', highlightType: 'opportunity' as const, contractValue: '$250,000/yr', angle: 'New police chief hired from neighboring county where they successfully implemented body cameras.' },
    { name: 'Chelsea PD', highlight: 'Competitor Issues', highlightType: 'weakness' as const, contractValue: '$125,000/yr', angle: 'Current vendor (Axon) facing class action lawsuit over data privacy concerns.' },
    { name: 'Riverside Sheriff', highlight: 'Budget Increase', highlightType: 'opportunity' as const, contractValue: '$180,000/yr', angle: 'County approved 15% increase to sheriff department technology budget for FY2025.' },
    { name: 'Millbrook PD', highlight: 'RFP Open', highlightType: 'timing' as const, contractValue: '$95,000/yr', angle: 'Active RFP for body-worn camera solution. Deadline is January 15, 2025.' },
    { name: 'Greenfield PD', highlight: 'New Funding', highlightType: 'opportunity' as const, contractValue: '$320,000/yr', angle: 'Received federal grant for public safety technology modernization.' },
    { name: 'Lakewood Sheriff', highlight: 'Contract Review', highlightType: 'timing' as const, contractValue: '$275,000/yr', angle: 'Annual contract review scheduled for Q1 2025. Previous complaints about service quality.' },
    { name: 'Summit City PD', highlight: 'Leadership Change', highlightType: 'opportunity' as const, contractValue: '$150,000/yr', angle: 'New IT director with background in modern cloud solutions.' },
  ];

  return Array.from({ length: pageSize }, (_, i) => {
    const idx = (page * pageSize + i) % baseProspects.length;
    const base = baseProspects[idx];
    const id = `prospect-${page}-${i}`;
    const score = Math.max(50, 95 - (page * 3) - Math.floor(Math.random() * 10));
    
    return {
      id,
      name: `${base.name}${page > 0 ? ` #${page * pageSize + i + 1}` : ''}`,
      score,
      contractValue: base.contractValue,
      highlight: base.highlight,
      highlightType: base.highlightType,
      riplaceAngle: base.angle,
      sources: [
        { label: 'City Council Minutes', url: '#' },
        { label: 'Budget Report', url: '#' },
      ],
      lastUpdated: '2025.12.06',
      lat: 39.7817 + (Math.random() - 0.5) * 0.5,
      lng: -89.6501 + (Math.random() - 0.5) * 0.5,
    };
  });
};

const PAGE_SIZE = 15;
const TOTAL_MOCK_PROSPECTS = 247;

export function DiscoveryTab({ data, onProspectSelect }: DiscoveryTabProps) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    // Simulate API delay
    const timer = setTimeout(() => {
      const initial = generateMockProspects(0, PAGE_SIZE);
      setProspects(initial);
      setIsLoading(false);
      setHasMore(initial.length < TOTAL_MOCK_PROSPECTS);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('riplacer_favorited_ids');
    if (saved) setFavoritedIds(new Set(JSON.parse(saved)));
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, page]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const nextPage = page + 1;
    
    // Simulate API delay
    setTimeout(() => {
      const newProspects = generateMockProspects(nextPage, PAGE_SIZE);
      setProspects(prev => [...prev, ...newProspects]);
      setPage(nextPage);
      setHasMore(prospects.length + newProspects.length < TOTAL_MOCK_PROSPECTS);
      setIsLoadingMore(false);
    }, 600);
  }, [page, isLoadingMore, hasMore, prospects.length]);

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
    localStorage.setItem('riplacer_favorited_ids', JSON.stringify(Array.from(newFavorited)));
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

  // Skeleton card component
  const SkeletonCard = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gray-200" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-48 bg-gray-100 rounded" />
        </div>
        <div className="w-9 h-9 rounded-lg bg-gray-100" />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isLoading ? 'Finding prospects...' : `${TOTAL_MOCK_PROSPECTS} Prospects Found`}
            </h2>
            <p className="text-sm text-gray-500">Sorted by Riplace Score</p>
          </div>
        </div>
      </div>

      {/* Prospects List with Infinite Scroll */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Initial loading */}
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {prospects.map((prospect, index) => (
              <div
                key={prospect.id}
                className={cn(
                  "bg-white border border-gray-200 rounded-xl transition-all duration-200",
                  expandedId === prospect.id ? "ring-2 ring-primary/20" : "hover:border-gray-300 hover:shadow-sm"
                )}
                style={{
                  animation: `fadeInUp 0.3s ease-out forwards`,
                  animationDelay: `${Math.min(index * 0.05, 0.3)}s`,
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

            {/* Loading more indicator */}
            <div ref={loadingRef} className="py-4">
              {isLoadingMore && (
                <div className="flex items-center justify-center gap-3 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading more prospects...</span>
                </div>
              )}
              {!hasMore && prospects.length > 0 && (
                <p className="text-center text-sm text-gray-400">
                  You've seen all {prospects.length} prospects
                </p>
              )}
            </div>

            {/* Skeleton cards while loading more */}
            {isLoadingMore && (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}
          </>
        )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
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
