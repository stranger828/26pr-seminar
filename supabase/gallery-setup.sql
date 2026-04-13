create extension if not exists pgcrypto;

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  task_step text not null check (task_step in ('1', '2', '3', '4')),
  task_title text not null,
  type text not null check (type in ('text', 'image', 'audio', 'video')),
  provider text not null check (provider in ('openai', 'gemini')),
  external_job_id text unique,
  prompt text not null,
  secondary_prompt text,
  result_text text,
  asset_path text,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists gallery_items_created_at_idx
  on public.gallery_items (created_at desc);

insert into storage.buckets (id, name, public)
values ('gallery-assets', 'gallery-assets', true)
on conflict (id) do nothing;
