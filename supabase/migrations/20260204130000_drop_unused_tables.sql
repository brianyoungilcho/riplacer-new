-- Drop unused discovery, CRM, and research tables

-- Drop tables with foreign key dependencies first
drop table if exists rep_notes;
drop table if exists prospect_dossiers;
drop table if exists advantage_briefs;
drop table if exists research_jobs;
drop table if exists user_leads;
drop table if exists agent_memory;

-- Drop main tables
drop table if exists prospects;
drop table if exists prospect_discovery_cache;
drop table if exists user_prospect_lists;
drop table if exists user_territories;
drop table if exists user_categories;
drop table if exists user_competitors;
drop table if exists competitor_research_cache;
drop table if exists discovery_sessions;

-- Drop enum if no longer needed
drop type if exists lead_status;
