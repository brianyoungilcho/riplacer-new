export interface Prospect {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  website_url: string | null;
  phone: string | null;
  place_id: string | null;
  ai_enrichment_json: AIEnrichment | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIEnrichment {
  decision_maker?: string;
  competitor_presence?: string;
  why_they_buy?: string;
  rip_replace_argument?: string;
  pain_points?: string[];
  tech_stack?: string[];
  summary?: string;
}

export interface UserLead {
  id: string;
  user_id: string;
  prospect_id: string;
  status: LeadStatus;
  notes: string | null;
  ai_hook: string | null;
  created_at: string;
  updated_at: string;
  prospect?: Prospect;
}

export type LeadStatus = 'saved' | 'contacted' | 'meeting_booked' | 'won' | 'lost' | 'irrelevant';

export interface MapSearchResult {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
}

export interface SearchParams {
  query: string;
  location: string;
  radius: number; // in miles
}
