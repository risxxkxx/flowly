-- Flowly production RLS hardening migration
-- Run once in Supabase SQL Editor after the previous schema/time/deadline migrations.
-- Safe to run more than once.

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.items enable row level security;
alter table public.project_access enable row level security;

-- Baseline privilege hardening.
-- This migration changes database permissions only when you run it manually in Supabase.
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
REVOKE ALL ON public.users, public.projects, public.tasks, public.items, public.project_access FROM anon;
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects, public.tasks, public.items, public.project_access TO authenticated;

-- Remove old broad policies
DROP POLICY IF EXISTS "Users can read all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Owner full access to projects" ON public.projects;
DROP POLICY IF EXISTS "Viewer read access to projects" ON public.projects;
DROP POLICY IF EXISTS "Tasks own access" ON public.tasks;
DROP POLICY IF EXISTS "Viewer read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Owner full access to items" ON public.items;
DROP POLICY IF EXISTS "Viewer read items" ON public.items;
DROP POLICY IF EXISTS "Owner manages project access" ON public.project_access;
DROP POLICY IF EXISTS "Viewer sees own access" ON public.project_access;

-- Remove this migration's policies if re-running
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "projects_select_owner_or_viewer" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_owner" ON public.projects;
DROP POLICY IF EXISTS "projects_update_owner" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_owner" ON public.projects;
DROP POLICY IF EXISTS "tasks_select_owner_or_project_viewer" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_owner_valid_project" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_owner_valid_project" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_owner" ON public.tasks;
DROP POLICY IF EXISTS "items_select_owner_or_project_viewer" ON public.items;
DROP POLICY IF EXISTS "items_insert_project_owner" ON public.items;
DROP POLICY IF EXISTS "items_update_project_owner" ON public.items;
DROP POLICY IF EXISTS "items_delete_project_owner" ON public.items;
DROP POLICY IF EXISTS "project_access_select_owner_or_viewer" ON public.project_access;
DROP POLICY IF EXISTS "project_access_insert_project_owner" ON public.project_access;
DROP POLICY IF EXISTS "project_access_update_project_owner" ON public.project_access;
DROP POLICY IF EXISTS "project_access_delete_project_owner" ON public.project_access;

-- Users: users can only read/update their own profile.
-- Exact email lookup for invites is handled by the find_user_by_email RPC below.
CREATE POLICY "users_select_own"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "users_update_own"
ON public.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Safer invite lookup: exact email search without allowing users table enumeration.
CREATE OR REPLACE FUNCTION public.find_user_by_email(email_query text)
RETURNS TABLE (id uuid, email text, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id, u.email, u.full_name
  FROM public.users u
  WHERE lower(u.email) = lower(trim(email_query))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;

-- Projects: owner has write access; invited viewers have read-only access.
CREATE POLICY "projects_select_owner_or_viewer"
ON public.projects FOR SELECT
USING (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = projects.id
      AND pa.viewer_id = auth.uid()
  )
);

CREATE POLICY "projects_insert_owner"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "projects_update_owner"
ON public.projects FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "projects_delete_owner"
ON public.projects FOR DELETE
USING (auth.uid() = owner_id);

-- Tasks: user owns their standalone tasks. If linked to a project, the project must belong to them.
-- Invited viewers can read tasks for shared projects only.
CREATE POLICY "tasks_select_owner_or_project_viewer"
ON public.tasks FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = tasks.project_id
      AND pa.viewer_id = auth.uid()
  )
);

CREATE POLICY "tasks_insert_owner_valid_project"
ON public.tasks FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
        AND p.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "tasks_update_owner_valid_project"
ON public.tasks FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
        AND p.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "tasks_delete_owner"
ON public.tasks FOR DELETE
USING (auth.uid() = user_id);

-- Kanban items: project owner can write; invited viewers can read only.
CREATE POLICY "items_select_owner_or_project_viewer"
ON public.items FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.project_access pa
    WHERE pa.project_id = items.project_id
      AND pa.viewer_id = auth.uid()
  )
);

CREATE POLICY "items_insert_project_owner"
ON public.items FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = items.project_id
      AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "items_update_project_owner"
ON public.items FOR UPDATE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = items.project_id
      AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = items.project_id
      AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "items_delete_project_owner"
ON public.items FOR DELETE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = items.project_id
      AND p.owner_id = auth.uid()
  )
);

-- Project access: only the real project owner can grant/revoke access.
-- This closes the important hole where someone could create a project_access row for a project they do not own.
CREATE POLICY "project_access_select_owner_or_viewer"
ON public.project_access FOR SELECT
USING (auth.uid() = owner_id OR auth.uid() = viewer_id);

CREATE POLICY "project_access_insert_project_owner"
ON public.project_access FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  AND viewer_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_access.project_id
      AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "project_access_update_project_owner"
ON public.project_access FOR UPDATE
USING (
  auth.uid() = owner_id
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_access.project_id
      AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = owner_id
  AND viewer_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_access.project_id
      AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "project_access_delete_project_owner"
ON public.project_access FOR DELETE
USING (
  auth.uid() = owner_id
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_access.project_id
      AND p.owner_id = auth.uid()
  )
);
