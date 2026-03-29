create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists public.users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.device_sessions (
  device_session_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fragments (
  fragment_id uuid primary key,
  user_id uuid not null references public.users (user_id) on delete cascade,
  source_type text not null,
  origin_kind text not null,
  title_optional text,
  raw_text_optional text,
  status text not null,
  device_metadata jsonb not null default '{}'::jsonb,
  language_hint_optional text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.assets (
  asset_id uuid primary key,
  fragment_id uuid not null references public.fragments (fragment_id) on delete cascade,
  user_id uuid not null references public.users (user_id) on delete cascade,
  asset_type text not null,
  mime_type text not null,
  storage_bucket text not null,
  storage_key text not null,
  file_name_optional text,
  checksum text,
  byte_size integer not null default 0,
  created_at timestamptz not null
);

create table if not exists public.derived_artifacts (
  artifact_id uuid primary key,
  fragment_id uuid not null references public.fragments (fragment_id) on delete cascade,
  user_id uuid not null references public.users (user_id) on delete cascade,
  artifact_type text not null,
  version text not null,
  content jsonb not null,
  provider_metadata jsonb not null default '{}'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null
);

create table if not exists public.relations (
  relation_id uuid primary key,
  user_id uuid not null references public.users (user_id) on delete cascade,
  source_object_type text not null,
  source_object_id uuid not null,
  target_object_type text not null,
  target_object_id uuid not null,
  relation_type text not null,
  confidence_basis_points integer not null,
  explanation text not null,
  algorithm_version text,
  created_at timestamptz not null
);

create table if not exists public.derived_objects (
  object_id uuid primary key,
  user_id uuid not null references public.users (user_id) on delete cascade,
  object_type text not null,
  status text not null,
  title text not null,
  summary text not null,
  key_entities jsonb not null default '[]'::jsonb,
  rule_version text not null,
  supporting_fragment_count integer not null default 0,
  supporting_fragment_ids jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  relation_edges jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.processing_jobs (
  job_id uuid primary key,
  fragment_id uuid not null references public.fragments (fragment_id) on delete cascade,
  user_id uuid not null references public.users (user_id) on delete cascade,
  job_type text not null,
  status text not null,
  attempt_count integer not null default 0,
  provider text not null,
  payload jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.answers (
  answer_id uuid primary key,
  user_id uuid not null references public.users (user_id) on delete cascade,
  query_text text not null,
  query_type text not null,
  answer_body text not null,
  answer_format text not null,
  retrieval_bundle jsonb not null default '[]'::jsonb,
  model_metadata jsonb not null default '{}'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  saved_as_fragment boolean not null default false,
  created_at timestamptz not null
);

create index if not exists fragments_user_created_idx
  on public.fragments (user_id, created_at desc);
create index if not exists processing_jobs_user_status_idx
  on public.processing_jobs (user_id, status, created_at asc);
create index if not exists derived_objects_user_status_idx
  on public.derived_objects (user_id, status, updated_at desc);
create index if not exists answers_user_created_idx
  on public.answers (user_id, created_at desc);

alter table public.users enable row level security;
alter table public.device_sessions enable row level security;
alter table public.fragments enable row level security;
alter table public.assets enable row level security;
alter table public.derived_artifacts enable row level security;
alter table public.relations enable row level security;
alter table public.derived_objects enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.answers enable row level security;

create policy "users select own row" on public.users
  for select using (auth.uid() = user_id);
create policy "users insert own row" on public.users
  for insert with check (auth.uid() = user_id);

create policy "device sessions select own" on public.device_sessions
  for select using (auth.uid() = user_id);
create policy "device sessions insert own" on public.device_sessions
  for insert with check (auth.uid() = user_id);

create policy "fragments select own" on public.fragments
  for select using (auth.uid() = user_id);
create policy "fragments insert own" on public.fragments
  for insert with check (auth.uid() = user_id);
create policy "fragments update own" on public.fragments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "assets select own" on public.assets
  for select using (auth.uid() = user_id);
create policy "assets insert own" on public.assets
  for insert with check (auth.uid() = user_id);

create policy "derived artifacts select own" on public.derived_artifacts
  for select using (auth.uid() = user_id);
create policy "derived artifacts insert own" on public.derived_artifacts
  for insert with check (auth.uid() = user_id);

create policy "relations select own" on public.relations
  for select using (auth.uid() = user_id);
create policy "relations insert own" on public.relations
  for insert with check (auth.uid() = user_id);

create policy "derived objects select own" on public.derived_objects
  for select using (auth.uid() = user_id);
create policy "derived objects insert own" on public.derived_objects
  for insert with check (auth.uid() = user_id);
create policy "derived objects update own" on public.derived_objects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "derived objects delete own" on public.derived_objects
  for delete using (auth.uid() = user_id);

create policy "processing jobs select own" on public.processing_jobs
  for select using (auth.uid() = user_id);
create policy "processing jobs insert own" on public.processing_jobs
  for insert with check (auth.uid() = user_id);
create policy "processing jobs update own" on public.processing_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "answers select own" on public.answers
  for select using (auth.uid() = user_id);
create policy "answers insert own" on public.answers
  for insert with check (auth.uid() = user_id);
create policy "answers update own" on public.answers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('captures-raw', 'captures-raw', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('captures-derived', 'captures-derived', false)
on conflict (id) do nothing;

create policy "raw bucket objects owned by auth user" on storage.objects
  for all using (
    bucket_id = 'captures-raw' and auth.role() = 'authenticated'
  )
  with check (
    bucket_id = 'captures-raw' and auth.role() = 'authenticated'
  );

create policy "derived bucket objects owned by auth user" on storage.objects
  for all using (
    bucket_id = 'captures-derived' and auth.role() = 'authenticated'
  )
  with check (
    bucket_id = 'captures-derived' and auth.role() = 'authenticated'
  );
