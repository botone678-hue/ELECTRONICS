-- ==========================================================
-- MEGA CITY ELECTRONICS — PRODUCTION POSTGRESQL / SUPABASE SCHEMA
-- Single Source of Truth for Catalog, Orders, Inventory & Auth
-- ==========================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------
-- 1. PROFILES TABLE (Linked to auth.users)
-- ----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  saved_addresses jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 2. CATEGORIES TABLE
-- ----------------------------------------------------------
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  image_url text,
  subcategories text[] default '{}',
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 3. PRODUCTS & INVENTORY TABLE
-- ----------------------------------------------------------
create table if not exists public.products (
  id text primary key,
  name text not null,
  slug text not null unique,
  sku text not null unique,
  brand text not null,
  category_id text not null references public.categories(id) on delete restrict,
  category_name text not null,
  subcategory text not null,
  description text not null,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  discount_percent int check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  low_stock_threshold int not null default 3 check (low_stock_threshold >= 0),
  warranty text not null default '12 Months Official Warranty',
  featured boolean not null default false,
  hot_deal boolean not null default false,
  is_new boolean not null default false,
  is_active boolean not null default true,
  images text[] not null default '{}',
  specifications jsonb default '{}'::jsonb,
  rating numeric(3,2) not null default 5.0 check (rating >= 1.0 and rating <= 5.0),
  review_count int not null default 0 check (review_count >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for lightning fast searching and filtering
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_subcategory on public.products(subcategory);
create index if not exists idx_products_brand on public.products(brand);
create index if not exists idx_products_price on public.products(price);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_products_featured on public.products(featured);
create index if not exists idx_products_hot_deal on public.products(hot_deal);

-- ----------------------------------------------------------
-- 4. DELIVERY ZONES TABLE
-- ----------------------------------------------------------
create table if not exists public.delivery_zones (
  id text primary key,
  name text not null,
  fee numeric(10,2) not null default 0 check (fee >= 0),
  estimated_time text not null,
  minimum_order numeric(10,2) not null default 0,
  free_threshold numeric(10,2),
  active boolean not null default true,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------
-- 5. ORDERS TABLE
-- ----------------------------------------------------------
-- Order number sequence
create sequence if not exists order_number_seq start with 101 increment by 1;

create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  county text not null,
  town text not null,
  estate text not null,
  landmark text,
  instructions text,
  delivery_zone_id text not null references public.delivery_zones(id),
  delivery_zone_name text not null,
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_method text not null default 'CASH_ON_DELIVERY' check (payment_method in ('CASH_ON_DELIVERY', 'MPESA_ON_DELIVERY')),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  status text not null default 'ORDER_RECEIVED' check (status in ('ORDER_RECEIVED', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_number on public.orders(order_number);
create index if not exists idx_orders_phone on public.orders(customer_phone);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created on public.orders(created_at desc);

-- ----------------------------------------------------------
-- 6. ORDER ITEMS TABLE (Stores immutable price snapshots)
-- ----------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  sku text not null,
  image text,
  price_snapshot numeric(12,2) not null check (price_snapshot >= 0),
  quantity int not null check (quantity > 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  created_at timestamptz default now()
);

create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);

-- ----------------------------------------------------------
-- 7. REVIEWS TABLE (With verified purchase constraint)
-- ----------------------------------------------------------
create table if not exists public.reviews (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text not null,
  verified_purchase boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_reviews_product on public.reviews(product_id);

-- ----------------------------------------------------------
-- 8. WISHLISTS TABLE
-- ----------------------------------------------------------
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(customer_id, product_id)
);

create index if not exists idx_wishlists_customer on public.wishlists(customer_id);

-- ----------------------------------------------------------
-- 9. NOTIFICATIONS TABLE (Admin alerts)
-- ----------------------------------------------------------
create table if not exists public.notifications (
  id text primary key,
  title text not null,
  message text not null,
  type text not null default 'order' check (type in ('order', 'stock', 'system')),
  read boolean not null default false,
  order_id text,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_created on public.notifications(created_at desc);

-- ----------------------------------------------------------
-- 10. BUSINESS SETTINGS TABLE
-- ----------------------------------------------------------
create table if not exists public.business_settings (
  id text primary key default 'default',
  store_name text not null default 'MEGA CITY ELECTRONICS',
  tagline text default 'Premier Kenyan Electronics & Electrical Store',
  phone text not null default '0741775878',
  whatsapp text not null default '0741775878',
  email text not null default 'info@megacity.co.ke',
  location text not null default 'Along Zion Mall, Kenya',
  business_hours text not null default 'Monday - Saturday: 8:00 AM - 7:30 PM | Sunday: 10:00 AM - 4:00 PM',
  announcement text default '🚚 Free Same-Day Delivery in Eldoret CBD & Surrounds for all orders! Cash on Delivery Available.',
  delivery_promise text default 'Fast doorstep dispatch across Kenya with product inspection before payment.',
  free_delivery_banner text default 'Free Same-Day Delivery available for Eldoret CBD & orders above KSh 15,000 across Uasin Gishu!',
  is_accepting_orders boolean not null default true,
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------
-- HELPER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------

-- Automatic Profile Creation on Supabase Auth Sign Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, phone, role, saved_addresses)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    '[]'::jsonb
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Order Number Generator Function (MC-2026-000001 format)
create or replace function public.generate_order_number()
returns text as $$
declare
  seq_val int;
begin
  seq_val := nextval('order_number_seq');
  return 'MC-2026-' || lpad(seq_val::text, 6, '0');
end;
$$ language plpgsql;

-- ----------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.notifications enable row level security;
alter table public.business_settings enable row level security;

-- Helper to check if current authenticated user is an admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Profiles Policies
create policy "Users can view own profile or admins view all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile or admins update all"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- Categories Policies
create policy "Categories are publicly readable"
  on public.categories for select
  using (true);

create policy "Admins can manage categories"
  on public.categories for all
  using (public.is_admin());

-- Products Policies
create policy "Active products are publicly readable"
  on public.products for select
  using (is_active = true or public.is_admin());

create policy "Admins can manage products"
  on public.products for all
  using (public.is_admin());

-- Delivery Zones Policies
create policy "Delivery zones are publicly readable"
  on public.delivery_zones for select
  using (active = true or public.is_admin());

create policy "Admins can manage delivery zones"
  on public.delivery_zones for all
  using (public.is_admin());

-- Orders Policies
create policy "Customers can view their own orders or admins view all"
  on public.orders for select
  using (auth.uid() = customer_id or public.is_admin());

create policy "Anyone can insert orders during checkout"
  on public.orders for insert
  with check (true);

create policy "Admins can update orders"
  on public.orders for update
  using (public.is_admin());

-- Order Items Policies
create policy "Customers can view items of their orders or admins view all"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and (orders.customer_id = auth.uid() or public.is_admin())
    )
  );

create policy "Order items insertable during checkout"
  on public.order_items for insert
  with check (true);

-- Reviews Policies
create policy "Reviews are publicly readable"
  on public.reviews for select
  using (true);

create policy "Authenticated users can submit reviews"
  on public.reviews for insert
  with check (auth.role() = 'authenticated');

-- Wishlists Policies
create policy "Users manage own wishlist"
  on public.wishlists for all
  using (auth.uid() = customer_id);

-- Notifications Policies
create policy "Only admins can view notifications"
  on public.notifications for select
  using (public.is_admin());

create policy "Admins can update notifications"
  on public.notifications for update
  using (public.is_admin());

-- Business Settings Policies
create policy "Settings are publicly readable"
  on public.business_settings for select
  using (true);

create policy "Admins can update settings"
  on public.business_settings for update
  using (public.is_admin());

-- ----------------------------------------------------------
-- REALTIME PUBLICATIONS
-- ----------------------------------------------------------
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.business_settings;
