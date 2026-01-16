# RLS Policy Patterns

This document defines reusable Row Level Security (RLS) patterns for TimeLi. Follow these patterns when adding RLS to new tables to ensure consistent security across the application.

## Core Patterns

### 1. User-Owns-Row Pattern

**When to use:** Table has a direct `user_id` foreign key referencing `auth.users`.

```sql
-- SELECT: User can only see their own rows
create policy "Users can view own [table_name]"
  on public.[table_name]
  for select
  using (auth.uid() = user_id);

-- INSERT: User can only insert rows for themselves
create policy "Users can create own [table_name]"
  on public.[table_name]
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: User can only update their own rows
create policy "Users can update own [table_name]"
  on public.[table_name]
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: User can only delete their own rows
create policy "Users can delete own [table_name]"
  on public.[table_name]
  for delete
  using (auth.uid() = user_id);
```

### 2. User-Owns-Via-Profile Pattern

**When to use:** Table references the `profiles` table instead of `auth.users` directly.

```sql
-- SELECT: User can only see rows linked to their profile
create policy "Users can view own [table_name]"
  on public.[table_name]
  for select
  using (auth.uid() = (SELECT id FROM profiles WHERE id = [table_name].profile_id));

-- INSERT: User can only insert rows for their profile
create policy "Users can create own [table_name]"
  on public.[table_name]
  for insert
  with check (auth.uid() = (SELECT id FROM profiles WHERE id = [table_name].profile_id));

-- UPDATE: User can only update rows linked to their profile
create policy "Users can update own [table_name]"
  on public.[table_name]
  for update
  using (auth.uid() = (SELECT id FROM profiles WHERE id = [table_name].profile_id))
  with check (auth.uid() = (SELECT id FROM profiles WHERE id = [table_name].profile_id));

-- DELETE: User can only delete rows linked to their profile
create policy "Users can delete own [table_name]"
  on public.[table_name]
  for delete
  using (auth.uid() = (SELECT id FROM profiles WHERE id = [table_name].profile_id));
```

### 3. Public-Read-User-Write Pattern

**When to use:** Data is publicly viewable but only editable by the owner.

```sql
-- SELECT: Anyone authenticated can read
create policy "Authenticated users can view all [table_name]"
  on public.[table_name]
  for select
  to authenticated
  using (true);

-- Or for truly public access (including anonymous):
create policy "Anyone can view all [table_name]"
  on public.[table_name]
  for select
  using (true);

-- INSERT/UPDATE/DELETE: Only owner can modify
create policy "Users can create own [table_name]"
  on public.[table_name]
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own [table_name]"
  on public.[table_name]
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own [table_name]"
  on public.[table_name]
  for delete
  using (auth.uid() = user_id);
```

### 4. Soft-Delete Pattern

**When to use:** Table uses soft deletes with a `deleted_at` timestamp column.

```sql
-- SELECT: User can only see non-deleted rows they own
create policy "Users can view own active [table_name]"
  on public.[table_name]
  for select
  using (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- UPDATE: User can update their own non-deleted rows
create policy "Users can update own active [table_name]"
  on public.[table_name]
  for update
  using (
    auth.uid() = user_id
    AND deleted_at IS NULL
  )
  with check (auth.uid() = user_id);

-- Note: For soft delete, UPDATE is used to set deleted_at
-- Hard DELETE policy typically not needed, but can be added for admin cleanup
```

## Checklist for New Tables

When adding a new table, complete this checklist:

- [ ] RLS enabled: `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;`
- [ ] SELECT policy created
- [ ] INSERT policy created (unless handled by trigger with SECURITY DEFINER)
- [ ] UPDATE policy created
- [ ] DELETE policy created (or document why not needed)
- [ ] Policies use `auth.uid()` for user identification
- [ ] Policies tested with different user contexts (see Testing section)

## Security Notes

### Service Role Key

The service role key bypasses RLS by default. This is intentional for server-side admin operations.

**CRITICAL:** Never expose the service role key to clients.

```typescript
// WRONG - Never do this in client code
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

// CORRECT - Always use anon key for client-side
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```

### SECURITY DEFINER Functions

Functions with `SECURITY DEFINER` bypass RLS. Use sparingly and only when necessary.

**Current usage:**
- `handle_new_user()` - Creates profile on signup (must bypass RLS to insert)

**When to use:**
- Triggers that need to insert/update data regardless of the calling user
- Admin-level operations that shouldn't be restricted by user context

**When NOT to use:**
- Regular API endpoints (use RLS instead)
- Anything that should respect user ownership

### Testing Policies

Always test policies with actual user sessions, not the service role.

```sql
-- Test as a specific user (in Supabase SQL editor)
SET request.jwt.claims = '{"sub": "user-uuid-here"}';

-- Then run your queries to verify policies work as expected
SELECT * FROM profiles; -- Should only return the user's own profile
```

## Migration Template

Use this template when creating RLS migrations for new tables:

```sql
-- RLS Policies for [table_name]
-- Phase X: [Phase Name] - Plan YY

-- Enable RLS
ALTER TABLE public.[table_name] ENABLE ROW LEVEL SECURITY;

-- SELECT policy: [description]
create policy "Users can view own [table_name]"
  on public.[table_name]
  for select
  using (auth.uid() = user_id);

-- INSERT policy: [description]
create policy "Users can create own [table_name]"
  on public.[table_name]
  for insert
  with check (auth.uid() = user_id);

-- UPDATE policy: [description]
create policy "Users can update own [table_name]"
  on public.[table_name]
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE policy: [description]
create policy "Users can delete own [table_name]"
  on public.[table_name]
  for delete
  using (auth.uid() = user_id);
```

## Current Table Policies

| Table | RLS Enabled | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|-------------|--------|--------|--------|--------|-------|
| profiles | Yes | Own only | Trigger | Own only | Cascade | INSERT via `handle_new_user()` trigger, DELETE cascades from auth.users |

---

*Last updated: Phase 3, Plan 01*
