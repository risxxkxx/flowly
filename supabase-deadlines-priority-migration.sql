-- Run this once in Supabase SQL Editor to enable deadlines and priority labels.
-- Safe to run more than once.

alter table public.tasks
  add column if not exists due_date date,
  add column if not exists priority text not null default 'medium' check (priority in ('low', 'medium', 'high'));

alter table public.items
  add column if not exists item_date date,
  add column if not exists priority text not null default 'medium' check (priority in ('low', 'medium', 'high'));
