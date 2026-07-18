-- ============================================================================
-- match_document_chunks — cosine similarity search over a user's PDF chunks.
--
-- SECURITY INVOKER: runs as the caller, so RLS on document_chunks applies and a
-- user can never reach another user's rows. We ALSO filter user_id = auth.uid()
-- and restrict to the provided file_ids for defense in depth, and hard-cap the
-- number of rows returned.
-- ============================================================================

create or replace function public.match_document_chunks (
  query_embedding extensions.vector(384),
  match_count integer,
  file_ids uuid[]
)
returns table (
  id uuid,
  file_id uuid,
  chunk_index integer,
  page_number integer,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    dc.id,
    dc.file_id,
    dc.chunk_index,
    dc.page_number,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.user_id = auth.uid()
    and dc.file_id = any (file_ids)
    and dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 5), 1), 20);
$$;
