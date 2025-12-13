import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { AdvantageBrief, Advantage } from '@/hooks/useDiscoverySession';

interface AdvantagesBriefProps {
  brief: AdvantageBrief;
  sessionId?: string | null;
  className?: string;
}

export function AdvantagesBrief({ brief, sessionId, className }: AdvantagesBriefProps) {
  const [expandedAdvantage, setExpandedAdvantage] = useState<number | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Load saved notes from localStorage
  useEffect(() => {
    if (sessionId) {
      const saved = localStorage.getItem(`brief_notes_${sessionId}`);
      if (saved) {
        setUserNotes(saved);
      }
    }
  }, [sessionId]);
  
  // Save notes to localStorage
  const handleSaveNotes = async () => {
    if (!sessionId) {
      toast.error('Please sign in to save notes');
      return;
    }
    
    setIsSaving(true);
    try {
      localStorage.setItem(`brief_notes_${sessionId}`, userNotes);
      setIsEditing(false);
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-2">Strategic Advantage Brief</h3>
        <p className="text-sm text-gray-600">{brief.positioningSummary}</p>
      </div>

      {/* Advantages List */}
      <div className="divide-y divide-gray-100">
        {brief.advantages.map((advantage, idx) => (
          <AdvantageCard
            key={idx}
            advantage={advantage}
            isExpanded={expandedAdvantage === idx}
            onToggle={() => setExpandedAdvantage(expandedAdvantage === idx ? null : idx)}
          />
        ))}
      </div>

      {/* User Notes Section */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">Your Notes</h4>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {userNotes ? 'Edit' : 'Add'}
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Add your own insights, context, or strategic notes here..."
              className="min-h-[120px] text-sm resize-none border-gray-200 focus-visible:ring-primary"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveNotes}
                disabled={isSaving}
                size="sm"
                className="h-8"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Reload from localStorage to discard changes
                  if (sessionId) {
                    const saved = localStorage.getItem(`brief_notes_${sessionId}`);
                    setUserNotes(saved || '');
                  }
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {userNotes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{userNotes}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No notes yet. Click "Add" above to add your insights.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Last updated: {new Date(brief.lastUpdated).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

interface AdvantageCardProps {
  advantage: Advantage;
  isExpanded: boolean;
  onToggle: () => void;
}

function AdvantageCard({ advantage, isExpanded, onToggle }: AdvantageCardProps) {
  return (
    <div className="px-5 py-4">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 text-left group"
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
            {advantage.title}
          </h4>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
            {advantage.whyItMattersToBuyer}
          </p>
        </div>
        <div className="flex-shrink-0 pt-1">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Competitor Comparisons */}
          {advantage.competitorComparisons?.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                vs Competitors
              </h5>
              <div className="space-y-2">
                {advantage.competitorComparisons.map((comp, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {comp.competitor}
                      </span>
                      <span className="text-xs text-gray-400">
                        {Math.round(comp.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{comp.claim}</p>
                    {comp.citations?.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        {comp.citations.slice(0, 2).map((citation, cidx) => (
                          <a
                            key={cidx}
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {citation.title || 'Source'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talk Track */}
          {advantage.talkTrackBullets?.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Talk Track
              </h5>
              <ul className="space-y-1.5">
                {advantage.talkTrackBullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-primary mt-1">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Objections & Responses */}
          {advantage.objectionsAndResponses?.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Handle Objections
              </h5>
              <div className="space-y-2">
                {advantage.objectionsAndResponses.map((obj, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="text-gray-500 italic">"{obj.objection}"</p>
                    <p className="text-gray-700 mt-1">→ {obj.response}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
