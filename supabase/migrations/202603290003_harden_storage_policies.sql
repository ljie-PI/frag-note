drop policy if exists "raw bucket objects owned by auth user" on storage.objects;
drop policy if exists "derived bucket objects owned by auth user" on storage.objects;

create policy "raw bucket objects scoped to auth user prefix" on storage.objects
  for all using (
    bucket_id = 'captures-raw'
    and auth.role() = 'authenticated'
    and name like auth.uid()::text || '/%'
  )
  with check (
    bucket_id = 'captures-raw'
    and auth.role() = 'authenticated'
    and name like auth.uid()::text || '/%'
  );

create policy "derived bucket objects read scoped to auth user prefix" on storage.objects
  for select using (
    bucket_id = 'captures-derived'
    and auth.role() = 'authenticated'
    and name like auth.uid()::text || '/%'
  );
