-- Relax RLS for pending_onboarding inserts/updates (anon)

drop policy if exists "Anyone can insert pending onboarding" on pending_onboarding;
drop policy if exists "Anyone can update pending onboarding" on pending_onboarding;

create policy "Anyone can insert pending onboarding"
  on pending_onboarding
  for insert
  with check (true);

create policy "Anyone can update pending onboarding"
  on pending_onboarding
  for update
  using (true)
  with check (true);
