-- Our Little Home 006: log shared actions so Recent Activity can say who did what. REVIEW BEFORE APPLYING.
create or replace function public.log_shopping_added() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform log_activity(new.household_id, 'shopping_added', 'shopping_item', new.id, new.name); return new; end $$;
create trigger trg_log_shopping after insert on public.shopping_items
  for each row execute function public.log_shopping_added();

create or replace function public.log_expense_added() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform log_activity(new.household_id, 'expense_added', 'expense', new.id, new.description); return new; end $$;
create trigger trg_log_expense after insert on public.expenses
  for each row when (new.source_type = 'manual') execute function public.log_expense_added();

create or replace function public.log_event_added() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform log_activity(new.household_id, 'event_added', 'calendar_event', new.id, new.title); return new; end $$;
create trigger trg_log_event after insert on public.calendar_events
  for each row execute function public.log_event_added();
