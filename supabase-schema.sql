-- Flowly base schema
-- Intended for a fresh Supabase project.
-- Security defaults are strict: anonymous users receive no direct table access,
-- authenticated users are constrained by Row Level Security (RLS).

create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.projects (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  description text,
  category text not null default 'work' check (category in ('work', 'chores')),
  color text not null default '#475569',
  created_at timestamptz default now()
);

create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  category text not null default 'work' check (category in ('work', 'chores')),
  completed boolean not null default false,
  completed_at timestamptz,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  total_seconds integer not null default 0,
  timer_started_at timestamptz,
  created_at timestamptz default now()
);

create table public.items (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'inprogress', 'done')),
  notes text,
  item_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  completed_at timestamptz,
  total_seconds integer not null default 0,
  timer_started_at timestamptz,
  created_at timestamptz default now()
);

create table public.project_access (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  owner_id uuid references public.users(id) on delete cascade not null,
  viewer_id uuid references public.users(id) on delete cascade not null,
  granted_at timestamptz default now(),
  unique(project_id, viewer_id)
);

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.items enable row level security;
alter table public.project_access enable row level security;

-- No direct anonymous table access.
revoke all on public.users, public.projects, public.tasks, public.items, public.project_access from anon;

-- Authenticated users still require RLS approval for every row.
grant select, update on public.users to authenticated;
grant select, insert, update, delete on public.projects, public.tasks, public.items, public.project_access to authenticated;

create policy "users_select_own"
on public.users for select to authenticated
using (auth.uid() = id);

create policy "users_update_own"
on public.users for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Exact lookup for project invitations without exposing the full users table.
create or replace function public.find_user_by_email(email_query text)
returns table (id uuid, email text, full_name text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.email, u.full_name
  from public.users u
  where lower(u.email) = lower(trim(email_query))
  limit 1;
$$;

revoke all on function public.find_user_by_email(text) from public;
grant execute on function public.find_user_by_email(text) to authenticated;

create policy "projects_select_owner_or_viewer"
on public.projects for select to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = projects.id
      and pa.viewer_id = auth.uid()
  )
);

create policy "projects_insert_owner"
on public.projects for insert to authenticated
with check (auth.uid() = owner_id);

create policy "projects_update_owner"
on public.projects for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "projects_delete_owner"
on public.projects for delete to authenticated
using (auth.uid() = owner_id);

create policy "tasks_select_owner_or_project_viewer"
on public.tasks for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = tasks.project_id
      and pa.viewer_id = auth.uid()
  )
);

create policy "tasks_insert_owner_valid_project"
on public.tasks for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = tasks.project_id
        and p.owner_id = auth.uid()
    )
  )
);

create policy "tasks_update_owner_valid_project"
on public.tasks for update to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = tasks.project_id
        and p.owner_id = auth.uid()
    )
  )
);

create policy "tasks_delete_owner"
on public.tasks for delete to authenticated
using (auth.uid() = user_id);

create policy "items_select_owner_or_project_viewer"
on public.items for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.project_access pa
    where pa.project_id = items.project_id
      and pa.viewer_id = auth.uid()
  )
);

create policy "items_insert_project_owner"
on public.items for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.projects p
    where p.id = items.project_id
      and p.owner_id = auth.uid()
  )
);

create policy "items_update_project_owner"
on public.items for update to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.projects p
    where p.id = items.project_id
      and p.owner_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.projects p
    where p.id = items.project_id
      and p.owner_id = auth.uid()
  )
);

create policy "items_delete_project_owner"
on public.items for delete to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.projects p
    where p.id = items.project_id
      and p.owner_id = auth.uid()
  )
);

create policy "project_access_select_owner_or_viewer"
on public.project_access for select to authenticated
using (auth.uid() = owner_id or auth.uid() = viewer_id);

create policy "project_access_insert_project_owner"
on public.project_access for insert to authenticated
with check (
  auth.uid() = owner_id
  and viewer_id <> auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_access.project_id
      and p.owner_id = auth.uid()
  )
);

create policy "project_access_update_project_owner"
on public.project_access for update to authenticated
using (
  auth.uid() = owner_id
  and exists (
    select 1 from public.projects p
    where p.id = project_access.project_id
      and p.owner_id = auth.uid()
  )
)
with check (
  auth.uid() = owner_id
  and viewer_id <> auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_access.project_id
      and p.owner_id = auth.uid()
  )
);

create policy "project_access_delete_project_owner"
on public.project_access for delete to authenticated
using (
  auth.uid() = owner_id
  and exists (
    select 1 from public.projects p
    where p.id = project_access.project_id
      and p.owner_id = auth.uid()
  )
);
