import { useState, memo } from 'react';
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
  AlertCircle,
  Heart,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DiscoveryProspect, ProspectDossier } from '@/hooks/useDiscoverySession';

interface ProspectDossierCardProps {
  prospect: DiscoveryProspect;
  isExpanded: boolean;
  onToggle: () => void;
  onGeneratePlan?: () => void;
  showGeneratePlan?: boolean;
  isFavorited?: boolean;
  onFavoriteToggle?: (prospectId: string, isFavorited: boolean) => void;
  isAuthenticated?: boolean;
  className?: string;
}

export function ProspectDossierCard({ 
  prospect, 
  isExpanded, 
  onToggle, 
  onGeneratePlan,
  showGeneratePlan = true,
  isFavorited = false,
  onFavoriteToggle,
  isAuthenticated = false,
  className 
}: ProspectDossierCardProps) {
  const [showAllAngles, setShowAllAngles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const dossier = prospect.dossier;
  
  // Handle favorite toggle
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Sign up to save prospects to your favorites');
      return;
    }
    
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      if (isFavorited) {
        // Remove from favorites - we'd need a delete endpoint, for now just toggle state
        onFavoriteToggle?.(prospect.prospectId, false);
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase.functions.invoke('save-prospect', {
          body: {
            place_id: prospect.prospectId,
            prospect_data: {
              name: prospect.name,
              address: prospect.state,
              lat: prospect.lat,
              lng: prospect.lng,
              enrichment: {
                riplace_score: prospect.dossier?.score || prospect.score || prospect.initialScore || 0,
                summary: prospect.dossier?.summary,
                angles: prospect.dossier?.anglesForList || prospect.angles,
              }
            }
          }
        });
        
        if (error) throw error;
        
        onFavoriteToggle?.(prospect.prospectId, true);
        toast.success('Added to favorites');
      }
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
      toast.error(err.message || 'Failed to save prospect');
    } finally {
      setIsSaving(false);
    }
  };
  // Check if we have ANY meaningful data to show
  // Initial data from discovery includes: score, angles, summary
  // Deep research adds: incumbent, stakeholders, contract, etc.
  const score = dossier?.score || prospect.score || prospect.initialScore || 0;
  const angles = dossier?.anglesForList || prospect.angles || [];
  const hasAnyData = score > 0 || angles.length > 0 || dossier?.summary;
  
  // Show content if we have any data - don't wait for "ready" status
  const isReady = hasAnyData;
  const isDeepResearching = prospect.dossierStatus === 'researching' || prospect.researchStatus === 'researching';
  const isQueued = (prospect.dossierStatus === 'queued' || prospect.researchStatus === 'queued') && !hasAnyData;
  const isFailed = prospect.dossierStatus === 'failed' || prospect.researchStatus === 'failed';

  // score and angles already computed above

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'bg-red-500';
    if (s >= 60) return 'bg-red-400';
    return 'bg-red-300';
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
            {isDeepResearching && (
              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
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

        {/* Favorite & Expand Icons */}
        <div className="flex items-center gap-1 flex-shrink-0 pt-1">
          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            disabled={isSaving}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isFavorited 
                ? "text-red-500 bg-red-50 hover:bg-red-100" 
                : "text-gray-400 hover:text-red-500 hover:bg-gray-100",
              isSaving && "opacity-50 cursor-not-allowed"
            )}
            title={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={cn("w-4 h-4", isFavorited && "fill-current")} />
          </button>
          
          {/* Expand Icon */}
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
          {isReady ? (
            <DossierContent 
              prospect={prospect}
              dossier={dossier} 
              score={score}
              angles={angles}
              onGeneratePlan={showGeneratePlan ? onGeneratePlan : undefined}
              isEnriching={isDeepResearching || prospect.dossierStatus === 'queued'}
            />
          ) : isQueued ? (
            <DossierSkeleton />
          ) : isFailed ? (
            <div className="py-8 text-center">
              <AlertCircle className="w-8 h-8 text-destructive/60 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Research failed. Try again later.</p>
            </div>
          ) : (
            <DossierSkeleton />
          )}
        </div>
      )}
    </div>
  );
}

// Skeleton loading component for consistent loading state
function DossierSkeleton() {
  return (
    <div className="pt-4 space-y-4">
      {/* Summary skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded skeleton-shimmer w-full" />
        <div className="h-4 bg-muted rounded skeleton-shimmer w-4/5" />
        <div className="h-4 bg-muted rounded skeleton-shimmer w-3/5" />
      </div>
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="h-3 bg-muted rounded skeleton-shimmer w-20" />
          <div className="h-4 bg-muted rounded skeleton-shimmer w-24" />
        </div>
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="h-3 bg-muted rounded skeleton-shimmer w-16" />
          <div className="h-4 bg-muted rounded skeleton-shimmer w-28" />
        </div>
      </div>
      
      {/* Stakeholders skeleton */}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded skeleton-shimmer w-24" />
        <div className="h-4 bg-muted rounded skeleton-shimmer w-40" />
        <div className="h-4 bg-muted rounded skeleton-shimmer w-36" />
      </div>
    </div>
  );
}

interface DossierContentProps {
  prospect: DiscoveryProspect;
  dossier?: ProspectDossier;
  score: number;
  angles: string[];
  onGeneratePlan?: () => void;
  isEnriching?: boolean;
}

