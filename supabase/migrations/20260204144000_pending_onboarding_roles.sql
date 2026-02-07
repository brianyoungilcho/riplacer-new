-- Recreate policies with explicit roles

drop policy if exists "Anyone can insert pending onboarding" on pending_onboarding;
drop policy if exists "Anyone can update pending onboarding" on pending_onboarding;
drop policy if exists "Users can view own pending onboarding" on pending_onboarding;
drop policy if exists "Users can delete own pending onboarding" on pending_onboarding;

create policy "Anyone can insert pending onboarding"
  on pending_onboarding
  for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can update pending onboarding"
  on pending_onboarding
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Users can view own pending onboarding"
  on pending_onboarding
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = email);

create policy "Users can delete own pending onboarding"
  on pending_onboarding
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = email);
