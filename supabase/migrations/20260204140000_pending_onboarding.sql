-- Store onboarding data before OTP verification

create table if not exists pending_onboarding (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  data jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_pending_onboarding_email
  on pending_onboarding(email);

alter table pending_onboarding enable row level security;

-- Allow anyone to insert pending onboarding (pre-auth)
create policy "Anyone can insert pending onboarding"
  on pending_onboarding
  for insert
  with check (email is not null);

-- Only the authenticated user with matching email can read/delete
create policy "Users can view own pending onboarding"
  on pending_onboarding
  for select
  using ((auth.jwt() ->> 'email') = email);

create policy "Users can delete own pending onboarding"
  on pending_onboarding
  for delete
  using ((auth.jwt() ->> 'email') = email);
