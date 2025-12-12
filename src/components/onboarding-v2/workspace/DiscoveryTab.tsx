import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { OnboardingData } from '../OnboardingPage';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Star, ChevronDown, ChevronUp, ExternalLink, Loader2, Search, SlidersHorizontal, ArrowUpDown, X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
interface DiscoveryTabProps {
  data: OnboardingData;
  onProspectSelect?: (prospect: Prospect | null) => void;
  onProspectsChange?: (prospects: Prospect[]) => void;
  selectedProspectId?: string | null;
}

export interface Prospect {
  id: string;
  name: string;
  score: number;
  contractValue: string;
  highlight: string;
  highlightType: 'opportunity' | 'timing' | 'weakness';
  riplaceAngle: string;
  angles?: string[]; // Minimal “how to win” tags (from API if available)
  sources: { label: string; url: string }[];
  lastUpdated: string;
  lat?: number;
  lng?: number;
  state?: string; // State where prospect is located
  isDeleted?: boolean; // Soft delete flag
}

// Sort options
type SortOption = 'score' | 'contractValue' | 'name';

// Filter types
interface Filters {
  highlightTypes: ('opportunity' | 'timing' | 'weakness')[];
  contractValueRange: 'all' | 'under50k' | '50k-200k' | 'over200k';
  scoreRange: 'all' | 'above80' | '60-80' | 'below60';
}

// Helper to parse contract value string to number
const parseContractValue = (value: string): number => {
  const match = value.match(/\$?([\d,]+)/);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return 0;
};

const inferAngles = (prospect: Pick<Prospect, 'highlight' | 'highlightType'>): string[] => {
  const h = (prospect.highlight || '').toLowerCase();
  const angles: string[] = [];

  if (h.includes('rfp')) angles.push('Angle: RFP response');
  if (h.includes('contract') || h.includes('renew') || h.includes('expir') || prospect.highlightType === 'timing') {
    angles.push('Angle: Renewal window');
  }
  if (h.includes('fund') || h.includes('grant') || h.includes('budget') || prospect.highlightType === 'opportunity') {
    angles.push('Angle: Budget / funding');
  }
  if (h.includes('leader') || h.includes('chief') || h.includes('cio')) angles.push('Angle: Leadership transition');
  if (h.includes('vendor') || h.includes('issue') || h.includes('complaint') || prospect.highlightType === 'weakness') {
    angles.push('Angle: Replacement play');
  }

  // De-dupe while preserving order
  return Array.from(new Set(angles));
};
const PAGE_SIZE = 10;

