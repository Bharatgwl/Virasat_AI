create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('seller', 'buyer')),
  display_name text not null check (char_length(display_name) between 2 and 120),
  phone text,
  email text,
  password_hash text not null default '',
  auth_provider text not null default 'password' check (auth_provider in ('password', 'google')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_contact_required check (phone is not null or email is not null)
);

create unique index if not exists accounts_role_phone_uidx
  on public.accounts (role, phone)
  where phone is not null;

create unique index if not exists accounts_role_email_uidx
  on public.accounts (role, lower(email))
  where email is not null;

create table if not exists public.artisans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  artisan_name text not null check (char_length(artisan_name) between 2 and 120),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  location text not null check (char_length(location) between 2 and 180),
  craft_type text not null check (char_length(craft_type) between 2 and 120),
  preferred_language text not null default 'hi',
  upi_id text,
  ondc_status text not null default 'demo_ready' check (ondc_status in ('not_connected', 'demo_ready', 'connected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  buyer_name text not null check (char_length(buyer_name) between 2 and 120),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email text,
  delivery_address text not null check (char_length(delivery_address) between 5 and 500),
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists artisan_id uuid references public.artisans(id) on delete set null;

alter table public.products
  add column if not exists craft_title text;

alter table public.products
  add column if not exists craft_story text;

alter table public.products
  add column if not exists primary_material text;

alter table public.products
  add column if not exists secondary_materials text[] not null default '{}';

alter table public.products
  add column if not exists craft_technique text;

alter table public.products
  add column if not exists hsn_tax_code text;

alter table public.products
  add column if not exists market_price_min integer;

alter table public.products
  add column if not exists market_price_max integer;

alter table public.products
  add column if not exists available_stock integer not null default 1;

alter table public.products
  add column if not exists length_cm numeric;

alter table public.products
  add column if not exists width_cm numeric;

alter table public.products
  add column if not exists height_cm numeric;

alter table public.products
  add column if not exists weight_grams numeric;

alter table public.products
  add column if not exists color text;

alter table public.products
  add column if not exists care_instructions text;

alter table public.products
  add column if not exists production_time_days integer;

alter table public.products
  add column if not exists artisan_location text;

alter table public.products
  add column if not exists tags text[] not null default '{}';

alter table public.products
  add column if not exists transcript text;

alter table public.products
  add column if not exists translated_input text;

alter table public.products
  add column if not exists ai_confidence numeric;

alter table public.products
  add column if not exists ai_warnings text[] not null default '{}';

alter table public.products
  drop constraint if exists products_status_check;

alter table public.products
  add constraint products_status_check check (status in ('draft', 'generated', 'ready', 'published'));

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0 and quantity <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.buyers(id) on delete set null,
  buyer_name text not null,
  buyer_contact text not null,
  delivery_address text not null,
  total_inr integer not null check (total_inr >= 0),
  status text not null default 'placed' check (status in ('placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
  payment_mode text not null default 'demo' check (payment_mode in ('upi', 'cod', 'demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  artisan_id uuid references public.artisans(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price_inr integer not null check (unit_price_inr > 0),
  line_total_inr integer not null check (line_total_inr > 0),
  created_at timestamptz not null default now()
);

create index if not exists artisans_account_idx on public.artisans(account_id);
create index if not exists buyers_account_idx on public.buyers(account_id);
create index if not exists cart_items_buyer_idx on public.cart_items(buyer_id);
create index if not exists orders_buyer_created_idx on public.orders(buyer_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.accounts enable row level security;
alter table public.artisans enable row level security;
alter table public.buyers enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists artisans_set_updated_at on public.artisans;
create trigger artisans_set_updated_at
before update on public.artisans
for each row execute function public.set_updated_at();

drop trigger if exists buyers_set_updated_at on public.buyers;
create trigger buyers_set_updated_at
before update on public.buyers
for each row execute function public.set_updated_at();

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- All table access still goes through FastAPI with the Supabase service-role key.
-- Keep browser anon table access denied for the prototype.
