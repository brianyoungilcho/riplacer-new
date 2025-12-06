import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Star, 
  ExternalLink, 
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteProspect {
  id: string;
  name: string;
  score: number;
  contractValue: string;
  reasonTag: string;
  reasonColor: 'green' | 'blue' | 'amber';
  riplaceAngle: string;
  sources: { label: string; url: string }[];
  lastUpdated: string;
  notes?: string;
  status: 'active' | 'contacted' | 'won' | 'lost';
}

// Mock favorite prospects
const MOCK_FAVORITES: FavoriteProspect[] = [
  {
    id: '1',
    name: 'Havensville PD',
    score: 85,
    contractValue: '$500,000/yr',
    reasonTag: 'Contract Expiring in <6 months',
    reasonColor: 'green',
    riplaceAngle: 'Their current Axon contract expires in March 2025. Recent city council meeting notes indicate frustration with support response times.',
    sources: [
      { label: 'City Council Minutes', url: 'https://example.com/source1' },
      { label: 'Budget Document', url: 'https://example.com/source2' },
    ],
    lastUpdated: '2025.12.06',
    notes: 'Called Chief Johnson - interested in a demo next week.',
    status: 'contacted',
  },
  {
    id: '2',
    name: 'Tontown PD',
    score: 75,
    contractValue: '$250,000/yr',
    reasonTag: 'New Chief in town',
    reasonColor: 'blue',
    riplaceAngle: 'New Police Chief John Martinez was hired from a department that used your solution.',
    sources: [
      { label: 'Press Release', url: 'https://example.com/source4' },
    ],
    lastUpdated: '2025.12.05',
    status: 'active',
  },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-gray-100 text-gray-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
];

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteProspect[]>(MOCK_FAVORITES);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const updateStatus = (id: string, status: FavoriteProspect['status']) => {
    setFavorites(prev => prev.map(f => 
      f.id === id ? { ...f, status } : f
    ));
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const saveNotes = (id: string, noteText: string) => {
    setFavorites(prev => prev.map(f => 
      f.id === id ? { ...f, notes: noteText } : f
    ));
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-gray-950">
        {/* Header */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">Saved Opportunities</h1>
            <Badge className="font-mono bg-gray-800 text-gray-300">
              {favorites.length} saved
            </Badge>
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-gray-300 border-gray-700">
            <RefreshCw className="w-4 h-4" />
            Refresh All
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Star className="w-16 h-16 text-gray-700 mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">No saved opportunities</h2>
              <p className="text-gray-400 text-sm max-w-md mb-4">
                Star prospects from the Discover page to save them here for tracking.
              </p>
              <Link to="/discover">
                <Button variant="outline" className="text-gray-300 border-gray-700">
                  Discover Prospects
                </Button>
              </Link>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {favorites.map(prospect => (
                <div
                  key={prospect.id}
                  className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    expandedId === prospect.id
                      ? "border-gray-600 bg-gray-800/50"
                      : "border-gray-800 bg-gray-900 hover:border-gray-700"
                  )}
                >
                  {/* Header Row */}
                  <div 
                    className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === prospect.id ? null : prospect.id)}
                  >
                    {/* Score */}
                    <div className="text-3xl font-bold text-white w-14 text-center">
                      {prospect.score}
                    </div>
                    
                    {/* Name & Value */}
                    <div className="flex-1">
                      <div className="font-semibold text-white">{prospect.name}</div>
                      <div className="text-sm text-gray-400">{prospect.contractValue}</div>
                    </div>
                    
                    {/* Reason Tag */}
                    <Badge 
                      className={cn(
                        "text-xs",
                        prospect.reasonColor === 'green' && "bg-green-900/50 text-green-400 border-green-700",
                        prospect.reasonColor === 'blue' && "bg-blue-900/50 text-blue-400 border-blue-700",
                        prospect.reasonColor === 'amber' && "bg-amber-900/50 text-amber-400 border-amber-700"
                      )}
                    >
                      {prospect.reasonTag}
                    </Badge>

                    {/* Status Dropdown */}
                    <select
                      value={prospect.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateStatus(prospect.id, e.target.value as FavoriteProspect['status']);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 border border-gray-700 text-gray-300"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    
                    {/* Expand Icon */}
                    {expandedId === prospect.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Expanded Content */}
                  {expandedId === prospect.id && (
                    <div className="px-4 pb-4 border-t border-gray-800 pt-4 space-y-4">
                      {/* Riplace Angle */}
                      <div>
                        <h4 className="font-semibold text-white mb-2">Riplace Angle</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {prospect.riplaceAngle}
                        </p>
                      </div>

                      {/* Date & Sources */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          Last updated: {prospect.lastUpdated}
                        </span>
                        <div className="flex gap-2">
                          {prospect.sources.map((source, i) => (
                            <a
                              key={i}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-800 rounded-full text-gray-400 hover:bg-gray-700 transition-colors flex items-center gap-1"
                            >
                              {source.label}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <h4 className="font-semibold text-white mb-2">Your Notes</h4>
                        <Textarea
                          placeholder="Add notes about this opportunity..."
                          value={notes[prospect.id] ?? prospect.notes ?? ''}
                          onChange={(e) => setNotes(prev => ({
                            ...prev,
                            [prospect.id]: e.target.value
                          }))}
                          onBlur={() => saveNotes(prospect.id, notes[prospect.id] ?? prospect.notes ?? '')}
                          className="min-h-[80px] text-sm bg-gray-800 border-gray-700 text-gray-300"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-400 border-red-900 hover:bg-red-900/20"
                          onClick={() => removeFavorite(prospect.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Daily update note */}
              <div className="text-center text-sm text-gray-500 pt-4">
                Saved opportunities are refreshed once daily with the latest intelligence.
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

