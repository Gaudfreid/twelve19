-- Our Little Home 001: core. REVIEW BEFORE APPLYING. Not yet run against a real project.

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  theme text not null default 'system' check (theme in ('light','dark','system')), -- personal per member
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Manila',
  currency text not null default 'PHP',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade, -- MVP: one household per user
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invited_email text not null,
  token_hash text not null unique, -- only the hash is stored
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);
create index on public.activity_logs (household_id, created_at desc);

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_households_updated before update on public.households
  for each row execute function public.set_updated_at();

-- Helpers -------------------------------------------------------------------
create or replace function public.is_household_member(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members
                 where household_id = target and user_id = auth.uid());
$$;

create or replace function public.shares_household_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members a
                 join public.household_members b on a.household_id = b.household_id
                 where a.user_id = auth.uid() and b.user_id = other);
$$;

create or replace function public.log_activity(p_household uuid, p_action text,
  p_entity text, p_entity_id uuid, p_desc text) returns void
language sql security definer set search_path = public as $$
  insert into public.activity_logs (household_id, actor_id, action, entity_type, entity_id, description)
  values (p_household, auth.uid(), p_action, p_entity, p_entity_id, p_desc);
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Membership RPCs -------------------------------------------------------------
create or replace function public.create_household(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from household_members where user_id = v_uid) then
    raise exception 'already in a household';
  end if;
  insert into households (name, created_by)
    values (coalesce(nullif(trim(p_name), ''), 'Our Little Home'), v_uid)
    returning id into v_id;
  insert into household_members (household_id, user_id, role) values (v_id, v_uid, 'owner');
  return v_id;
end $$;

-- Returns the RAW token once; only its hash is stored. Build the link client-side.
create or replace function public.create_household_invitation(p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare v_hh uuid; v_token text;
begin
  select household_id into v_hh from household_members where user_id = auth.uid();
  if v_hh is null then raise exception 'not in a household'; end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into household_invitations (household_id, invited_email, token_hash, invited_by, expires_at)
  values (v_hh, lower(trim(p_email)), encode(sha256(convert_to(v_token, 'utf8')), 'hex'),
          auth.uid(), now() + interval '7 days');
  return v_token;
end $$;

create or replace function public.accept_household_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); inv household_invitations; v_email text; v_verified timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select email, email_confirmed_at into v_email, v_verified from auth.users where id = v_uid;
  if v_verified is null then raise exception 'verify your email first'; end if;
  select * into inv from household_invitations
    where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex') for update;
  if not found or inv.accepted_at is not null or inv.expires_at < now()
     or lower(inv.invited_email) <> lower(v_email) then
    raise exception 'invalid or expired invitation';
  end if;
  if exists (select 1 from household_members where user_id = v_uid) then
    raise exception 'already in a household';
  end if;
  insert into household_members (household_id, user_id, role) values (inv.household_id, v_uid, 'member');
  update household_invitations set accepted_at = now() where id = inv.id;
  perform log_activity(inv.household_id, 'invitation_accepted', 'household', inv.household_id, 'Joined the household');
  return inv.household_id;
end $$;

-- RLS + grants ----------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security; -- no policies = no client access
alter table public.activity_logs enable row level security;

revoke all on public.profiles, public.households, public.household_members,
  public.household_invitations, public.activity_logs from anon, authenticated;

grant select on public.profiles, public.households, public.household_members, public.activity_logs to authenticated;
grant update (display_name, avatar_url, theme) on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_household_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy households_select on public.households for select to authenticated
  using (public.is_household_member(id));
create policy members_select on public.household_members for select to authenticated
  using (public.is_household_member(household_id));
create policy activity_select on public.activity_logs for select to authenticated
  using (public.is_household_member(household_id));

revoke execute on function public.log_activity(uuid,text,text,uuid,text) from public, anon, authenticated;
revoke execute on function public.create_household(text), public.create_household_invitation(text),
  public.accept_household_invitation(text) from public, anon;
grant execute on function public.create_household(text), public.create_household_invitation(text),
  public.accept_household_invitation(text) to authenticated;
grant execute on function public.is_household_member(uuid), public.shares_household_with(uuid) to authenticated;
