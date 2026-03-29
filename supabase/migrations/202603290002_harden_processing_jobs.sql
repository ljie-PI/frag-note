alter table public.processing_jobs
  add column if not exists claimed_at timestamptz,
  add column if not exists lease_expires_at timestamptz;

create index if not exists processing_jobs_status_lease_idx
  on public.processing_jobs (status, lease_expires_at asc, created_at asc);
