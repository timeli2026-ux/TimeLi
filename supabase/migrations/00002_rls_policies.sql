-- RLS Policies for TimeLi
-- Phase 3: Database & RLS - Plan 01

-- =============================================================================
-- PROFILES TABLE POLICIES
-- =============================================================================
--
-- Policy design notes:
-- - INSERT not needed: handle_new_user() trigger uses SECURITY DEFINER
--   to automatically create profiles on signup. This function runs with
--   elevated privileges bypassing RLS.
-- - DELETE not needed: cascade delete from auth.users handles cleanup.
--   When a user is deleted from auth.users, their profile is automatically
--   deleted via the ON DELETE CASCADE constraint.
-- - Service role bypasses RLS by default (for admin operations).
--   IMPORTANT: NEVER expose service_role key to clients - use anon key only.
--
-- =============================================================================

-- SELECT policy: Users can only read their own profile
-- This ensures users cannot query other users' profile data
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- UPDATE policy: Users can only update their own profile
-- This ensures users cannot modify other users' profile data
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- =============================================================================
-- NOTES FOR FUTURE TABLES
-- =============================================================================
-- When adding RLS to new tables, follow patterns documented in:
-- docs/rls-policy-patterns.md
--
-- Common patterns:
-- 1. User-owns-row: auth.uid() = user_id
-- 2. User-owns-via-profile: auth.uid() = (SELECT id FROM profiles WHERE id = table.profile_id)
-- 3. Public-read-user-write: SELECT true, INSERT/UPDATE/DELETE auth.uid() = user_id
-- 4. Soft-delete: Include deleted_at IS NULL in SELECT policies
-- =============================================================================
