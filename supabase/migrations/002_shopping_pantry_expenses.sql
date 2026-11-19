-- Our Little Home 002: shopping, pantry, expenses. REVIEW BEFORE APPLYING.
-- Fixes vs handoff v1.2: pantry_item_id + created_by on shopping_items,
-- one active list per household, quantity changes only via RPC.

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text,
  location text not null default 'kitchen_pantry'
    check (location in ('refrigerator','freezer','kitchen_pantry','spice_rack','other')),
  quantity numeric(12,3) not null default 0 check (quantity >= 0), -- changed only via RPC
  unit text,
  minimum_quantity numeric(12,3) not null default 0 check (minimum_quantity >= 0),
  expiration_date date,
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null default 'Shopping List',
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);
create unique index one_active_list_per_household on public.shopping_lists (household_id) where status = 'active';

create table public.shopping_purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  shopping_list_id uuid not null,
  purchased_by uuid not null references auth.users(id),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  purchased_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (shopping_list_id, household_id) references public.shopping_lists (id, household_id)
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  shopping_list_id uuid not null,
  purchase_id uuid,
  pantry_item_id uuid, -- links to pantry for restock / low-stock flows
  name text not null,
  category text,
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit text,
  estimated_unit_price numeric(12,2) check (estimated_unit_price >= 0),
  actual_unit_price numeric(12,2) check (actual_unit_price >= 0),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'needed' check (status in ('needed','purchased','cancelled')),
  notes text,
  created_by uuid references auth.users(id), -- drives the avatar on each item
  purchased_by uuid references auth.users(id),
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (shopping_list_id, household_id) references public.shopping_lists (id, household_id),
  foreign key (purchase_id, household_id) references public.shopping_purchases (id, household_id),
  foreign key (pantry_item_id, household_id) references public.pantry_items (id, household_id)
);
create index on public.shopping_items (household_id, status);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  pantry_item_id uuid not null,
  transaction_type text not null
    check (transaction_type in ('initial_stock','restock','consumption','adjustment','discarded')),
  quantity_change numeric(12,3) not null,
  resulting_quantity numeric(12,3) not null check (resulting_quantity >= 0),
  shopping_purchase_id uuid,
  performed_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (pantry_item_id, household_id) references public.pantry_items (id, household_id),
  foreign key (shopping_purchase_id, household_id) references public.shopping_purchases (id, household_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  description text not null,
  category text not null default 'Other'
    check (category in ('Groceries','Household supplies','Utilities','Internet','Rent','Food','Transport','Other')),
  amount numeric(12,2) not null check (amount >= 0),
  transaction_date date not null default current_date,
  paid_by uuid references auth.users(id),
  source_type text not null default 'manual' check (source_type in ('manual','shopping_purchase','bill_payment')),
  source_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((source_type = 'manual') = (source_id is null))
);
create unique index expenses_unique_source on public.expenses (household_id, source_type, source_id)
  where source_id is not null;
create index on public.expenses (household_id, transaction_date desc);

create trigger trg_pantry_updated before update on public.pantry_items for each row execute function public.set_updated_at();
create trigger trg_lists_updated before update on public.shopping_lists for each row execute function public.set_updated_at();
create trigger trg_items_updated before update on public.shopping_items for each row execute function public.set_updated_at();
create trigger trg_expenses_updated before update on public.expenses for each row execute function public.set_updated_at();

-- Every new household gets its single default list.
create or replace function public.create_default_list() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into shopping_lists (household_id, created_by) values (new.id, new.created_by);
  return new;
end $$;
create trigger trg_default_list after insert on public.households
  for each row execute function public.create_default_list();

