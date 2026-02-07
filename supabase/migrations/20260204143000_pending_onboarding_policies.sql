-- Ensure pending_onboarding policies and grants exist

alter table pending_onboarding enable row level security;

drop policy if exists "Anyone can insert pending onboarding" on pending_onboarding;
drop policy if exists "Anyone can update pending onboarding" on pending_onboarding;
drop policy if exists "Users can view own pending onboarding" on pending_onboarding;
drop policy if exists "Users can delete own pending onboarding" on pending_onboarding;

create policy "Anyone can insert pending onboarding"
  on pending_onboarding
  for insert
  with check (true);

create policy "Anyone can update pending onboarding"
  on pending_onboarding
  for update
  using (true)
  with check (true);

create policy "Users can view own pending onboarding"
  on pending_onboarding
  for select
  using ((auth.jwt() ->> 'email') = email);

create policy "Users can delete own pending onboarding"
  on pending_onboarding
  for delete
  using ((auth.jwt() ->> 'email') = email);

grant insert, update on pending_onboarding to anon, authenticated;
grant select, delete on pending_onboarding to authenticated;
