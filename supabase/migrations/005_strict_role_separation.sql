-- Enforce the seller/buyer boundary in the database as well as in FastAPI.
-- This migration intentionally fails if legacy orphan rows exist; repair those
-- rows first rather than silently assigning them to the wrong account.

do $$
begin
  if exists (select 1 from public.artisans where account_id is null) then
    raise exception 'Cannot enforce seller ownership: artisans with null account_id exist';
  end if;
  if exists (select 1 from public.buyers where account_id is null) then
    raise exception 'Cannot enforce buyer ownership: buyers with null account_id exist';
  end if;
  if exists (select 1 from public.products where artisan_id is null) then
    raise exception 'Cannot enforce product ownership: products with null artisan_id exist';
  end if;
end $$;

create unique index if not exists artisans_account_uidx on public.artisans(account_id);
create unique index if not exists buyers_account_uidx on public.buyers(account_id);
create index if not exists products_artisan_created_idx on public.products(artisan_id, created_at desc);
create index if not exists inquiries_product_created_idx on public.inquiries(product_id, created_at desc);

alter table public.artisans alter column account_id set not null;
alter table public.buyers alter column account_id set not null;
alter table public.products alter column artisan_id set not null;

alter table public.inquiries
  add column if not exists buyer_id uuid references public.buyers(id) on delete set null;

create index if not exists inquiries_buyer_created_idx on public.inquiries(buyer_id, created_at desc);

create or replace function public.enforce_account_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_role text := tg_argv[0];
  actual_role text;
begin
  select role into actual_role from public.accounts where id = new.account_id;
  if actual_role is null then
    raise exception 'Profile account does not exist';
  end if;
  if actual_role <> expected_role then
    raise exception 'A % profile requires a % account', tg_table_name, expected_role;
  end if;
  return new;
end;
$$;

drop trigger if exists artisans_require_seller_account on public.artisans;
create trigger artisans_require_seller_account
before insert or update of account_id on public.artisans
for each row execute function public.enforce_account_profile_role('seller');

drop trigger if exists buyers_require_buyer_account on public.buyers;
create trigger buyers_require_buyer_account
before insert or update of account_id on public.buyers
for each row execute function public.enforce_account_profile_role('buyer');

create or replace function public.prevent_account_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = new.role then
    return new;
  end if;
  if exists (select 1 from public.artisans where account_id = old.id)
     or exists (select 1 from public.buyers where account_id = old.id) then
    raise exception 'Account role cannot change after a role profile is created';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_prevent_role_change on public.accounts;
create trigger accounts_prevent_role_change
before update of role on public.accounts
for each row execute function public.prevent_account_role_change();
