-- FinanZen — Row Level Security policies
-- Principle: a user may only touch rows where user_id = auth.uid().
-- Apply after 0001_init.sql. Run in the Supabase SQL editor or via CLI.
--
-- IMPORTANT: RLS is one layer of defense-in-depth, not the only one.
-- NestJS still validates the Supabase access token and re-checks ownership
-- server-side; it never trusts a userId supplied by the client. Admin
-- operations are performed by the NestJS backend using the service role
-- key (which bypasses RLS) after explicit RBAC checks in application code —
-- there are intentionally no "admins can do everything" RLS policies here.

-- ============================================================================
-- PROFILES
-- ============================================================================
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- role and status are intentionally NOT updatable by the row owner;
    -- enforce that in application code / a trigger, not by trusting the client.
  );

-- No insert/delete policy for authenticated users: profile rows are created
-- exclusively by the handle_new_user() trigger (security definer) and
-- deleted only via cascade from auth.users or by admin backend flows.

-- ============================================================================
-- CATEGORIES
-- ============================================================================
alter table public.categories enable row level security;

create policy "categories_select_own_or_global"
  on public.categories for select
  using (user_id is null or auth.uid() = user_id);

create policy "categories_insert_own"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "categories_update_own"
  on public.categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories_delete_own"
  on public.categories for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
alter table public.transactions enable row level security;

create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- BUDGETS
-- ============================================================================
alter table public.budgets enable row level security;

create policy "budgets_select_own"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "budgets_insert_own"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "budgets_update_own"
  on public.budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "budgets_delete_own"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- SAVINGS GOALS
-- ============================================================================
alter table public.savings_goals enable row level security;

create policy "savings_goals_select_own"
  on public.savings_goals for select
  using (auth.uid() = user_id);

create policy "savings_goals_insert_own"
  on public.savings_goals for insert
  with check (auth.uid() = user_id);

create policy "savings_goals_update_own"
  on public.savings_goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "savings_goals_delete_own"
  on public.savings_goals for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- GOAL MOVEMENTS
-- ============================================================================
alter table public.goal_movements enable row level security;

create policy "goal_movements_select_own"
  on public.goal_movements for select
  using (auth.uid() = user_id);

create policy "goal_movements_insert_own"
  on public.goal_movements for insert
  with check (auth.uid() = user_id);

-- Movements are an immutable history: no update/delete policies.

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================
alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Inserts are performed by the backend via the service role (notification
-- workers), so no insert policy is granted to the authenticated role.

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
alter table public.audit_logs enable row level security;

-- Deliberately no policies for anon/authenticated: audit logs are written
-- and read exclusively by the NestJS backend using the service role key.
