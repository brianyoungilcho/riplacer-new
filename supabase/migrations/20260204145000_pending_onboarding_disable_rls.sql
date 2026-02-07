-- Disable RLS for pending_onboarding (public write)

alter table pending_onboarding disable row level security;

drop policy if exists "Anyone can insert pending onboarding" on pending_onboarding;
drop policy if exists "Anyone can update pending onboarding" on pending_onboarding;
drop policy if exists "Users can view own pending onboarding" on pending_onboarding;
drop policy if exists "Users can delete own pending onboarding" on pending_onboarding;
