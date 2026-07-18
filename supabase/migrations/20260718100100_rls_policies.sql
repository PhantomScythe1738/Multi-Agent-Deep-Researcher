-- ============================================================================
-- Row Level Security — every user-owned table.
-- Users may only read/write their own rows. Unauthenticated access is denied
-- (no policy matches an anon/NULL auth.uid()).
-- ============================================================================

alter table public.research_runs enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.document_chunks enable row level security;
alter table public.sources enable row level security;
alter table public.agent_events enable row level security;

-- ---------------------------------------------------------------------------
-- research_runs
-- ---------------------------------------------------------------------------
create policy "research_runs_select_own"
  on public.research_runs for select
  using (auth.uid() = user_id);

create policy "research_runs_insert_own"
  on public.research_runs for insert
  with check (auth.uid() = user_id);

create policy "research_runs_update_own"
  on public.research_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "research_runs_delete_own"
  on public.research_runs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- uploaded_files
-- ---------------------------------------------------------------------------
create policy "uploaded_files_select_own"
  on public.uploaded_files for select
  using (auth.uid() = user_id);

create policy "uploaded_files_insert_own"
  on public.uploaded_files for insert
  with check (auth.uid() = user_id);

create policy "uploaded_files_update_own"
  on public.uploaded_files for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "uploaded_files_delete_own"
  on public.uploaded_files for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- document_chunks (ownership enforced directly via user_id; cannot cross users)
-- ---------------------------------------------------------------------------
create policy "document_chunks_select_own"
  on public.document_chunks for select
  using (auth.uid() = user_id);

create policy "document_chunks_insert_own"
  on public.document_chunks for insert
  with check (auth.uid() = user_id);

create policy "document_chunks_update_own"
  on public.document_chunks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "document_chunks_delete_own"
  on public.document_chunks for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
create policy "sources_select_own"
  on public.sources for select
  using (auth.uid() = user_id);

create policy "sources_insert_own"
  on public.sources for insert
  with check (auth.uid() = user_id);

create policy "sources_update_own"
  on public.sources for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sources_delete_own"
  on public.sources for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- agent_events
-- ---------------------------------------------------------------------------
create policy "agent_events_select_own"
  on public.agent_events for select
  using (auth.uid() = user_id);

create policy "agent_events_insert_own"
  on public.agent_events for insert
  with check (auth.uid() = user_id);

create policy "agent_events_delete_own"
  on public.agent_events for delete
  using (auth.uid() = user_id);
