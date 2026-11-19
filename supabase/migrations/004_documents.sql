-- Our Little Home 004: household documents (private storage). REVIEW BEFORE APPLYING.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('household-documents', 'household-documents', false, 20971520, array[
  'application/pdf','image/jpeg','image/png','image/webp','image/heic','text/plain',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

-- Files live at {household_id}/{file}; only members of that household can touch them.
create policy docs_obj_select on storage.objects for select to authenticated using (
  bucket_id = 'household-documents' and (storage.foldername(name))[1] in
    (select household_id::text from public.household_members where user_id = auth.uid()));
create policy docs_obj_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'household-documents' and (storage.foldername(name))[1] in
    (select household_id::text from public.household_members where user_id = auth.uid()));
create policy docs_obj_delete on storage.objects for delete to authenticated using (
  bucket_id = 'household-documents' and (storage.foldername(name))[1] in
    (select household_id::text from public.household_members where user_id = auth.uid()));

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text not null default 'Other' check (category in ('Home','Bills & Receipts','Legal & IDs','Warranties','Other')),
  storage_path text not null unique,
  mime_type text, size_bytes bigint check (size_bytes >= 0), notes text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.documents (household_id, created_at desc);
alter table public.documents enable row level security;
revoke all on public.documents from anon, authenticated;
grant select, delete on public.documents to authenticated;
grant insert (household_id, name, category, storage_path, mime_type, size_bytes, notes, uploaded_by) on public.documents to authenticated;
grant update (name, category, notes) on public.documents to authenticated;
create policy documents_all on public.documents for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id) and storage_path like household_id::text || '/%');
alter publication supabase_realtime add table public.documents;
