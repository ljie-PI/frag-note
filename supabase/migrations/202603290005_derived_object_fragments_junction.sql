-- Replace supporting_fragment_ids JSONB array with a proper junction table
-- for referential integrity and efficient reverse lookups.

create table if not exists public.derived_object_fragments (
  object_id uuid not null references public.derived_objects (object_id) on delete cascade,
  fragment_id uuid not null references public.fragments (fragment_id) on delete cascade,
  user_id uuid not null references public.users (user_id) on delete cascade,
  added_at timestamptz not null default timezone('utc', now()),
  primary key (object_id, fragment_id)
);

create index if not exists derived_object_fragments_fragment_idx
  on public.derived_object_fragments (fragment_id);

alter table public.derived_object_fragments enable row level security;

create policy "derived object fragments select own" on public.derived_object_fragments
  for select using (
    auth.uid() = user_id
    and exists (select 1 from public.derived_objects do2 where do2.object_id = derived_object_fragments.object_id and do2.user_id = auth.uid())
    and exists (select 1 from public.fragments f where f.fragment_id = derived_object_fragments.fragment_id and f.user_id = auth.uid())
  );
create policy "derived object fragments insert own" on public.derived_object_fragments
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.derived_objects do2 where do2.object_id = derived_object_fragments.object_id and do2.user_id = auth.uid())
    and exists (select 1 from public.fragments f where f.fragment_id = derived_object_fragments.fragment_id and f.user_id = auth.uid())
  );
create policy "derived object fragments delete own" on public.derived_object_fragments
  for delete using (
    auth.uid() = user_id
    and exists (select 1 from public.derived_objects do2 where do2.object_id = derived_object_fragments.object_id and do2.user_id = auth.uid())
  );

-- Migrate existing data from JSONB array to junction table
insert into public.derived_object_fragments (object_id, fragment_id, user_id, added_at)
select
  do2.object_id,
  (fid #>> '{}')::uuid as fragment_id,
  do2.user_id,
  do2.created_at as added_at
from public.derived_objects do2,
  jsonb_array_elements(do2.supporting_fragment_ids) as fid
where jsonb_array_length(do2.supporting_fragment_ids) > 0
on conflict do nothing;

-- Drop the JSONB column after migration
alter table public.derived_objects drop column if exists supporting_fragment_ids;