export function DiscoveryTab({ data, onProspectSelect, onProspectsChange, selectedProspectId }: DiscoveryTabProps) {
  const { user } = useAuth();
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
  
  // Search, Sort, and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    highlightTypes: [],
    contractValueRange: 'all',
    scoreRange: 'all',
  });
  
  // Undo state for soft delete
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ prospect: Prospect; timeout: NodeJS.Timeout } | null>(null);
  
  // Add prospect state
  const [isAddingProspect, setIsAddingProspect] = useState(false);
  const [addProspectLocation, setAddProspectLocation] = useState('');

  // Filter and sort prospects
  const filteredAndSortedProspects = useMemo(() => {
    let result = prospects.filter(p => !p.isDeleted);
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.riplaceAngle.toLowerCase().includes(query)
      );
    }
    
    // Apply highlight type filter
    if (filters.highlightTypes.length > 0) {
      result = result.filter(p => filters.highlightTypes.includes(p.highlightType));
    }
    
    // Apply contract value filter
    if (filters.contractValueRange !== 'all') {
      result = result.filter(p => {
        const value = parseContractValue(p.contractValue);
        switch (filters.contractValueRange) {
          case 'under50k': return value < 50000;
          case '50k-200k': return value >= 50000 && value <= 200000;
          case 'over200k': return value > 200000;
          default: return true;
        }
      });
    }
    
    // Apply score filter
    if (filters.scoreRange !== 'all') {
      result = result.filter(p => {
        switch (filters.scoreRange) {
          case 'above80': return p.score >= 80;
          case '60-80': return p.score >= 60 && p.score < 80;
          case 'below60': return p.score < 60;
          default: return true;
        }
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'contractValue':
          return parseContractValue(b.contractValue) - parseContractValue(a.contractValue);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    
    return result;
  }, [prospects, searchQuery, filters, sortBy]);
  
  // Check if search has no results (for "Add prospect" prompt)
  const showAddProspectPrompt = searchQuery.trim().length > 2 && filteredAndSortedProspects.length === 0 && !isLoading;
  
  // Count active filters
  const activeFilterCount = 
    filters.highlightTypes.length + 
    (filters.contractValueRange !== 'all' ? 1 : 0) + 
    (filters.scoreRange !== 'all' ? 1 : 0);
  
  // For unauth users, limit to 10 prospects
  const displayProspects = useMemo(() => {
    if (!user) {
      return filteredAndSortedProspects.slice(0, 10);
    }
    return filteredAndSortedProspects;
  }, [filteredAndSortedProspects, user]);
  
  const hiddenProspectCount = !user ? Math.max(0, filteredAndSortedProspects.length - 10) : 0;

  // Notify parent of prospects changes (for map markers)
  useEffect(() => {
    onProspectsChange?.(displayProspects);
  }, [displayProspects, onProspectsChange]);

  // Ref for scrolling to expanded card
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Expand card when selected from map and scroll into view
  useEffect(() => {
    if (selectedProspectId && selectedProspectId !== expandedId) {
      setExpandedId(selectedProspectId);
      
      // Scroll the card into view after a short delay to allow expansion
      setTimeout(() => {
        const cardElement = cardRefs.current.get(selectedProspectId);
        if (cardElement) {
          cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [selectedProspectId]);

  // Initial load - fetch prospects from API
  useEffect(() => {
    const fetchProspects = async () => {
      setIsLoading(true);
      setProspects([]);
      setPage(0);
      
      try {
        console.log('🔍 [DiscoveryTab] Fetching prospects from API...');
        const { data: response, error } = await supabase.functions.invoke('discover-prospects', {
          body: {
            productDescription: data.productDescription,
            territory: { states: data.states },
            targetCategories: data.targetCategories,
            competitors: data.competitors,
            page: 0,
            pageSize: PAGE_SIZE,
            existingProspectIds: [],
          }
        });

        if (error) {
          console.error('Discover prospects API error:', error);
          toast.error('Failed to load prospects');
          setIsLoading(false);
          return;
        }

        console.log('✅ [DiscoveryTab] Prospects received:', response);
        
        if (response?.prospects && Array.isArray(response.prospects)) {
          const mappedProspects: Prospect[] = response.prospects.map((p: any) => ({
            id: p.id,
            name: p.name,
            score: p.score || 70,
            contractValue: p.contractValue || '$100K/yr',
            highlight: p.highlight || 'Opportunity',
            highlightType: (p.highlightType as 'opportunity' | 'timing' | 'weakness') || 'opportunity',
            riplaceAngle: p.riplaceAngle || '',
            angles: Array.isArray(p.angles) ? p.angles : undefined,
            sources: p.sources || [],
            lastUpdated: p.lastUpdated || new Date().toISOString(),
            lat: p.lat,
            lng: p.lng,
            state: p.state,
          }));
          setProspects(mappedProspects);
          setHasMore(response.hasMore ?? false);
        }
      } catch (err) {
        console.error('Failed to fetch prospects:', err);
        toast.error('Failed to load prospects');
      } finally {
        setIsLoading(false);
      }
    };

    if (data.states?.length > 0) {
      fetchProspects();
    }
  }, [data.states, data.productDescription, data.targetCategories, data.competitors]);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('riplacer_favorited_ids');
    if (saved) setFavoritedIds(new Set(JSON.parse(saved)));
  }, []);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setSortDropdownOpen(false);
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const nextPage = page + 1;
    
    try {
      const existingIds = prospects.map(p => p.id);
      const { data: response, error } = await supabase.functions.invoke('discover-prospects', {
        body: {
          productDescription: data.productDescription,
          territory: { states: data.states },
          targetCategories: data.targetCategories,
          competitors: data.competitors,
          page: nextPage,
          pageSize: PAGE_SIZE,
          existingProspectIds: existingIds,
        }
      });

      if (error) {
        console.error('Load more error:', error);
        setIsLoadingMore(false);
        return;
      }

      if (response?.prospects && Array.isArray(response.prospects)) {
        const mappedProspects: Prospect[] = response.prospects.map((p: any) => ({
          id: p.id,
          name: p.name,
          score: p.score || 70,
          contractValue: p.contractValue || '$100K/yr',
          highlight: p.highlight || 'Opportunity',
          highlightType: (p.highlightType as 'opportunity' | 'timing' | 'weakness') || 'opportunity',
          riplaceAngle: p.riplaceAngle || '',
          angles: Array.isArray(p.angles) ? p.angles : undefined,
          sources: p.sources || [],
          lastUpdated: p.lastUpdated || new Date().toISOString(),
          lat: p.lat,
          lng: p.lng,
          state: p.state,
        }));
        setProspects(prev => [...prev, ...mappedProspects]);
        setPage(nextPage);
        setHasMore(response.hasMore ?? false);
      }
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, isLoadingMore, hasMore, prospects, data.states, data.productDescription, data.targetCategories, data.competitors]);

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

  // Soft delete a prospect with undo capability
  const deleteProspect = useCallback((prospect: Prospect) => {
    // Clear any existing undo timeout
    if (recentlyDeleted?.timeout) {
      clearTimeout(recentlyDeleted.timeout);
    }
    
    // Mark as deleted
    setProspects(prev => prev.map(p => 
      p.id === prospect.id ? { ...p, isDeleted: true } : p
    ));
    
    // Set up undo with 5 second window
    const timeout = setTimeout(() => {
      setRecentlyDeleted(null);
    }, 5000);
    
    setRecentlyDeleted({ prospect, timeout });
  }, [recentlyDeleted]);
  
  // Undo delete
  const undoDelete = useCallback(() => {
    if (recentlyDeleted) {
      clearTimeout(recentlyDeleted.timeout);
      setProspects(prev => prev.map(p => 
        p.id === recentlyDeleted.prospect.id ? { ...p, isDeleted: false } : p
      ));
      setRecentlyDeleted(null);
    }
  }, [recentlyDeleted]);
  
  // Clear a specific filter
  const clearFilter = useCallback((filterType: 'highlightTypes' | 'contractValueRange' | 'scoreRange', value?: string) => {
    setFilters(prev => {
      if (filterType === 'highlightTypes' && value) {
        return { ...prev, highlightTypes: prev.highlightTypes.filter(t => t !== value) };
      }
      if (filterType === 'contractValueRange') {
        return { ...prev, contractValueRange: 'all' };
      }
      if (filterType === 'scoreRange') {
        return { ...prev, scoreRange: 'all' };
      }
      return prev;
    });
  }, []);
  
  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({
      highlightTypes: [],
      contractValueRange: 'all',
      scoreRange: 'all',
    });
    setSearchQuery('');
  }, []);
  
  // Handle adding a new prospect (placeholder - needs backend)
  const handleAddProspect = useCallback(() => {
    if (!user) {
      // Show sign up prompt for unauth users
      return;
    }
    setIsAddingProspect(true);
    // TODO: Call backend API to research and add prospect
    // For now, just show loading state
    setTimeout(() => {
      setIsAddingProspect(false);
      setSearchQuery('');
    }, 2000);
  }, [user, searchQuery]);

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

  // Sort option labels
  const sortLabels: Record<SortOption, string> = {
    score: 'Riplace Score',
    contractValue: 'Contract Value',
    name: 'Name (A-Z)',
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isLoading ? 'Finding prospects...' : `${filteredAndSortedProspects.length} Prospects Found`}
            </h2>
            <p className="text-sm text-gray-500">Sorted by {sortLabels[sortBy]}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative" data-dropdown>
              <button
                onClick={(e) => { e.stopPropagation(); setSortDropdownOpen(!sortDropdownOpen); setFilterDropdownOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                Sort
                <ChevronDown className="w-4 h-4" />
              </button>
              {sortDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  {(['score', 'contractValue', 'name'] as SortOption[]).map(option => (
                    <button
                      key={option}
                      onClick={() => { setSortBy(option); setSortDropdownOpen(false); }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg",
                        sortBy === option ? "bg-gray-50 text-primary font-medium" : "text-gray-700"
                      )}
                    >
                      {sortLabels[option]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Filter Dropdown */}
            <div className="relative" data-dropdown>
              <button
                onClick={(e) => { e.stopPropagation(); setFilterDropdownOpen(!filterDropdownOpen); setSortDropdownOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filterDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 space-y-4">
                  {/* Highlight Type */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Highlight Type</p>
                    <div className="flex flex-wrap gap-2">
                      {(['timing', 'opportunity', 'weakness'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setFilters(prev => ({
                              ...prev,
                              highlightTypes: prev.highlightTypes.includes(type)
                                ? prev.highlightTypes.filter(t => t !== type)
                                : [...prev.highlightTypes, type]
                            }));
                          }}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
                            filters.highlightTypes.includes(type)
                              ? type === 'timing' ? "bg-amber-500 text-white" 
                                : type === 'opportunity' ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Contract Value Range */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Contract Value</p>
                    <div className="space-y-1">
                      {[
                        { value: 'all', label: 'All values' },
                        { value: 'under50k', label: 'Under $50K' },
                        { value: '50k-200k', label: '$50K - $200K' },
                        { value: 'over200k', label: 'Over $200K' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setFilters(prev => ({ ...prev, contractValueRange: option.value as Filters['contractValueRange'] }))}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded text-sm transition-colors",
                            filters.contractValueRange === option.value
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Score Range */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Riplace Score</p>
                    <div className="space-y-1">
                      {[
                        { value: 'all', label: 'All scores' },
                        { value: 'above80', label: '80+ (Hot)' },
                        { value: '60-80', label: '60-80 (Warm)' },
                        { value: 'below60', label: 'Below 60' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setFilters(prev => ({ ...prev, scoreRange: option.value as Filters['scoreRange'] }))}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded text-sm transition-colors",
                            filters.scoreRange === option.value
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="w-full text-center text-sm text-gray-500 hover:text-gray-700 pt-2 border-t border-gray-100"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prospects or type to add new..."
            className="pl-10 pr-10 h-10 bg-gray-50 border-gray-200 focus-visible:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
          )}
        </div>
        
        {/* Active Filters */}
        {(activeFilterCount > 0 || searchQuery) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <span className="text-sm text-gray-500">Active:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                Search: "{searchQuery.slice(0, 20)}{searchQuery.length > 20 ? '...' : ''}"
                <button onClick={() => setSearchQuery('')} className="hover:text-gray-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.highlightTypes.map(type => (
              <span 
                key={type}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm capitalize",
                  type === 'timing' ? "bg-amber-50 text-amber-700"
                    : type === 'opportunity' ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                )}
              >
                {type}
                <button onClick={() => clearFilter('highlightTypes', type)} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {filters.contractValueRange !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                {filters.contractValueRange === 'under50k' ? 'Under $50K' 
                  : filters.contractValueRange === '50k-200k' ? '$50K-$200K' 
                  : 'Over $200K'}
                <button onClick={() => clearFilter('contractValueRange')} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.scoreRange !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                Score: {filters.scoreRange === 'above80' ? '80+' : filters.scoreRange === '60-80' ? '60-80' : '<60'}
                <button onClick={() => clearFilter('scoreRange')} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-sm text-gray-500 hover:text-gray-700 ml-2">
              Clear all
            </button>
          </div>
        )}
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
        ) : showAddProspectPrompt ? (
          /* No results - show add prospect prompt */
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No prospects found</h3>
            <p className="text-sm text-gray-500 mb-4">
              Can't find "{searchQuery}"? Add it as a new prospect.
            </p>
            {user ? (
              <button
                onClick={handleAddProspect}
                disabled={isAddingProspect}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isAddingProspect ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isAddingProspect ? 'Researching...' : `Add "${searchQuery}"`}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">Sign up to add custom prospects</p>
                <a
                  href="/auth"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Sign Up Free
                </a>
              </div>
            )}
          </div>
        ) : (
          <>
            {displayProspects.map((prospect, index) => {
              const angles = (prospect.angles?.length ? prospect.angles : inferAngles(prospect)).slice(0, 2);
              return (
              <div
                key={prospect.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(prospect.id, el);
                  else cardRefs.current.delete(prospect.id);
                }}
                className={cn(
                  "bg-white border border-gray-200 rounded-xl transition-all duration-200",
                  expandedId === prospect.id ? "ring-2 ring-primary/20" : "hover:border-gray-300 hover:shadow-sm",
                  selectedProspectId === prospect.id && "ring-2 ring-red-500"
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
                      {angles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {angles.map((angle) => (
                            <span
                              key={angle}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {angle}
                            </span>
                          ))}
                        </div>
                      )}
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
                        title="Save to favorites"
                      >
                        <Star className={cn(
                          "w-4 h-4",
                          favoritedIds.has(prospect.id) && "fill-current"
                        )} />
                      </button>
                      {user && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProspect(prospect);
                          }}
                          className="w-9 h-9 rounded-lg bg-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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

                      {/* Angles */}
                      {angles.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Angles</h4>
                          <div className="flex flex-wrap gap-2">
                            {angles.map((angle) => (
                              <span
                                key={angle}
                                className="inline-flex items-center px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700"
                              >
                                {angle}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

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
              );
            })}

            {/* Unauth user limit card */}
            {!user && hiddenProspectCount > 0 && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-center">
                <h4 className="font-bold text-white text-lg mb-1">Unlock {hiddenProspectCount} more prospects</h4>
                <p className="text-gray-400 text-sm mb-4">Plus: Save leads, delete prospects, add custom prospects, AI insights</p>
                <a
                  href="/auth"
                  className="inline-block w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Sign Up Free →
                </a>
                <p className="text-xs text-gray-500 mt-3">No credit card required</p>
              </div>
            )}

            {/* Loading more indicator */}
            {user && (
              <div ref={loadingRef} className="py-4">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-3 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading more prospects...</span>
                  </div>
                )}
                {!hasMore && displayProspects.length > 0 && (
                  <p className="text-center text-sm text-gray-400">
                    You've seen all {displayProspects.length} prospects
                  </p>
                )}
              </div>
            )}

            {/* Skeleton cards while loading more */}
            {isLoadingMore && user && (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Undo delete toast */}
      {recentlyDeleted && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-900 text-white rounded-xl p-4 flex items-center justify-between shadow-lg z-30 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-red-400" />
            <span className="text-sm">{recentlyDeleted.prospect.name} removed from list</span>
          </div>
          <button 
            onClick={undoDelete}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Undo
          </button>
        </div>
      )}

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

