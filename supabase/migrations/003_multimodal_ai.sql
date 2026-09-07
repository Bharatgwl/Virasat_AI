alter table public.products
  add column if not exists local_description text not null default '';

alter table public.products
  add column if not exists source_language_code text not null default 'en-IN';

alter table public.products
  add column if not exists ai_provider text not null default 'mock';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_ai_provider_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_ai_provider_check
      check (ai_provider in ('mock', 'openai', 'ollama'));
  end if;
end $$;
