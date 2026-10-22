-- ==============================================================================
-- DAVIS BOOKS SUPABASE DATABASE SETUP & COMPLETE SCHEMA
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project and navigate to the "SQL Editor" on the left menu.
-- 3. Click "New query", paste this entire script, and click "Run".
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. USER PROFILES & ROLES TABLE
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text default 'customer' check (role in ('admin', 'manager', 'customer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Policies for profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

drop policy if exists "Admins and managers can view all profiles" on public.profiles;
create policy "Admins and managers can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Trigger: Automatically create public profile on Supabase auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'customer'
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 3. BOOKS CATALOG TABLE
create table if not exists public.books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique,
  subtitle text,
  description text,
  price numeric(10,2) default 0.00,
  currency text default 'GHS',
  cover_url text,
  pdf_storage_path text,   -- Private Supabase Storage bucket path ('book-files')
  epub_storage_path text,  -- Private Supabase Storage bucket path ('book-files')
  preview_pdf_url text,
  is_published boolean default true,
  category text default 'General',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.books enable row level security;

-- Public read for published books
drop policy if exists "Public can view published books" on public.books;
create policy "Public can view published books"
  on public.books for select
  using (is_published = true);

-- Admins and managers full access to books
drop policy if exists "Admins and managers manage books" on public.books;
create policy "Admins and managers manage books"
  on public.books for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- Seed initial books into catalog
insert into public.books (title, slug, category, price, currency, cover_url, is_published, pdf_storage_path, epub_storage_path)
values 
  ('The Expected Glory of the Latter Church', 'the-expected-glory', 'Spiritual Growth', 65.00, 'GHS', 'images/the-expected-glory.jpeg', true, 'protected/the-expected-glory.pdf', 'protected/the-expected-glory.epub'),
  ('Who Told You That You Were Naked?', 'who-told-you-that-you-were-naked', 'Spiritual Growth', 60.00, 'GHS', 'images/who-told-you-that-you-were-naked.png', true, 'protected/who-told-you.pdf', ''),
  ('Jesus Must Remain in Heaven UNTIL...', 'jesus-must-remain-in-heaven', 'Theology', 70.00, 'GHS', 'images/jesus-must-remain.jpeg', true, 'protected/jesus-must-remain.pdf', 'protected/jesus-must-remain.epub'),
  ('The Making of a Nation', 'the-making-of-a-nation', 'Leadership & Society', 80.00, 'GHS', 'images/the-making-of-a-nation.jpg', true, 'protected/the-making-of-a-nation.pdf', ''),
  ('Temptation', 'temptation', 'Christian Living', 55.00, 'GHS', 'images/temptation-front.jpeg', true, 'protected/temptation.pdf', '')
on conflict (slug) do nothing;


-- 4. PURCHASES & READING ACCESS TABLE
create table if not exists public.purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  book_id uuid references public.books(id) on delete cascade not null,
  buyer_email text not null,
  buyer_name text,
  amount_paid numeric(10,2) not null,
  currency text default 'GHS',
  payment_status text default 'completed' check (payment_status in ('pending', 'completed', 'refunded', 'manual_added')),
  transaction_ref text,
  added_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.purchases enable row level security;

-- Customers can view only their own purchases
drop policy if exists "Users view own purchases" on public.purchases;
create policy "Users view own purchases"
  on public.purchases for select
  using (auth.uid() = user_id or lower(buyer_email) = lower(auth.jwt()->>'email'));

-- Admins & purchase managers can view, add, and manage customer purchases
drop policy if exists "Admins and managers manage purchases" on public.purchases;
create policy "Admins and managers manage purchases"
  on public.purchases for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );


-- 5. SITE SETTINGS & SOCIAL LINKS TABLE
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.site_settings enable row level security;

-- Public can read site settings (social links, author bio, contact)
drop policy if exists "Public read site settings" on public.site_settings;
create policy "Public read site settings"
  on public.site_settings for select
  using (true);

-- Admins and managers can update settings
drop policy if exists "Admins/Managers update site settings" on public.site_settings;
create policy "Admins/Managers update site settings"
  on public.site_settings for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- Seed initial settings
insert into public.site_settings (key, value)
values 
  ('social_links', '{
    "facebook": "https://facebook.com",
    "twitter": "https://x.com",
    "instagram": "https://instagram.com",
    "whatsapp": "+233 24 000 0000",
    "youtube": "https://youtube.com"
  }'::jsonb),
  ('author_info', '{
    "name": "Mr. Davis",
    "title": "Author, Speaker & Educator",
    "bio": "Inspiring lives and providing timeless knowledge through books for a brighter future.",
    "phone": "+233 24 000 0000",
    "email": "contact@davisbooks.org"
  }'::jsonb)
on conflict (key) do nothing;


-- 6. STORAGE BUCKET CONFIGURATION & RLS (Run in SQL or Storage Dashboard)
-- Create private bucket 'book-files' and public bucket 'book-covers'
insert into storage.buckets (id, name, public)
values 
  ('book-files', 'book-files', false),
  ('book-covers', 'book-covers', true)
on conflict (id) do update set public = excluded.public;

-- Storage Policy: Download restricted to buyers or admins/managers
drop policy if exists "Purchased users can download book files" on storage.objects;
create policy "Purchased users can download book files"
  on storage.objects for select
  using (
    bucket_id = 'book-files'
    and (
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'manager')
      )
      or exists (
        select 1 from public.purchases p
        join public.books b on b.id = p.book_id
        where (p.user_id = auth.uid() or lower(p.buyer_email) = lower(auth.jwt()->>'email'))
          and p.payment_status in ('completed', 'manual_added')
          and (b.pdf_storage_path = name or b.epub_storage_path = name)
      )
    )
  );

-- Storage Policy: Admins/Managers upload books
drop policy if exists "Admins/Managers upload book files" on storage.objects;
create policy "Admins/Managers upload book files"
  on storage.objects for insert
  with check (
    bucket_id = 'book-files'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );
