create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  letter text not null check (letter ~ '^[a-z]$'),
  name text,
  image_url text,
  fact text,
  sort_order smallint not null unique check (sort_order between 0 and 7),
  created_at timestamptz not null default now(),
  constraint characters_name_not_blank
    check (name is null or char_length(trim(name)) > 0)
);

alter table public.characters enable row level security;

create policy "Characters are publicly readable"
  on public.characters
  for select
  to anon, authenticated
  using (true);

grant select on public.characters to anon, authenticated;

insert into public.characters (letter, name, image_url, fact, sort_order)
values
  ('h', null, null, null, 0),
  ('u', null, null, null, 1),
  ('m', null, null, null, 2),
  ('o', null, null, null, 3),
  ('u', null, null, null, 4),
  ('r', null, null, null, 5),
  ('m', null, null, null, 6),
  ('e', null, null, null, 7)
on conflict (sort_order) do nothing;