-- Atomic RPCs -----------------------------------------------------------------
-- Internal: not granted to clients.
create or replace function public._apply_pantry_change(p_item uuid, p_type text, p_change numeric,
  p_notes text, p_purchase uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare v_item pantry_items; v_new numeric(12,3);
begin
  select * into v_item from pantry_items where id = p_item for update;
  if not found or not is_household_member(v_item.household_id) then raise exception 'item not found'; end if;
  if p_type not in ('restock','consumption','adjustment','discarded') then raise exception 'invalid type'; end if;
  if p_change is null or p_change = 0 then raise exception 'change must be non-zero'; end if;
  if p_type = 'restock' then p_change := abs(p_change);
  elsif p_type in ('consumption','discarded') then p_change := -abs(p_change); end if;
  v_new := v_item.quantity + p_change;
  if v_new < 0 then raise exception 'quantity cannot go below zero'; end if;
  update pantry_items set quantity = v_new, updated_by = auth.uid() where id = p_item;
  insert into inventory_transactions (household_id, pantry_item_id, transaction_type, quantity_change,
    resulting_quantity, shopping_purchase_id, performed_by, notes)
  values (v_item.household_id, p_item, p_type, p_change, v_new, p_purchase, auth.uid(), p_notes);
  perform log_activity(v_item.household_id, 'pantry_' || p_type, 'pantry_item', p_item,
    p_type || ' ' || v_item.name);
  return v_new;
end $$;

create or replace function public.adjust_pantry_quantity(p_item uuid, p_type text, p_change numeric,
  p_notes text default null) returns numeric
language sql security definer set search_path = public as $$
  select public._apply_pantry_change(p_item, p_type, p_change, p_notes, null);
$$;

-- p_items: [{"id": "<item uuid>", "actual_unit_price": 120, "restock": true}, ...]
-- "restock" must be explicit (spec: confirm before adding to pantry) and needs pantry_item_id.
create or replace function public.record_shopping_purchase(p_list uuid, p_items jsonb,
  p_category text default 'Groceries', p_notes text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_hh uuid; v_tz text; v_purchase uuid; v_total numeric(12,2) := 0;
        e jsonb; it shopping_items; v_price numeric(12,2);
begin
  select l.household_id, h.timezone into v_hh, v_tz
    from shopping_lists l join households h on h.id = l.household_id where l.id = p_list for update of l;
  if v_hh is null or not is_household_member(v_hh) then raise exception 'list not found'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'no items'; end if;

  insert into shopping_purchases (household_id, shopping_list_id, purchased_by, notes)
    values (v_hh, p_list, auth.uid(), p_notes) returning id into v_purchase;

  for e in select value from jsonb_array_elements(p_items) loop
    select * into it from shopping_items
      where id = (e->>'id')::uuid and shopping_list_id = p_list and status = 'needed' for update;
    if not found then raise exception 'item % is not available to purchase', e->>'id'; end if; -- blocks duplicates
    v_price := coalesce((e->>'actual_unit_price')::numeric, it.estimated_unit_price, 0);
    v_total := v_total + round(v_price * it.quantity, 2);
    update shopping_items set status = 'purchased', actual_unit_price = v_price,
      purchased_by = auth.uid(), purchased_at = now(), purchase_id = v_purchase where id = it.id;
    if coalesce((e->>'restock')::boolean, false) and it.pantry_item_id is not null then
      perform _apply_pantry_change(it.pantry_item_id, 'restock', it.quantity, 'From shopping', v_purchase);
    end if;
  end loop;

  update shopping_purchases set total_amount = v_total where id = v_purchase;
  insert into expenses (household_id, description, category, amount, transaction_date, paid_by,
    source_type, source_id, created_by)
  values (v_hh, 'Shopping', p_category, v_total, (now() at time zone v_tz)::date, auth.uid(),
    'shopping_purchase', v_purchase, auth.uid()); -- unique index guarantees exactly one
  perform log_activity(v_hh, 'shopping_purchased', 'shopping_purchase', v_purchase,
    'Purchased ' || jsonb_array_length(p_items) || ' items');
  return v_purchase;
end $$;

-- RLS + grants ----------------------------------------------------------------
alter table public.pantry_items enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_purchases enable row level security;
alter table public.shopping_items enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.expenses enable row level security;

revoke all on public.pantry_items, public.shopping_lists, public.shopping_purchases,
  public.shopping_items, public.inventory_transactions, public.expenses from anon, authenticated;

grant select on public.shopping_lists, public.shopping_purchases, public.inventory_transactions to authenticated;
grant select, delete on public.pantry_items, public.shopping_items to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
-- Column grants: quantity and purchase fields can only change through RPCs.
grant insert (household_id, name, category, location, unit, minimum_quantity, expiration_date, notes, created_by, updated_by)
  on public.pantry_items to authenticated;
grant update (name, category, location, unit, minimum_quantity, expiration_date, notes, updated_by)
  on public.pantry_items to authenticated;
grant insert (household_id, shopping_list_id, pantry_item_id, name, category, quantity, unit,
  estimated_unit_price, priority, notes, created_by) on public.shopping_items to authenticated;
grant update (pantry_item_id, name, category, quantity, unit, estimated_unit_price, priority, status, notes)
  on public.shopping_items to authenticated;

create policy lists_select on public.shopping_lists for select to authenticated using (public.is_household_member(household_id));
create policy purchases_select on public.shopping_purchases for select to authenticated using (public.is_household_member(household_id));
create policy invtx_select on public.inventory_transactions for select to authenticated using (public.is_household_member(household_id));

create policy pantry_select on public.pantry_items for select to authenticated using (public.is_household_member(household_id));
create policy pantry_insert on public.pantry_items for insert to authenticated with check (public.is_household_member(household_id));
create policy pantry_update on public.pantry_items for update to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy pantry_delete on public.pantry_items for delete to authenticated using (public.is_household_member(household_id));

create policy items_select on public.shopping_items for select to authenticated using (public.is_household_member(household_id));
create policy items_insert on public.shopping_items for insert to authenticated
  with check (public.is_household_member(household_id) and status = 'needed');
create policy items_update on public.shopping_items for update to authenticated
  using (public.is_household_member(household_id) and status in ('needed','cancelled'))
  with check (public.is_household_member(household_id) and status in ('needed','cancelled')); -- 'purchased' only via RPC
create policy items_delete on public.shopping_items for delete to authenticated
  using (public.is_household_member(household_id) and status <> 'purchased');

-- Clients may only touch manual expenses; linked ones are RPC-owned.
create policy expenses_select on public.expenses for select to authenticated using (public.is_household_member(household_id));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (public.is_household_member(household_id) and source_type = 'manual');
create policy expenses_update on public.expenses for update to authenticated
  using (public.is_household_member(household_id) and source_type = 'manual')
  with check (public.is_household_member(household_id) and source_type = 'manual');
create policy expenses_delete on public.expenses for delete to authenticated
  using (public.is_household_member(household_id) and source_type = 'manual');

revoke execute on function public._apply_pantry_change(uuid,text,numeric,text,uuid) from public, anon, authenticated;
revoke execute on function public.adjust_pantry_quantity(uuid,text,numeric,text),
  public.record_shopping_purchase(uuid,jsonb,text,text) from public, anon;
grant execute on function public.adjust_pantry_quantity(uuid,text,numeric,text),
  public.record_shopping_purchase(uuid,jsonb,text,text) to authenticated;

alter publication supabase_realtime add table public.shopping_items, public.pantry_items,
  public.expenses, public.activity_logs;
