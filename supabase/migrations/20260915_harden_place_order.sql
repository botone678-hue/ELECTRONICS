-- Production checkout hardening: trusted pricing, atomic inventory and private order writes.

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
set search_path = public, pg_temp
as $$
declare
  v_order_id text := 'ord-' || replace(gen_random_uuid()::text, '-', '');
  v_order_number text;
  v_zone public.delivery_zones%rowtype;
  v_product public.products%rowtype;
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_subtotal numeric(12,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_total numeric(12,2);
  v_payment_method text;
  v_customer_name text;
  v_customer_phone text;
  v_item_price numeric(12,2);
  v_item_subtotal numeric(12,2);
begin
  if coalesce(trim(p_customer_name), '') = '' then
    raise exception 'Customer name is required';
  end if;
  if coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Customer phone is required';
  end if;
  if coalesce(trim(p_town), '') = '' or coalesce(trim(p_estate), '') = '' then
    raise exception 'Town and Estate are required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  select * into v_zone
  from public.delivery_zones
  where id = p_delivery_zone_id and active = true
  for share;

  if not found then
    raise exception 'Selected delivery zone is unavailable';
  end if;

  v_payment_method := case when p_payment_method = 'MPESA_ON_DELIVERY' then 'MPESA_ON_DELIVERY' else 'CASH_ON_DELIVERY' end;
  v_customer_name := trim(p_customer_name);
  v_customer_phone := trim(p_customer_phone);

  if exists (select 1 from public.business_settings where id = 'default' and is_accepting_orders = false) then
    raise exception 'The store is not currently accepting orders';
  end if;

  -- Lock every requested product row before pricing/stock checks. This makes
  -- concurrent checkouts serialize on the same inventory rows.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := trim(v_item->>'productId');
    if v_product_id = '' then
      raise exception 'Invalid product in cart';
    end if;
    if (v_item->>'quantity') is null or (v_item->>'quantity') !~ '^[0-9]+$' then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity <= 0 or v_quantity > 100 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    select * into v_product
    from public.products
    where id = v_product_id and is_active = true
    for update;

    if not found then
      raise exception 'Product % is unavailable', v_product_id;
    end if;
    if v_product.stock_quantity < v_quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    -- Reject duplicate product rows rather than silently double-decrementing.
    if (select count(*) from jsonb_array_elements(p_items) x where trim(x->>'productId') = v_product_id) > 1 then
      raise exception 'Duplicate product % in cart', v_product_id;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  if v_subtotal < v_zone.minimum_order then
    raise exception 'Minimum order for % is KSh %', v_zone.name, v_zone.minimum_order;
  end if;

  v_delivery_fee := case
    when coalesce(v_zone.free_threshold, 0) > 0 and v_subtotal >= v_zone.free_threshold then 0
    else v_zone.fee
  end;
  v_total := v_subtotal + v_delivery_fee;
  v_order_number := public.generate_order_number();

  insert into public.orders (
    id, order_number, customer_id, customer_name, customer_phone, customer_email,
    county, town, estate, landmark, instructions, delivery_zone_id, delivery_zone_name,
    delivery_fee, subtotal, total, payment_method, payment_status, status, status_history
  ) values (
    v_order_id, v_order_number, p_customer_id, v_customer_name, v_customer_phone, nullif(trim(p_customer_email), ''),
    trim(p_county), trim(p_town), trim(p_estate), nullif(trim(p_landmark), ''), nullif(trim(p_instructions), ''),
    v_zone.id, v_zone.name, v_delivery_fee, v_subtotal, v_total, v_payment_method, 'PENDING', 'ORDER_RECEIVED',
    jsonb_build_array(jsonb_build_object('status','ORDER_RECEIVED','timestamp',now()))
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := trim(v_item->>'productId');
    v_quantity := (v_item->>'quantity')::integer;

    select * into v_product
    from public.products
    where id = v_product_id
    for update;

    v_item_price := v_product.price;
    v_item_subtotal := v_item_price * v_quantity;

    insert into public.order_items (
      order_id, product_id, product_name, sku, image, price_snapshot, quantity, subtotal
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.sku,
      coalesce(v_product.images[1], null), v_item_price, v_quantity, v_item_subtotal
    );

    update public.products
    set stock_quantity = stock_quantity - v_quantity,
        updated_at = now()
    where id = v_product.id;
  end loop;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'subtotal', v_subtotal, 'delivery_fee', v_delivery_fee, 'total', v_total);
end;
$$;

revoke all on function public.place_order(uuid,text,text,text,text,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.place_order(uuid,text,text,text,text,text,text,text,text,text,text,jsonb) to service_role;

-- Checkout must go through the server/RPC so clients cannot inject arbitrary
-- prices, totals, customer IDs, order statuses or inventory changes.
drop policy if exists "Anyone can insert orders during checkout" on public.orders;
drop policy if exists "Order items insertable during checkout" on public.order_items;
