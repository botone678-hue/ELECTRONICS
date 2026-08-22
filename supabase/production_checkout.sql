-- MEGA CITY ELECTRONICS: production checkout + realtime migration
-- Safe to run after supabase/schema.sql. No existing orders/products are deleted.

create or replace function public.place_order(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_county text,
  p_town text,
  p_estate text,
  p_landmark text,
  p_instructions text,
  p_delivery_zone_id text,
  p_payment_method text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zone public.delivery_zones%rowtype;
  v_order_id text;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_delivery_fee numeric(10,2);
  v_total numeric(12,2);
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_item_subtotal numeric(12,2);
  v_now timestamptz := now();
  v_history jsonb;
begin
  if nullif(trim(p_customer_name), '') is null or nullif(trim(p_customer_phone), '') is null then
    raise exception 'Please enter your full name and phone number.' using errcode = '22023';
  end if;

  if nullif(trim(p_town), '') is null or nullif(trim(p_estate), '') is null then
    raise exception 'Please provide complete delivery details (Town and Estate).' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty. Please add products to your cart.' using errcode = '22023';
  end if;

  if p_payment_method not in ('CASH_ON_DELIVERY','MPESA_ON_DELIVERY') then
    raise exception 'Unsupported payment method.' using errcode = '22023';
  end if;

  select * into v_zone
  from public.delivery_zones
  where id = p_delivery_zone_id and active = true
  for share;

  if not found then
    raise exception 'Selected delivery zone is unavailable.' using errcode = '22023';
  end if;

  -- Lock products in deterministic ID order to prevent concurrent overselling/deadlocks.
  for v_item in
    select value from jsonb_array_elements(p_items) order by value->>'productId'
  loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid product quantity.' using errcode = '22023';
    end if;

    select * into v_product
    from public.products
    where id = v_item->>'productId' and is_active = true
    for update;

    if not found then
      raise exception 'Product is unavailable or no longer in catalog.' using errcode = '22023';
    end if;

    if v_product.stock_quantity < v_qty then
      raise exception 'Insufficient stock for "%". Only % unit(s) remaining.', v_product.name, v_product.stock_quantity using errcode = '22023';
    end if;

    v_item_subtotal := v_product.price * v_qty;
    v_subtotal := v_subtotal + v_item_subtotal;
  end loop;

  v_delivery_fee := v_zone.fee;
  if v_zone.free_threshold is not null and v_subtotal >= v_zone.free_threshold then
    v_delivery_fee := 0;
  end if;

  v_total := v_subtotal + v_delivery_fee;
  v_order_id := 'ord-' || replace(gen_random_uuid()::text, '-', '');
  v_order_number := 'MC-2026-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  v_history := jsonb_build_array(jsonb_build_object(
    'status','ORDER_RECEIVED',
    'timestamp',v_now,
    'note',case when p_payment_method = 'CASH_ON_DELIVERY'
      then 'Order placed successfully via Cash on Delivery.'
      else 'Order placed successfully via M-Pesa on Delivery.' end
  ));

  insert into public.orders (
    id, order_number, customer_id, customer_name, customer_phone, customer_email,
    county, town, estate, landmark, instructions,
    delivery_zone_id, delivery_zone_name, delivery_fee, subtotal, total,
    payment_method, payment_status, status, status_history, created_at, updated_at
  ) values (
    v_order_id, v_order_number, p_customer_id, trim(p_customer_name), trim(p_customer_phone), nullif(trim(coalesce(p_customer_email,'')),''),
    coalesce(nullif(trim(p_county),''),'Uasin Gishu'), trim(p_town), trim(p_estate), nullif(trim(coalesce(p_landmark,'')),''), nullif(trim(coalesce(p_instructions,'')),''),
    v_zone.id, v_zone.name, v_delivery_fee, v_subtotal, v_total,
    p_payment_method, 'PENDING', 'ORDER_RECEIVED', v_history, v_now, v_now
  );

  for v_item in
    select value from jsonb_array_elements(p_items) order by value->>'productId'
  loop
    v_qty := (v_item->>'quantity')::integer;

    select * into v_product
    from public.products
    where id = v_item->>'productId' and is_active = true
    for update;

    v_item_subtotal := v_product.price * v_qty;

    insert into public.order_items (
      order_id, product_id, product_name, sku, image, price_snapshot, quantity, subtotal
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.sku,
      coalesce(v_product.images[1], ''), v_product.price, v_qty, v_item_subtotal
    );

    update public.products
    set stock_quantity = stock_quantity - v_qty,
        updated_at = now()
    where id = v_product.id;
  end loop;

  insert into public.notifications (id, title, message, type, read, order_id, created_at)
  values (
    'notif-' || replace(gen_random_uuid()::text, '-', ''),
    'New Order Received',
    v_order_number || ' from ' || trim(p_customer_name) || ' — KSh ' || to_char(v_total, 'FM999999990.00'),
    'order', false, v_order_id, v_now
  );

  return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number);
end;
$$;

revoke all on function public.place_order(uuid,text,text,text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.place_order(uuid,text,text,text,text,text,text,text,text,text,text,jsonb) to service_role;

-- Ensure Realtime emits the rows required by the live customer/admin cycle.
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.order_items;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