function DossierContent({ prospect, dossier, score, angles, onGeneratePlan, isEnriching }: DossierContentProps) {
  // Show summary from dossier, or generate a basic one from available data
  const summary = dossier?.summary || (angles.length > 0 
    ? `${prospect.name} in ${prospect.state} shows potential for replacement with signals including: ${angles.join(', ')}.`
    : null);

  return (
    <div className="pt-4 space-y-5">
      {/* Enrichment indicator */}
      {isEnriching && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Deep research in progress... Results will update automatically.</span>
        </div>
      )}
      
      {/* Summary */}
      {summary ? (
        <div>
          <p className="text-sm text-foreground/80">{summary}</p>
        </div>
      ) : isEnriching ? (
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded skeleton-shimmer w-full" />
          <div className="h-4 bg-muted rounded skeleton-shimmer w-4/5" />
        </div>
      ) : null}

      {/* Incumbent & Contract - only show if dossier has this data */}
      {(dossier?.incumbent || dossier?.contract) && (
        <div className="grid grid-cols-2 gap-4">
          {dossier?.incumbent && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <Building2 className="w-3.5 h-3.5" />
                Current Vendor
              </div>
              <p className="text-sm font-medium text-foreground">
                {dossier.incumbent.vendor || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {Math.round((dossier.incumbent.confidence || 0) * 100)}% confidence
              </p>
            </div>
          )}
          
          {dossier?.contract && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <FileText className="w-3.5 h-3.5" />
                Contract
              </div>
              <p className="text-sm font-medium text-foreground">
                {dossier.contract.estimatedAnnualValue || 'Unknown value'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Expires: {dossier.contract.estimatedExpiration || 'Unknown'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stakeholders */}
      {dossier?.stakeholders && dossier.stakeholders.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Users className="w-3.5 h-3.5" />
            Key Stakeholders
          </div>
          <div className="space-y-2">
            {dossier.stakeholders.slice(0, 3).map((s, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-foreground/80">{s.name || 'Unknown'}</span>
                  {s.title && <span className="text-muted-foreground ml-1">• {s.title}</span>}
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    s.stance === 'supporter' && "border-green-200 text-green-700",
                    s.stance === 'opponent' && "border-red-200 text-red-700",
                    s.stance === 'neutral' && "border-border text-muted-foreground"
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
      {dossier?.macroSignals && dossier.macroSignals.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Signals
          </div>
          <div className="flex flex-wrap gap-2">
            {dossier.macroSignals.map((signal, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {signal.type}: {signal.description?.slice(0, 40) || 'Unknown'}...
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Angles */}
      {dossier?.recommendedAngles && dossier.recommendedAngles.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Lightbulb className="w-3.5 h-3.5" />
            Recommended Angles
          </div>
          <div className="space-y-2">
            {dossier.recommendedAngles.map((angle, idx) => (
              <div key={idx} className="bg-primary/5 rounded-lg p-3">
                <h5 className="text-sm font-medium text-primary">{angle.title}</h5>
                <p className="text-sm text-muted-foreground mt-1">{angle.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources / Citations */}
      {dossier?.sources && dossier.sources.length > 0 && (
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
            <ExternalLink className="w-3.5 h-3.5" />
            Research Sources ({dossier.sources.length})
          </div>
          <div className="space-y-2">
            {dossier.sources.slice(0, 8).map((source, idx) => {
              let hostname = 'Source';
              try {
                if (source.url) hostname = new URL(source.url).hostname.replace('www.', '');
              } catch {}
              
              // Format date if available
              const formattedDate = source.publishedDate 
                ? new Date(source.publishedDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })
                : null;
              
              return (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ExternalLink className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                      {source.title || hostname}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{hostname}</span>
                      {formattedDate && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            {formattedDate}
                          </span>
                        </>
                      )}
                    </div>
                    {source.excerpt && (
                      <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                        {source.excerpt}
                      </p>
                    )}
                  </div>
                </a>
              );
            })}
            {dossier.sources.length > 8 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{dossier.sources.length - 8} more sources
              </p>
            )}
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

// Memoize component to prevent unnecessary re-renders when parent updates
export const ProspectDossierCardMemo = memo(ProspectDossierCard, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if relevant props changed
  // Using shallow comparison of key dossier fields instead of expensive JSON.stringify
  const prevDossier = prevProps.prospect.dossier;
  const nextDossier = nextProps.prospect.dossier;
  
  const dossierEqual = 
    prevDossier === nextDossier || // Same reference (common case)
    (
      prevDossier?.score === nextDossier?.score &&
      prevDossier?.summary === nextDossier?.summary &&
      prevDossier?.lastUpdated === nextDossier?.lastUpdated &&
      prevDossier?.incumbent?.vendor === nextDossier?.incumbent?.vendor &&
      prevDossier?.stakeholders?.length === nextDossier?.stakeholders?.length &&
      prevDossier?.recommendedAngles?.length === nextDossier?.recommendedAngles?.length
    );
  
  return (
    prevProps.prospect.prospectId === nextProps.prospect.prospectId &&
    prevProps.prospect.dossierStatus === nextProps.prospect.dossierStatus &&
    prevProps.prospect.researchStatus === nextProps.prospect.researchStatus &&
    prevProps.prospect.score === nextProps.prospect.score &&
    prevProps.prospect.initialScore === nextProps.prospect.initialScore &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.showGeneratePlan === nextProps.showGeneratePlan &&
    prevProps.isFavorited === nextProps.isFavorited &&
    prevProps.isAuthenticated === nextProps.isAuthenticated &&
    dossierEqual
  );
});
