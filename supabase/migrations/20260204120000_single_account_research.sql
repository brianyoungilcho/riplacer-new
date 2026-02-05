-- Single account research agent schema

create table if not exists research_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  product_description text not null,
  company_name text,
  company_domain text,
  territory_states jsonb default '[]'::jsonb,
  target_categories jsonb default '[]'::jsonb,
  competitors jsonb default '[]'::jsonb,
  target_account text not null,
  additional_context text,

  status text default 'pending',

  created_at timestamptz default now(),
  research_started_at timestamptz,
  research_completed_at timestamptz
);

create index if not exists idx_research_requests_user_id
  on research_requests(user_id, created_at desc);

create table if not exists research_reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references research_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,

  content jsonb not null,
  summary text,
  sources jsonb default '[]'::jsonb,
  generated_at timestamptz default now(),
  perplexity_tokens_used integer,

  unique(request_id)
);

create index if not exists idx_research_reports_user_id
  on research_reports(user_id, generated_at desc);

create table if not exists agent_memory (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references research_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  memory_type text not null,
  content jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_agent_memory_request_id
  on agent_memory(request_id, created_at desc);

create index if not exists idx_agent_memory_user_id
  on agent_memory(user_id, created_at desc);

alter table research_requests enable row level security;
alter table research_reports enable row level security;
alter table agent_memory enable row level security;

create policy "Users can manage own research requests"
  on research_requests
  for all
  using (auth.uid() = user_id);

create policy "Users can manage own research reports"
  on research_reports
  for all
  using (auth.uid() = user_id);

create policy "Users can manage own agent memory"
  on agent_memory
  for all
  using (auth.uid() = user_id);
