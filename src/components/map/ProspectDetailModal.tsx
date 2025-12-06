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
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Bookmark
} from 'lucide-react';

// Mock enrichment for dev environment
const MOCK_ENRICHMENT: AIEnrichment = {
  decision_maker: 'Chief of Police or IT Director (typically handles technology procurement)',
  competitor_presence: 'Currently using legacy fleet management system - likely Samsara or Verizon Connect based on typical government contracts',
  why_they_buy: 'Government agencies prioritize compliance, cost savings, and operational efficiency',
  rip_replace_argument: 'Their current solution likely lacks modern AI-powered route optimization and real-time analytics. Highlight 30% fuel savings and compliance automation.',
  pain_points: ['Manual reporting', 'High fuel costs', 'Outdated interface', 'Limited integrations'],
  tech_stack: ['Legacy systems', 'Paper-based processes'],
  summary: 'High-value target with likely outdated fleet management. Focus on TCO reduction and compliance benefits.',
};

interface ProspectDetailModalProps {
  prospect: MapSearchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveToTargets: () => void;
  isMockData?: boolean;
}

export function ProspectDetailModal({ 
  prospect, 
  open, 
  onOpenChange,
  onSaveToTargets,
  isMockData = false,
}: ProspectDetailModalProps) {
  const [enrichment, setEnrichment] = useState<AIEnrichment | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [usingMockEnrichment, setUsingMockEnrichment] = useState(false);
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  // Check if already saved
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!prospect || !user || isMockData) {
        setIsSaved(false);
        return;
      }
      
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
  }, [prospect, user, open, isMockData]);

  // Fetch enrichment when modal opens
  useEffect(() => {
    const fetchEnrichment = async () => {
      if (!prospect || !open || !profile) return;
      
      setLoading(true);
      setEnrichment(null);
      setUsingMockEnrichment(false);
      
      try {
        // First check if we have cached enrichment (skip for mock data)
        if (!isMockData) {
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
        
        // Cache the enrichment (skip for mock data)
        if (!isMockData) {
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
        }
          
      } catch (error) {
        console.error('Error fetching enrichment:', error);
        
        // Use mock enrichment in dev
        setUsingMockEnrichment(true);
        setEnrichment(MOCK_ENRICHMENT);
        
        toast({
          title: 'Using sample insights',
          description: 'AI enrichment unavailable. Showing sample data.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEnrichment();
  }, [prospect, open, profile, toast, isMockData]);

  const handleSaveToTargets = async () => {
    if (!prospect || !user) return;
    
    // For mock data, just show a toast
    if (isMockData) {
      toast({
        title: 'Demo mode',
        description: 'Saving is disabled in demo mode. Sign up to save prospects!',
      });
      return;
    }
    
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl pr-8 text-white">{prospect.name}</DialogTitle>
        </DialogHeader>

        {/* Mock data indicator */}
        {(isMockData || usingMockEnrichment) && (
          <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-500">
              {isMockData ? 'Sample prospect data' : 'Sample AI insights'}
            </span>
          </div>
        )}

        <div className="space-y-6 pt-2">
          {/* Basic info */}
          <div className="space-y-3">
            {prospect.address && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-gray-300">{prospect.address}</span>
              </div>
            )}
            {prospect.website && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-gray-400" />
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
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{prospect.phone}</span>
              </div>
            )}
          </div>

          {/* AI Enrichment Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Insights</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-gray-800" />
                <Skeleton className="h-4 w-3/4 bg-gray-800" />
                <Skeleton className="h-16 w-full bg-gray-800" />
                <Skeleton className="h-4 w-1/2 bg-gray-800" />
              </div>
            ) : enrichment ? (
              <div className="space-y-4">
                {enrichment.decision_maker && (
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-sm font-medium mb-1 text-white">
                      Decision Maker
                    </div>
                    <p className="text-sm text-gray-300">
                      {enrichment.decision_maker}
                    </p>
                  </div>
                )}

                {enrichment.competitor_presence && (
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="text-sm font-medium mb-1 text-white">
                      Competitor Presence
                    </div>
                    <p className="text-sm text-gray-300">
                      {enrichment.competitor_presence}
                    </p>
                  </div>
                )}

                {enrichment.rip_replace_argument && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                    <div className="text-sm font-medium mb-1 text-white">
                      Suggested Approach
                    </div>
                    <p className="text-sm text-gray-200">
                      {enrichment.rip_replace_argument}
                    </p>
                  </div>
                )}

                {enrichment.pain_points && enrichment.pain_points.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-white">Potential Pain Points</h4>
                    <div className="flex flex-wrap gap-2">
                      {enrichment.pain_points.map((point, i) => (
                        <Badge key={i} className="text-xs bg-gray-800 text-gray-300 border-gray-700">
                          {point}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
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
