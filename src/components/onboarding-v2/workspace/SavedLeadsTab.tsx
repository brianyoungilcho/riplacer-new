import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { 
  Star, 
  ExternalLink, 
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Prospect } from './DiscoveryTab';

interface SavedLeadsTabProps {
  onProspectSelect?: (prospect: SavedProspect | null) => void;
}

interface SavedProspect extends Prospect {
  notes?: string;
  status: 'active' | 'contacted' | 'won' | 'lost';
  savedAt: string;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-gray-100 text-gray-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
];

// Mock saved leads
const MOCK_SAVED_LEADS: SavedProspect[] = [
  {
    id: 'saved-1',
    name: 'Havensville PD',
    score: 85,
    contractValue: '$500,000/yr',
    highlight: 'Contract Expiring',
    highlightType: 'timing',
    riplaceAngle: 'Their current Axon contract expires in March 2025. Recent city council meeting notes indicate frustration with support response times. Budget discussions suggest they\'re open to alternatives.',
    sources: [
      { label: 'City Council Minutes', url: '#' },
      { label: 'Budget Document', url: '#' },
    ],
    lastUpdated: '2025.12.06',
    notes: 'Called Chief Johnson - interested in a demo next week.',
    status: 'contacted',
    savedAt: '2025.12.05',
  },
  {
    id: 'saved-2',
    name: 'Tontown PD',
    score: 75,
    contractValue: '$250,000/yr',
    highlight: 'New Leadership',
    highlightType: 'opportunity',
    riplaceAngle: 'New Police Chief John Martinez was hired from a department that used your solution. He has publicly spoken about modernization priorities.',
    sources: [
      { label: 'Press Release', url: '#' },
    ],
    lastUpdated: '2025.12.05',
    status: 'active',
    savedAt: '2025.12.04',
  },
];

export function SavedLeadsTab({ onProspectSelect }: SavedLeadsTabProps) {
  const [leads, setLeads] = useState<SavedProspect[]>(MOCK_SAVED_LEADS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load saved leads from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('riplacer_saved_leads');
    if (saved) {
      try {
        setLeads(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved leads:', e);
      }
    }
  }, []);

  // Save to localStorage when leads change
  useEffect(() => {
    localStorage.setItem('riplacer_saved_leads', JSON.stringify(leads));
  }, [leads]);

  const updateStatus = (id: string, status: SavedProspect['status']) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, status } : lead
    ));
    toast.success(`Status updated to ${status}`);
  };

  const removeLead = (id: string) => {
    setLeads(prev => prev.filter(lead => lead.id !== id));
    toast.success('Lead removed from saved');
  };

  const saveNotes = (id: string, noteText: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, notes: noteText } : lead
    ));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call to refresh intelligence
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLeads(prev => prev.map(lead => ({
      ...lead,
      lastUpdated: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
    })));
    
    setIsRefreshing(false);
    toast.success('Refreshed all leads with latest intelligence');
  };

  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'timing': return 'bg-amber-100 text-amber-800';
      case 'opportunity': return 'bg-green-100 text-green-800';
      case 'weakness': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Saved Leads
            </h2>
            <p className="text-sm text-gray-500">
              {leads.length} leads saved • Track your pipeline
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? 'Refreshing...' : 'Refresh All'}
          </Button>
        </div>
      </div>

      {/* Leads List */}
      <div className="flex-1 overflow-y-auto p-4">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Star className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved leads yet</h3>
            <p className="text-gray-500 text-sm max-w-md">
              Star prospects from the Discovery tab to save them here for tracking.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className={cn(
                  "bg-white border border-gray-200 rounded-xl transition-all overflow-hidden",
                  expandedId === lead.id
                    ? "ring-2 ring-primary/20"
                    : "hover:border-gray-300 hover:shadow-sm"
                )}
              >
                {/* Header Row */}
                <div 
                  className="p-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                >
                  {/* Score */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white flex-shrink-0">
                    <span className="text-xl font-bold">{lead.score}</span>
                  </div>
                  
                  {/* Name & Value */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        getHighlightColor(lead.highlightType)
                      )}>
                        {lead.highlight}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{lead.contractValue}</p>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={lead.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateStatus(lead.id, e.target.value as SavedProspect['status']);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  
                  {/* Expand Icon */}
                  {expandedId === lead.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Expanded Content */}
                {expandedId === lead.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
                    {/* Riplace Angle */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Riplace Angle</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {lead.riplaceAngle}
                      </p>
                    </div>

                    {/* Date & Sources */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        Last updated: {lead.lastUpdated}
                      </span>
                      <div className="flex gap-2">
                        {lead.sources.map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1 text-xs"
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
                        placeholder="Add notes about this lead..."
                        value={notes[lead.id] ?? lead.notes ?? ''}
                        onChange={(e) => setNotes(prev => ({
                          ...prev,
                          [lead.id]: e.target.value
                        }))}
                        onBlur={() => saveNotes(lead.id, notes[lead.id] ?? lead.notes ?? '')}
                        className="min-h-[80px] text-sm border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-400"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-gray-400">
                        Saved on {lead.savedAt}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => removeLead(lead.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Daily refresh note */}
            <p className="text-center text-xs text-gray-400 pt-4">
              Saved leads are refreshed daily with the latest intelligence.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
