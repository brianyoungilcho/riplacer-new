import { useState } from 'react';
import { Heart, ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { TARGET_SECTORS, type Prospect } from '@/data/us-regions';
import { cn } from '@/lib/utils';

interface ProspectResultsProps {
  prospects: Prospect[];
  selectedProspect: Prospect | null;
  onSelectProspect: (prospect: Prospect | null) => void;
  filters: {
    sectors: string[];
    competitors: string[];
  };
}

export function ProspectResults({ 
  prospects, 
  selectedProspect, 
  onSelectProspect,
  filters 
}: ProspectResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    const prospect = prospects.find(p => p.id === id);
    if (prospect) {
      onSelectProspect(expandedId === id ? null : prospect);
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getReasonTagColor = (tag: string) => {
    if (tag.includes('Contract Expiring')) return 'bg-green-100 text-green-700';
    if (tag.includes('New')) return 'bg-blue-100 text-blue-700';
    if (tag.includes('Competitor')) return 'bg-red-100 text-red-700';
    if (tag.includes('Grant')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filter pills */}
      <div className="p-4 border-b border-gray-200 flex flex-wrap gap-2">
        {filters.sectors.map((sectorId) => {
          const sector = TARGET_SECTORS.find(s => s.id === sectorId);
          return (
            <span 
              key={sectorId}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700"
            >
              {sector?.name || sectorId}
            </span>
          );
        })}
        {filters.competitors.map((competitor) => (
          <span 
            key={competitor}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-sm text-primary"
          >
            Uses {competitor}
          </span>
        ))}
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {prospects.map((prospect) => {
          const isExpanded = expandedId === prospect.id;
          const isFavorite = favorites.has(prospect.id);

          return (
            <div
              key={prospect.id}
              className={cn(
                "border-b border-gray-200 cursor-pointer transition-colors",
                isExpanded ? "bg-gray-50" : "hover:bg-gray-50"
              )}
            >
              {/* Compact row */}
              <div 
                className="p-4 flex items-center gap-4"
                onClick={() => toggleExpanded(prospect.id)}
              >
                {/* Riplace Score */}
                <div className={cn("text-3xl font-bold w-12", getScoreColor(prospect.riplaceScore))}>
                  {prospect.riplaceScore}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{prospect.name}</span>
                    <span className="text-sm text-gray-500">
                      {formatCurrency(prospect.contractValue)}/yr
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      getReasonTagColor(prospect.reasonTag)
                    )}>
                      {prospect.reasonTag}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => toggleFavorite(prospect.id, e)}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      isFavorite 
                        ? "text-red-500 bg-red-50" 
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 ml-16">
                  {/* Riplace Angle */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Riplace Angle</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {prospect.riplaceAngle}
                    </p>
                    <p className="text-xs text-gray-500 mt-3">
                      - As of {prospect.lastUpdated}
                    </p>

                    {/* Sources */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {prospect.sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          Source
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* User notes */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Add your own knowledge to refine your Riplace Strategies
                    </h4>
                    <Textarea
                      placeholder="e.g., Chief is not a huge fan of something and is a dead zone. We should avoid and need a different way to navigate the market..."
                      className="min-h-[80px] text-sm resize-none"
                      value={notes[prospect.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [prospect.id]: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Quick info */}
                  <div className="flex gap-4 mt-4 text-sm text-gray-500">
                    {prospect.currentVendor && (
                      <span>Current: {prospect.currentVendor}</span>
                    )}
                    {prospect.decisionMaker && (
                      <span>Decision Maker: {prospect.decisionMaker}</span>
                    )}
                    {prospect.employeeCount && (
                      <span>{prospect.employeeCount} employees</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Favorites summary */}
      {favorites.size > 0 && (
        <div className="p-4 border-t border-gray-200 bg-primary/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {favorites.size} prospect{favorites.size !== 1 ? 's' : ''} favorited
            </span>
            <Button variant="glow" size="sm">
              View Favorites
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

