create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_first_name_valid check (
    first_name is null or char_length(btrim(first_name)) between 1 and 80
  ),
  constraint profiles_last_name_valid check (
    last_name is null or char_length(btrim(last_name)) between 1 and 80
  ),
  constraint profiles_avatar_belongs_to_user check (
    avatar_path is null or avatar_path like id::text || '/%'
  )
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, avatar_path) on public.profiles to authenticated;
grant all on public.profiles to service_role;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nullable names deliberately prompt the new user to introduce themselves.
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Existing assignment #2 users also receive a profile without changing their accounts.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create function public.touch_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.touch_profile_updated_at() from public, anon, authenticated;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.touch_profile_updated_at();

-- Images live in a private Storage bucket. The table stores only a file path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 3145728, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Users can read their own avatar"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
