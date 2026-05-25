-- Run this in your Supabase SQL editor
-- If you already ran the old schema, run this instead to reset:
-- drop table if exists plant_access, daily_logs, plants, tasks, users cascade;

create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

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

create policy "Users can read all profiles" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

create policy "Owner full access to projects" on public.projects for all using (auth.uid() = owner_id);
create policy "Viewer read access to projects" on public.projects for select using (
  exists (select 1 from public.project_access where project_id = id and viewer_id = auth.uid())
);

create policy "Tasks own access" on public.tasks for all using (auth.uid() = user_id);
create policy "Viewer read tasks" on public.tasks for select using (
  exists (select 1 from public.project_access where project_id = tasks.project_id and viewer_id = auth.uid())
);

create policy "Owner full access to items" on public.items for all using (auth.uid() = user_id);
create policy "Viewer read items" on public.items for select using (
  exists (select 1 from public.project_access where project_id = items.project_id and viewer_id = auth.uid())
);

create policy "Owner manages project access" on public.project_access for all using (auth.uid() = owner_id);
create policy "Viewer sees own access" on public.project_access for select using (auth.uid() = viewer_id);
