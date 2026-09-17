-- Cole no SQL Editor do Supabase quando for criar o banco.
-- Depois preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.

create extension if not exists "pgcrypto";

create table if not exists public.slide_images (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.slide_images enable row level security;

create policy "slide_images_select_public"
  on public.slide_images for select
  using (true);

create policy "slide_images_insert_public"
  on public.slide_images for insert
  with check (true);

create policy "slide_images_delete_public"
  on public.slide_images for delete
  using (true);

insert into storage.buckets (id, name, public)
values ('slide-images', 'slide-images', true)
on conflict (id) do nothing;

create policy "slide_images_storage_select"
  on storage.objects for select
  using (bucket_id = 'slide-images');

create policy "slide_images_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'slide-images');

create policy "slide_images_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'slide-images');
