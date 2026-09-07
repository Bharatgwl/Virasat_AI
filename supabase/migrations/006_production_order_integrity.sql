-- Remove demo defaults while preserving honest provenance for old records.
update public.products set ai_provider = 'legacy' where ai_provider = 'mock';
alter table public.products drop constraint if exists products_ai_provider_check;
alter table public.products
  add constraint products_ai_provider_check check (ai_provider in ('legacy', 'openai', 'ollama'));
alter table public.products alter column ai_provider set default 'ollama';

update public.artisans set ondc_status = 'not_connected' where ondc_status = 'demo_ready';
alter table public.artisans drop constraint if exists artisans_ondc_status_check;
alter table public.artisans
  add constraint artisans_ondc_status_check check (ondc_status in ('not_connected', 'connected'));
alter table public.artisans alter column ondc_status set default 'not_connected';

update public.orders set payment_mode = 'unpaid' where payment_mode = 'demo';
alter table public.orders drop constraint if exists orders_payment_mode_check;
alter table public.orders
  add constraint orders_payment_mode_check check (payment_mode in ('upi', 'cod', 'unpaid'));
alter table public.orders alter column payment_mode set default 'cod';

alter table public.orders add column if not exists idempotency_key uuid;
create unique index if not exists orders_buyer_idempotency_uidx
  on public.orders (buyer_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.app_sessions (
  id uuid primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_sessions_account_idx on public.app_sessions(account_id);
create index if not exists app_sessions_expiry_idx on public.app_sessions(expires_at);
alter table public.app_sessions enable row level security;

-- One database transaction creates the order, inserts its lines, decrements
-- stock, and clears the cart. Repeating the same idempotency key returns the
-- already-created order instead of charging/ordering twice.
create or replace function public.place_buyer_order(
  p_buyer_id uuid,
  p_items jsonb,
  p_delivery_address text,
  p_payment_mode text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer public.buyers%rowtype;
  v_order public.orders%rowtype;
  v_item record;
  v_total integer := 0;
  v_item_count integer;
  v_result jsonb;
begin
  if p_idempotency_key is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  -- Serialize concurrent retries carrying the same buyer/key pair before the
  -- existing-order check, so both requests cannot race into the insert.
  perform pg_advisory_xact_lock(
    hashtextextended(p_buyer_id::text || ':' || p_idempotency_key::text, 0)
  );

  select * into v_order
  from public.orders
  where buyer_id = p_buyer_id and idempotency_key = p_idempotency_key;

  if found then
    select to_jsonb(v_order) || jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(to_jsonb(oi) || jsonb_build_object('product_title', p.title) order by oi.created_at)
        from public.order_items oi
        join public.products p on p.id = oi.product_id
        where oi.order_id = v_order.id
      ), '[]'::jsonb)
    ) into v_result;
    return v_result;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'INVALID_ORDER_ITEMS';
  end if;
  if char_length(trim(p_delivery_address)) < 5 or char_length(p_delivery_address) > 500 then
    raise exception 'INVALID_DELIVERY_ADDRESS';
  end if;
  if p_payment_mode not in ('upi', 'cod') then
    raise exception 'INVALID_PAYMENT_MODE';
  end if;

  select * into v_buyer from public.buyers where id = p_buyer_id;
  if not found then
    raise exception 'BUYER_NOT_FOUND';
  end if;

  select count(*) into v_item_count
  from (
    select x.product_id
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    group by x.product_id
    having count(*) > 1
  ) duplicates;
  if v_item_count > 0 then
    raise exception 'DUPLICATE_ORDER_PRODUCT';
  end if;

  -- Lock products in deterministic order to serialize stock changes and avoid
  -- deadlocks between multi-product orders.
  for v_item in
    select p.id, p.title, p.price_inr, p.artisan_id, p.available_stock, x.quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    join public.products p on p.id = x.product_id
    order by p.id
    for update of p
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 1000 then
      raise exception 'INVALID_ORDER_QUANTITY';
    end if;
    if v_item.available_stock < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK';
    end if;
    if not exists (select 1 from public.products where id = v_item.id and status = 'published') then
      raise exception 'PRODUCT_NOT_AVAILABLE';
    end if;
    v_total := v_total + (v_item.price_inr * v_item.quantity);
  end loop;

  select count(*) into v_item_count
  from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  join public.products p on p.id = x.product_id;
  if v_item_count <> jsonb_array_length(p_items) then
    raise exception 'PRODUCT_NOT_AVAILABLE';
  end if;

  insert into public.orders (
    buyer_id, buyer_name, buyer_contact, delivery_address,
    total_inr, status, payment_mode, idempotency_key
  ) values (
    p_buyer_id,
    v_buyer.buyer_name,
    coalesce(v_buyer.email, v_buyer.phone),
    trim(p_delivery_address),
    v_total,
    'placed',
    p_payment_mode,
    p_idempotency_key
  ) returning * into v_order;

  insert into public.order_items (
    order_id, product_id, artisan_id, quantity, unit_price_inr, line_total_inr
  )
  select v_order.id, p.id, p.artisan_id, x.quantity, p.price_inr, p.price_inr * x.quantity
  from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  join public.products p on p.id = x.product_id;

  update public.products p
  set available_stock = p.available_stock - x.quantity
  from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  where p.id = x.product_id;

  delete from public.cart_items where buyer_id = p_buyer_id;

  select to_jsonb(v_order) || jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(to_jsonb(oi) || jsonb_build_object('product_title', p.title) order by oi.created_at)
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.order_id = v_order.id
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.place_buyer_order(uuid, jsonb, text, text, uuid) from public;
revoke all on function public.place_buyer_order(uuid, jsonb, text, text, uuid) from anon;
revoke all on function public.place_buyer_order(uuid, jsonb, text, text, uuid) from authenticated;
grant execute on function public.place_buyer_order(uuid, jsonb, text, text, uuid) to service_role;
