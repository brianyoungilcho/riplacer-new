-- Create enum for lead status
CREATE TYPE public.lead_status AS ENUM ('saved', 'contacted', 'meeting_booked', 'won', 'lost', 'irrelevant');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  company_website TEXT,
  selling_proposition TEXT,
  competitor_names TEXT[] DEFAULT '{}',
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create prospects table (the cache layer)
CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  lat FLOAT,
  lng FLOAT,
  website_url TEXT,
  phone TEXT,
  place_id TEXT UNIQUE,
  ai_enrichment_json JSONB,
  enriched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on prospects (publicly readable since it's a cache)
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Prospects policies - anyone authenticated can read
CREATE POLICY "Authenticated users can read prospects" ON public.prospects
  FOR SELECT TO authenticated USING (true);

-- Only system (via service role) inserts prospects, but allow authenticated users too
CREATE POLICY "Authenticated users can insert prospects" ON public.prospects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update prospects" ON public.prospects
  FOR UPDATE TO authenticated USING (true);

-- Create user_leads table (the CRM layer)
CREATE TABLE public.user_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE NOT NULL,
  status lead_status DEFAULT 'saved',
  notes TEXT,
  ai_hook TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, prospect_id)
);

-- Enable RLS on user_leads
ALTER TABLE public.user_leads ENABLE ROW LEVEL SECURITY;

-- User leads policies - users can only see their own
CREATE POLICY "Users can view own leads" ON public.user_leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON public.user_leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON public.user_leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads" ON public.user_leads
  FOR DELETE USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_leads_updated_at
  BEFORE UPDATE ON public.user_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();