import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Lightbulb, Shield, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdvantageBrief, Advantage } from '@/hooks/useDiscoverySession';

interface AdvantagesBriefProps {
  brief: AdvantageBrief;
  className?: string;
}

export function AdvantagesBrief({ brief, className }: AdvantagesBriefProps) {
  const [expandedAdvantage, setExpandedAdvantage] = useState<number | null>(null);

  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">Strategic Advantage Brief</h3>
        </div>
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
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
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
        <div className="mt-4 pl-11 space-y-4">
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
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
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
