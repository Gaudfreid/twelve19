-- Our Little Home 003: bills (+payment ledger), utilities, chores, calendar, wishlist. REVIEW BEFORE APPLYING.
-- Design: a bill_record's paid amount = sum of its payment entries; each entry creates exactly one expense.
-- "overdue" is derived in the app (due_date + remaining), never stored.

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null, provider text,
  category text not null default 'Other' check (category in ('Electricity','Water','Internet','Rent','Subscriptions','Other')),
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','quarterly','yearly','one_time')),
  expected_amount numeric(12,2) not null default 0 check (expected_amount >= 0),
  due_day int check (due_day between 1 and 31),
  next_due_date date, active boolean not null default true, notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, household_id)
);
create table public.bill_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  bill_id uuid not null, billing_period date not null,
  amount_due numeric(12,2) not null check (amount_due >= 0),
  due_date date not null, cancelled boolean not null default false, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (bill_id, billing_period), unique (id, household_id),
  foreign key (bill_id, household_id) references public.bills (id, household_id)
);
create table public.bill_payment_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  bill_record_id uuid not null, amount numeric(12,2) not null check (amount > 0),
  paid_on date not null, paid_by uuid references auth.users(id), notes text,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (bill_record_id, household_id) references public.bill_records (id, household_id)
);
create table public.utility_readings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  utility_type text not null check (utility_type in ('electricity','water')),
  billing_period date not null, consumption numeric(12,3) not null check (consumption >= 0),
  unit text not null, notes text, recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null, assigned_to uuid references auth.users(id), due_date date,
  recurrence text not null default 'none' check (recurrence in ('none','daily','weekly','monthly')),
  status text not null default 'open' check (status in ('open','done')),
  completed_by uuid references auth.users(id), completed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null, event_date date not null, start_time time, notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null, notes text, url text check (url is null or url ~* '^https?://'),
  estimated_price numeric(12,2) check (estimated_price >= 0),
  status text not null default 'wanted' check (status in ('wanted','got')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.bill_records (household_id, due_date);
create index on public.chores (household_id, status);
create index on public.calendar_events (household_id, event_date);

create trigger trg_bills_u before update on public.bills for each row execute function public.set_updated_at();
create trigger trg_bill_records_u before update on public.bill_records for each row execute function public.set_updated_at();
create trigger trg_chores_u before update on public.chores for each row execute function public.set_updated_at();
create trigger trg_events_u before update on public.calendar_events for each row execute function public.set_updated_at();
create trigger trg_wishlist_u before update on public.wishlist_items for each row execute function public.set_updated_at();

-- Functions -------------------------------------------------------------------
create or replace function public._advance_due(d date, freq text, due_day int) returns date
language plpgsql immutable as $$
declare n date;
begin
  if freq = 'weekly' then return d + 7; end if;
  if freq = 'yearly' then return (d + interval '1 year')::date; end if;
  n := (date_trunc('month', d) + case when freq = 'quarterly' then interval '3 months' else interval '1 month' end)::date;
  return n + (least(coalesce(due_day, extract(day from d)::int),
                    extract(day from (n + interval '1 month' - interval '1 day'))::int) - 1);
end $$;

-- Idempotent: creates records for bills due within 31 days, then advances next_due_date. Safe to call on page load.
create or replace function public.generate_bill_records() returns int
language plpgsql security definer set search_path = public as $$
declare v_hh uuid; v_tz text; v_today date; b bills; v_n int := 0; v_guard int;
begin
  select m.household_id, h.timezone into v_hh, v_tz
    from household_members m join households h on h.id = m.household_id where m.user_id = auth.uid();
  if v_hh is null then return 0; end if;
  v_today := (now() at time zone v_tz)::date;
  for b in select * from bills where household_id = v_hh and active and next_due_date is not null
           and next_due_date <= v_today + 31 for update loop
    v_guard := 0;
    while b.next_due_date <= v_today + 31 and v_guard < 24 loop
      insert into bill_records (household_id, bill_id, billing_period, amount_due, due_date)
        values (v_hh, b.id, b.next_due_date, b.expected_amount, b.next_due_date)
        on conflict (bill_id, billing_period) do nothing;
      v_n := v_n + 1;
      if b.frequency = 'one_time' then update bills set active = false where id = b.id; exit; end if;
      b.next_due_date := _advance_due(b.next_due_date, b.frequency, b.due_day);
      v_guard := v_guard + 1;
    end loop;
    if b.frequency <> 'one_time' then update bills set next_due_date = b.next_due_date where id = b.id; end if;
  end loop;
  return v_n;
end $$;

create or replace function public.record_bill_payment(p_record uuid, p_amount numeric,
  p_paid_on date default null, p_notes text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare r bill_records; b bills; v_tz text; v_entry uuid; v_day date; v_cat text;
begin
  select * into r from bill_records where id = p_record for update;
  if not found or not is_household_member(r.household_id) then raise exception 'bill not found'; end if;
  if r.cancelled then raise exception 'this bill is cancelled'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  select * into b from bills where id = r.bill_id;
  select timezone into v_tz from households where id = r.household_id;
  v_day := coalesce(p_paid_on, (now() at time zone v_tz)::date);
  insert into bill_payment_entries (household_id, bill_record_id, amount, paid_on, paid_by, notes)
    values (r.household_id, r.id, p_amount, v_day, auth.uid(), p_notes) returning id into v_entry;
  v_cat := case b.category when 'Electricity' then 'Utilities' when 'Water' then 'Utilities'
             when 'Internet' then 'Internet' when 'Rent' then 'Rent' else 'Other' end;
  insert into expenses (household_id, description, category, amount, transaction_date, paid_by, source_type, source_id, created_by)
    values (r.household_id, b.name, v_cat, p_amount, v_day, auth.uid(), 'bill_payment', v_entry, auth.uid());
  perform log_activity(r.household_id, 'bill_paid', 'bill_record', r.id, 'Paid ' || b.name);
  return v_entry;
end $$;

create or replace function public.complete_chore(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c chores; v_next date;
begin
  select * into c from chores where id = p_id for update;
  if not found or not is_household_member(c.household_id) then raise exception 'chore not found'; end if;
  if c.status = 'done' then return; end if;
  update chores set status = 'done', completed_by = auth.uid(), completed_at = now() where id = p_id;
  if c.recurrence <> 'none' then
    v_next := case c.recurrence when 'daily' then coalesce(c.due_date, current_date) + 1
                when 'weekly' then coalesce(c.due_date, current_date) + 7
                else (coalesce(c.due_date, current_date) + interval '1 month')::date end;
    insert into chores (household_id, title, assigned_to, due_date, recurrence, created_by)
      values (c.household_id, c.title, c.assigned_to, v_next, c.recurrence, c.created_by);
  end if;
  perform log_activity(c.household_id, 'chore_done', 'chore', c.id, 'Finished: ' || c.title);
end $$;

-- RLS + grants ----------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['bills','calendar_events','wishlist_items','utility_readings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id))', t || '_all', t);
  end loop;
end $$;

alter table public.chores enable row level security;
revoke all on public.chores from anon, authenticated;
grant select, delete on public.chores to authenticated;
grant insert (household_id, title, assigned_to, due_date, recurrence, created_by) on public.chores to authenticated;
grant update (title, assigned_to, due_date, recurrence) on public.chores to authenticated; -- done only via complete_chore
create policy chores_all on public.chores for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

alter table public.bill_records enable row level security;
revoke all on public.bill_records from anon, authenticated;
grant select on public.bill_records to authenticated;
grant update (amount_due, due_date, cancelled, notes) on public.bill_records to authenticated;
create policy bill_records_all on public.bill_records for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

alter table public.bill_payment_entries enable row level security; -- read-only for clients; written by record_bill_payment
revoke all on public.bill_payment_entries from anon, authenticated;
grant select on public.bill_payment_entries to authenticated;
create policy entries_select on public.bill_payment_entries for select to authenticated using (public.is_household_member(household_id));

revoke execute on function public.generate_bill_records(), public.record_bill_payment(uuid,numeric,date,text),
  public.complete_chore(uuid) from public, anon;
grant execute on function public.generate_bill_records(), public.record_bill_payment(uuid,numeric,date,text),
  public.complete_chore(uuid) to authenticated;

alter publication supabase_realtime add table public.bills, public.bill_records, public.bill_payment_entries,
  public.utility_readings, public.chores, public.calendar_events, public.wishlist_items;
