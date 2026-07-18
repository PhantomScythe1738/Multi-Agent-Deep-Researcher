-- ============================================================================
-- Private Storage bucket for uploaded PDFs.
-- Objects are namespaced by user id: {userId}/{fileId}/{sanitizedFilename}
-- Policies restrict every user to their own top-level folder.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf'];

-- Read own files
create policy "pdfs_select_own"
  on storage.objects for select
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Upload only into own folder
create policy "pdfs_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update own files
create policy "pdfs_update_own"
  on storage.objects for update
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete own files
create policy "pdfs_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
