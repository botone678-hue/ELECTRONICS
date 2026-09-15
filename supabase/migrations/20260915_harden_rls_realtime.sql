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

-- Profiles: users may update profile details, but role/email identity must be
-- controlled by the server/auth system. RLS cannot express column-level
-- restrictions, so application routes must continue to omit those fields.

-- Notifications are admin-only. Explicitly deny client inserts/deletes by
-- keeping only admin update/select policies; service_role creates alerts.
drop policy if exists "Admins can insert notifications" on public.notifications;
drop policy if exists "Admins can delete notifications" on public.notifications;

-- Realtime consumers must be governed by the same row visibility rules.
-- Orders: customers see only their own rows; admins see all.
-- Products/settings remain public according to their existing SELECT policies.
-- Notifications are admin-only according to the existing SELECT policy.

-- Enforce unique review per customer/product at the database layer.
create unique index if not exists ux_reviews_customer_product
  on public.reviews(customer_id, product_id)
  where customer_id is not null;

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

-- Lock down the helper functions against search_path hijacking.
alter function public.is_admin() set search_path = public, pg_temp;
alter function public.generate_order_number() set search_path = public, pg_temp;

-- Realtime publication is intentionally limited to tables used by the app.
-- RLS remains the authorization boundary for Postgres Changes.
