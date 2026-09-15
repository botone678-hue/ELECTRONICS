-- Production RLS hardening.
-- This migration removes client-controlled review/order writes and prevents
-- signup metadata from creating admin accounts. Service-role server writes
-- remain available for checkout and admin operations.

-- Never trust role metadata supplied during signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name, email, phone, role, saved_addresses)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'customer',
    '[]'::jsonb
  )
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        phone = excluded.phone;
  return new;
end;
$$;

-- The server is the only review writer. It derives customer identity and
-- verified-purchase state from the authenticated session and delivered orders.
drop policy if exists "Authenticated users can submit reviews" on public.reviews;
drop policy if exists "Users can insert own reviews" on public.reviews;

-- Keep reviews publicly readable, but prohibit direct anon/authenticated inserts.
-- service_role bypasses RLS for the trusted server route.

-- Wishlists remain customer-owned; explicitly split read/write policies so
-- future policy changes cannot accidentally broaden ownership.
drop policy if exists "Users manage own wishlist" on public.wishlists;
create policy "Users can view own wishlist"
  on public.wishlists for select
  using (auth.uid() = customer_id);
create policy "Users can add to own wishlist"
  on public.wishlists for insert
  with check (auth.uid() = customer_id);
create policy "Users can remove own wishlist"
  on public.wishlists for delete
  using (auth.uid() = customer_id);

-- Notifications are admin-only. Explicitly deny client inserts/deletes by
-- keeping only admin update/select policies; service_role creates alerts.
drop policy if exists "Admins can insert notifications" on public.notifications;
drop policy if exists "Admins can delete notifications" on public.notifications;

-- Enforce one review per customer/product at the database layer.
create unique index if not exists ux_reviews_customer_product
  on public.reviews(customer_id, product_id)
  where customer_id is not null;

-- Enforce verified purchases even for trusted server writes. The application
-- must not be able to accidentally persist an unverified review.
create or replace function public.enforce_verified_product_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchased boolean;
  v_name text;
begin
  if new.customer_id is null then
    raise exception 'A review requires an authenticated customer';
  end if;

  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = new.product_id
      and o.customer_id = new.customer_id
      and o.status = 'DELIVERED'
  ), p.name
  into v_purchased, v_name
  from public.profiles p
  where p.id = new.customer_id;

  if not v_purchased then
    raise exception 'Only customers with a delivered purchase can review this product';
  end if;

  new.verified_purchase := true;
  if v_name is not null then
    new.customer_name := v_name;
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_require_delivered_purchase on public.reviews;
create trigger reviews_require_delivered_purchase
before insert or update on public.reviews
for each row execute function public.enforce_verified_product_review();

-- Make review aggregates authoritative and prevent stale rating/review_count.
create or replace function public.refresh_product_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_id text;
begin
  v_product_id := coalesce(new.product_id, old.product_id);
  update public.products p
  set review_count = stats.review_count,
      rating = case when stats.review_count = 0 then 5.0 else stats.avg_rating end,
      updated_at = now()
  from (
    select count(*)::int as review_count,
           round(avg(rating)::numeric, 2) as avg_rating
    from public.reviews
    where product_id = v_product_id
  ) stats
  where p.id = v_product_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_refresh_product_stats on public.reviews;
create trigger reviews_refresh_product_stats
after insert or update or delete on public.reviews
for each row execute function public.refresh_product_review_stats();

-- Lock down helper functions against search_path hijacking.
alter function public.is_admin() set search_path = public, pg_temp;
alter function public.generate_order_number() set search_path = public, pg_temp;

-- Realtime consumers use Postgres Changes only. RLS is the database
-- authorization boundary for rows delivered through realtime.
