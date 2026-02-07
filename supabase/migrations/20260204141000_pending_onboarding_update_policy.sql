-- Allow updating pending onboarding records (upsert requires update policy)

create policy "Anyone can update pending onboarding"
  on pending_onboarding
  for update
  using (true)
  with check (email is not null);
