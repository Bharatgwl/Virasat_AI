alter table public.products
  add column if not exists updated_at timestamptz not null default now();

alter table public.products
  add column if not exists published_at timestamptz;

alter table public.inquiries
  add column if not exists status text not null default 'new';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inquiries_status_check'
  ) then
    alter table public.inquiries
      add constraint inquiries_status_check
      check (status in ('new', 'contacted', 'closed'));
  end if;
end $$;

create index if not exists inquiries_status_created_at_idx
  on public.inquiries (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- RLS remains enabled. Version 2 still routes all data access through FastAPI
-- using the service-role key; no anonymous browser policies are required.
