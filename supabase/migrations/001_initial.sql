create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  artisan_name text not null check (char_length(artisan_name) between 2 and 120),
  title text not null check (char_length(title) between 3 and 180),
  description text not null check (char_length(description) between 10 and 3000),
  category text not null check (char_length(category) between 2 and 100),
  materials text[] not null default '{}',
  price_inr integer not null check (price_inr > 0),
  image_url text not null,
  audio_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create index if not exists products_status_created_at_idx
  on public.products (status, created_at desc);

create index if not exists products_category_idx
  on public.products (category);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_name text not null check (char_length(buyer_name) between 2 and 120),
  buyer_contact text not null check (char_length(buyer_contact) between 5 and 180),
  quantity integer not null check (quantity > 0),
  message text not null default '',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.inquiries enable row level security;

-- Version 1 uses the service-role key only inside FastAPI. No browser-facing
-- table policies are created, so direct anonymous database access is denied.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-audio',
  'product-audio',
  false,
  12582912,
  array['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

