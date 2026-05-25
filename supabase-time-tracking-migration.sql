-- Run this once in Supabase SQL Editor if your database already exists.
-- It adds project deletion cascade support is already handled by foreign keys,
-- plus time tracking/statistics fields for existing tasks and kanban items.

alter table public.tasks
  add column if not exists completed_at timestamptz,
  add column if not exists priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  add column if not exists total_seconds integer not null default 0,
  add column if not exists timer_started_at timestamptz;

create table if not exists public.items (
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

alter table public.items
  add column if not exists completed_at timestamptz,
  add column if not exists priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  add column if not exists total_seconds integer not null default 0,
  add column if not exists timer_started_at timestamptz;

alter table public.items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'items' and policyname = 'Owner full access to items') then
    create policy "Owner full access to items" on public.items for all using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'items' and policyname = 'Viewer read items') then
    create policy "Viewer read items" on public.items for select using (
      exists (select 1 from public.project_access where project_id = items.project_id and viewer_id = auth.uid())
    );
  end if;
end $$;
