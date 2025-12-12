import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Building2, 
  Users, 
  FileText, 
  TrendingUp,
  Lightbulb,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { DiscoveryProspect, ProspectDossier } from '@/hooks/useDiscoverySession';

interface ProspectDossierCardProps {
  prospect: DiscoveryProspect;
  isExpanded: boolean;
  onToggle: () => void;
  onGeneratePlan?: () => void;
  className?: string;
}

export function ProspectDossierCard({ 
  prospect, 
  isExpanded, 
  onToggle, 
  onGeneratePlan,
  className 
}: ProspectDossierCardProps) {
  const [showAllAngles, setShowAllAngles] = useState(false);
  
  const dossier = prospect.dossier;
  const isReady = prospect.dossierStatus === 'ready' && dossier;
  const isResearching = prospect.dossierStatus === 'researching' || prospect.researchStatus === 'researching';
  const isFailed = prospect.dossierStatus === 'failed' || prospect.researchStatus === 'failed';

  const score = dossier?.score || prospect.score || prospect.initialScore || 0;
  const angles = dossier?.anglesForList || prospect.angles || [];

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'bg-green-500';
    if (s >= 60) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-xl overflow-hidden transition-shadow",
      isExpanded && "shadow-lg",
      className
    )}>
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        {/* Score Circle */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0",
          getScoreColor(score)
        )}>
          {score}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 truncate">
              {prospect.name}
            </h4>
            {isResearching && (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
            )}
            {isFailed && (
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-500">{prospect.state}</p>
          
          {/* Angle Chips */}
          {angles.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {angles.slice(0, 2).map((angle, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs bg-primary/10 text-primary border-0"
                >
                  {angle}
                </Badge>
              ))}
              {angles.length > 2 && (
                <span className="text-xs text-gray-400">
                  +{angles.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand Icon */}
        <div className="flex-shrink-0 pt-1">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {isResearching ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Researching this prospect...</p>
            </div>
          ) : isFailed ? (
            <div className="py-8 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Research failed. Try again later.</p>
            </div>
          ) : isReady && dossier ? (
            <DossierContent 
              dossier={dossier} 
              onGeneratePlan={onGeneratePlan}
            />
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">Waiting for research to start...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface DossierContentProps {
  dossier: ProspectDossier;
  onGeneratePlan?: () => void;
}

function DossierContent({ dossier, onGeneratePlan }: DossierContentProps) {
  return (
    <div className="pt-4 space-y-5">
      {/* Summary */}
      <div>
        <p className="text-sm text-gray-700">{dossier.summary}</p>
      </div>

      {/* Incumbent & Contract */}
      <div className="grid grid-cols-2 gap-4">
        {dossier.incumbent && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
              <Building2 className="w-3.5 h-3.5" />
              Current Vendor
            </div>
            <p className="text-sm font-medium text-gray-900">
              {dossier.incumbent.vendor || 'Unknown'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {Math.round(dossier.incumbent.confidence * 100)}% confidence
            </p>
          </div>
        )}
        
        {dossier.contract && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
              <FileText className="w-3.5 h-3.5" />
              Contract
            </div>
            <p className="text-sm font-medium text-gray-900">
              {dossier.contract.estimatedAnnualValue || 'Unknown value'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Expires: {dossier.contract.estimatedExpiration || 'Unknown'}
            </p>
          </div>
        )}
      </div>

      {/* Stakeholders */}
      {dossier.stakeholders && dossier.stakeholders.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
            <Users className="w-3.5 h-3.5" />
            Key Stakeholders
          </div>
          <div className="space-y-2">
            {dossier.stakeholders.slice(0, 3).map((s, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-700">{s.name || 'Unknown'}</span>
                  {s.title && <span className="text-gray-400 ml-1">• {s.title}</span>}
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    s.stance === 'supporter' && "border-green-200 text-green-700",
                    s.stance === 'opponent' && "border-red-200 text-red-700",
                    s.stance === 'neutral' && "border-gray-200 text-gray-600"
                  )}
                >
                  {s.stance}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Macro Signals */}
      {dossier.macroSignals && dossier.macroSignals.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Signals
          </div>
          <div className="flex flex-wrap gap-2">
            {dossier.macroSignals.map((signal, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {signal.type}: {signal.description.slice(0, 40)}...
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Angles */}
      {dossier.recommendedAngles && dossier.recommendedAngles.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
            <Lightbulb className="w-3.5 h-3.5" />
            Recommended Angles
          </div>
          <div className="space-y-2">
            {dossier.recommendedAngles.map((angle, idx) => (
              <div key={idx} className="bg-primary/5 rounded-lg p-3">
                <h5 className="text-sm font-medium text-primary">{angle.title}</h5>
                <p className="text-sm text-gray-600 mt-1">{angle.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {dossier.sources && dossier.sources.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-2">Sources</div>
          <div className="flex flex-wrap gap-2">
            {dossier.sources.slice(0, 5).map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {source.title || new URL(source.url).hostname}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Generate Plan Button */}
      {onGeneratePlan && (
        <button
          onClick={onGeneratePlan}
          className="w-full py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Generate Account Plan
        </button>
      )}
    </div>
  );
}
