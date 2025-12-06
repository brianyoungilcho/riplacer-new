import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { MapSearchResult, AIEnrichment } from '@/types';
import { 
  Globe, 
  Phone, 
  MapPin, 
  Sparkles, 
  Target,
  User,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Bookmark
} from 'lucide-react';

interface ProspectDetailModalProps {
  prospect: MapSearchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveToTargets: () => void;
}

export function ProspectDetailModal({ 
  prospect, 
  open, 
  onOpenChange,
  onSaveToTargets 
}: ProspectDetailModalProps) {
  const [enrichment, setEnrichment] = useState<AIEnrichment | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  // Check if already saved
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!prospect || !user) return;
      
      const { data } = await supabase
        .from('user_leads')
        .select('id')
        .eq('user_id', user.id)
        .eq('prospect_id', prospect.place_id)
        .maybeSingle();
      
      setIsSaved(!!data);
    };
    
    if (open) {
      checkIfSaved();
    }
  }, [prospect, user, open]);

  // Fetch enrichment when modal opens
  useEffect(() => {
    const fetchEnrichment = async () => {
      if (!prospect || !open || !profile) return;
      
      setLoading(true);
      setEnrichment(null);
      
      try {
        // First check if we have cached enrichment
        const { data: cached } = await supabase
          .from('prospects')
          .select('ai_enrichment_json')
          .eq('place_id', prospect.place_id)
          .maybeSingle();
        
        if (cached?.ai_enrichment_json) {
          setEnrichment(cached.ai_enrichment_json as AIEnrichment);
          setLoading(false);
          return;
        }

        // Otherwise, fetch fresh enrichment
        const { data, error } = await supabase.functions.invoke('enrich-prospect', {
          body: {
            prospect: {
              name: prospect.name,
              website_url: prospect.website,
              address: prospect.address,
            },
            user_context: {
              selling_proposition: profile.selling_proposition,
              competitors: profile.competitor_names,
            }
          }
        });

        if (error) throw error;
        
        setEnrichment(data.enrichment);
        
        // Cache the enrichment
        await supabase
          .from('prospects')
          .upsert([{
            place_id: prospect.place_id,
            name: prospect.name,
            address: prospect.address,
            lat: prospect.lat,
            lng: prospect.lng,
            website_url: prospect.website,
            phone: prospect.phone,
            ai_enrichment_json: data.enrichment as Json,
            enriched_at: new Date().toISOString(),
          }], { onConflict: 'place_id' });
          
      } catch (error) {
        console.error('Error fetching enrichment:', error);
        toast({
          title: 'Enrichment failed',
          description: 'Could not analyze this prospect. Try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEnrichment();
  }, [prospect, open, profile, toast]);

  const handleSaveToTargets = async () => {
    if (!prospect || !user) return;
    
    setSaving(true);
    
    try {
      // First ensure the prospect exists
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospects')
        .upsert([{
          place_id: prospect.place_id,
          name: prospect.name,
          address: prospect.address,
          lat: prospect.lat,
          lng: prospect.lng,
          website_url: prospect.website,
          phone: prospect.phone,
          ai_enrichment_json: enrichment as Json,
        }], { onConflict: 'place_id' })
        .select()
        .single();

      if (prospectError) throw prospectError;

      // Then create the user lead
      const { error: leadError } = await supabase
        .from('user_leads')
        .insert({
          user_id: user.id,
          prospect_id: prospectData.id,
          status: 'saved',
          ai_hook: enrichment?.rip_replace_argument || null,
        });

      if (leadError) {
        if (leadError.code === '23505') {
          toast({
            title: 'Already saved',
            description: 'This prospect is already in your targets.',
          });
          setIsSaved(true);
          return;
        }
        throw leadError;
      }

      setIsSaved(true);
      onSaveToTargets();
      toast({
        title: 'Saved to targets!',
        description: `${prospect.name} has been added to your targets.`,
      });
    } catch (error) {
      console.error('Error saving to targets:', error);
      toast({
        title: 'Error',
        description: 'Failed to save prospect. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!prospect) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto glass">
        <DialogHeader>
          <DialogTitle className="text-xl pr-8">{prospect.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Basic info */}
          <div className="space-y-3">
            {prospect.address && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">{prospect.address}</span>
              </div>
            )}
            {prospect.website && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a 
                  href={prospect.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {prospect.website.replace(/^https?:\/\//, '').slice(0, 40)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {prospect.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{prospect.phone}</span>
              </div>
            )}
          </div>

          {/* AI Enrichment Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">AI Insights</h3>
              <Badge variant="secondary" className="text-xs">
                AI Estimated
              </Badge>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : enrichment ? (
              <div className="space-y-4">
                {enrichment.decision_maker && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <User className="w-4 h-4 text-primary" />
                      Decision Maker
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {enrichment.decision_maker}
                    </p>
                  </div>
                )}

                {enrichment.competitor_presence && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Competitor Presence
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {enrichment.competitor_presence}
                    </p>
                  </div>
                )}

                {enrichment.rip_replace_argument && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Target className="w-4 h-4 text-primary" />
                      Rip & Replace Hook
                    </div>
                    <p className="text-sm text-foreground">
                      {enrichment.rip_replace_argument}
                    </p>
                  </div>
                )}

                {enrichment.pain_points && enrichment.pain_points.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Potential Pain Points</h4>
                    <div className="flex flex-wrap gap-2">
                      {enrichment.pain_points.map((point, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {point}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Could not analyze this prospect. The website may be inaccessible.
              </p>
            )}
          </div>

          {/* Action */}
          <div className="pt-2">
            <Button
              variant={isSaved ? "secondary" : "glow"}
              className="w-full"
              onClick={handleSaveToTargets}
              disabled={saving || isSaved}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSaved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Saved to Targets
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  Save to My Targets
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
