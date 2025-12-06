import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserLead, LeadStatus, Prospect } from '@/types';
import { 
  Download, 
  Globe, 
  MapPin, 
  Phone,
  Trash2,
  ExternalLink,
  Loader2
} from 'lucide-react';

const statusConfig: Record<LeadStatus, { label: string; color: string }> = {
  saved: { label: 'Saved', color: 'bg-gray-700 text-gray-200' },
  contacted: { label: 'Contacted', color: 'bg-primary/20 text-primary' },
  meeting_booked: { label: 'Meeting Booked', color: 'bg-amber-500/20 text-amber-400' },
  won: { label: 'Won', color: 'bg-green-500/20 text-green-400' },
  lost: { label: 'Lost', color: 'bg-red-500/20 text-red-400' },
  irrelevant: { label: 'Irrelevant', color: 'bg-gray-600 text-gray-400' },
};

interface LeadWithProspect extends UserLead {
  prospects: Prospect;
}

export default function Targets() {
  const [leads, setLeads] = useState<LeadWithProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLeads = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_leads')
        .select(`
          *,
          prospects (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data as LeadWithProspect[]);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your targets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [user]);

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      const { error } = await supabase
        .from('user_leads')
        .update({ status })
        .eq('id', leadId);

      if (error) throw error;
      
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status } : lead
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const updateLeadNotes = async (leadId: string, notes: string) => {
    setSavingNotes(leadId);
    try {
      const { error } = await supabase
        .from('user_leads')
        .update({ notes })
        .eq('id', leadId);

      if (error) throw error;
      
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, notes } : lead
      ));
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    } finally {
      setSavingNotes(null);
    }
  };

  const deleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('user_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      
      setLeads(leads.filter(lead => lead.id !== leadId));
      toast({
        title: 'Lead removed',
        description: 'The lead has been removed from your targets',
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove lead',
        variant: 'destructive',
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Address', 'Website', 'Phone', 'Status', 'AI Hook', 'Notes'];
    const rows = leads.map(lead => [
      lead.prospects.name,
      lead.prospects.address || '',
      lead.prospects.website_url || '',
      lead.prospects.phone || '',
      statusConfig[lead.status].label,
      lead.ai_hook || '',
      lead.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `riplacer-targets-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Export complete',
      description: `Exported ${leads.length} leads to CSV`,
    });
  };

  const statCounts = {
    total: leads.length,
    saved: leads.filter(l => l.status === 'saved').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    meeting_booked: leads.filter(l => l.status === 'meeting_booked').length,
    won: leads.filter(l => l.status === 'won').length,
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-hidden flex flex-col bg-gray-950">
        {/* Header */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">My Targets</h1>
            <Badge className="font-mono bg-gray-800 text-gray-300">
              {statCounts.total} leads
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCSV}
            disabled={leads.length === 0}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </header>

        {/* Stats bar */}
        <div className="h-14 border-b border-gray-800 flex items-center gap-6 px-6 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Saved:</span>
            <span className="font-mono font-semibold text-gray-300">{statCounts.saved}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Contacted:</span>
            <span className="font-mono font-semibold text-primary">{statCounts.contacted}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Meetings:</span>
            <span className="font-mono font-semibold text-amber-400">{statCounts.meeting_booked}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Won:</span>
            <span className="font-mono font-semibold text-green-400">{statCounts.won}</span>
          </div>
        </div>

        {/* Leads list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <h2 className="text-lg font-semibold text-white mb-2">No targets yet</h2>
              <p className="text-gray-400 text-sm max-w-md">
                Start by searching for prospects in the Discovery tab and saving them to your targets.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div key={lead.id} className="p-5 rounded-xl bg-gray-900 border border-gray-800">
                  <div className="flex gap-6">
                    {/* Left: Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg text-white">
                            {lead.prospects.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                            {lead.prospects.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {lead.prospects.address}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={lead.status}
                            onValueChange={(value) => updateLeadStatus(lead.id, value as LeadStatus)}
                          >
                            <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              {Object.entries(statusConfig).map(([value, config]) => (
                                <SelectItem key={value} value={value} className="text-gray-200 focus:bg-gray-700 focus:text-white">
                                  {config.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteLead(lead.id)}
                            className="text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Contact info */}
                      <div className="flex items-center gap-4 text-sm">
                        {lead.prospects.website_url && (
                          <a
                            href={lead.prospects.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Globe className="w-3 h-3" />
                            Website
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {lead.prospects.phone && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <Phone className="w-3 h-3" />
                            {lead.prospects.phone}
                          </span>
                        )}
                      </div>

                      {/* AI Hook */}
                      {lead.ai_hook && (
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="text-xs font-medium text-primary mb-1">
                            Suggested approach
                          </div>
                          <p className="text-sm text-gray-200">{lead.ai_hook}</p>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500">
                          Notes
                        </label>
                        <Textarea
                          placeholder="Add notes about this lead..."
                          defaultValue={lead.notes || ''}
                          onBlur={(e) => {
                            if (e.target.value !== lead.notes) {
                              updateLeadNotes(lead.id, e.target.value);
                            }
                          }}
                          className="min-h-[60px] text-sm resize-none bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500 focus:border-primary"
                        />
                        {savingNotes === lead.id && (
                          <p className="text-xs text-gray-500">Saving...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
