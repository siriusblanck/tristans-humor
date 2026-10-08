-- Owl Post: one NYC/Columbia prompt per day, AI generations in a character's voice,
-- votes from signed-in users, and a weekly House Cup.
--
-- Supabase's default privileges grant anon/authenticated every table privilege, and RLS
-- does not govern TRUNCATE. Each table therefore starts from `revoke all` and receives
-- only the privileges the app uses; RLS policies then filter rows on top of that.

-- Characters: read-only reference data. The original migration left INSERT, UPDATE,
-- DELETE, and TRUNCATE granted, guarded only by missing policies.
revoke all on public.characters from anon, authenticated;
grant select on public.characters to anon, authenticated;

-- Image prompts describe each character's look instead of naming them, which avoids
-- provider refusals for named fictional characters.
alter table public.characters
  add column appearance text,
  add constraint characters_appearance_length
    check (appearance is null or char_length(btrim(appearance)) between 1 and 300);

update public.characters
set appearance = case sort_order
  when 0 then 'a towering, broad-shouldered groundskeeper with a wild black beard, a long moleskin overcoat, and a lantern'
  when 1 then 'a short, prim official in a fuzzy pink tweed suit with a black velvet bow and a sugary, unsettling smile'
  when 2 then 'a stern, elegant professor in emerald robes and a pointed hat, hair in a tight bun, square spectacles'
  when 3 then 'an elderly wandmaker with wispy silver hair and pale, luminous eyes, holding a long, narrow wand box'
  when 4 then 'a lanky teenage wizard with flaming red hair, freckles, and a hand-knitted maroon jumper'
  when 5 then 'a warm, round-faced witch with curly red hair, a patched apron, and a wooden spoon'
  when 6 then 'a scruffy, ancient grey owl with ruffled feathers and bleary eyes, clutching a crumpled letter'
end
where sort_order between 0 and 6;

-- Houses ---------------------------------------------------------------------------

create type public.hogwarts_house as enum ('gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin');

alter table public.profiles add column house public.hogwarts_house;
grant update (house) on public.profiles to authenticated;

-- Owl Post prompts: a fixed pool; the app picks one per New York calendar day. --------

create table public.owl_posts (
  id uuid primary key default gen_random_uuid(),
  sort_order smallint not null unique check (sort_order >= 0),
  headline text not null check (char_length(btrim(headline)) between 1 and 120),
  scene text not null check (char_length(btrim(scene)) between 1 and 400),
  created_at timestamptz not null default now()
);

alter table public.owl_posts enable row level security;
revoke all on public.owl_posts from anon, authenticated;
grant select on public.owl_posts to anon, authenticated;

create policy "Owl posts are publicly readable"
  on public.owl_posts for select to anon, authenticated
  using (true);

insert into public.owl_posts (sort_order, headline, scene) values
  (0,  'The 1 train skips 116th Street. Again.', 'A packed uptown 1 train roars straight past the 116th Street–Columbia University station while students on the platform watch it go.'),
  (1,  'Butler Library, 2 a.m., midterms week', 'The reading room of a grand old university library at 2 a.m.: laptops glowing, coffee cups stacked high, someone asleep on a textbook.'),
  (2,  'First snow on the Low Steps', 'The first snowfall of the year blankets the wide stone steps of a domed university library while students slide down on dining hall trays.'),
  (3,  'A rat hauls a whole slice down the subway stairs', 'A determined New York subway rat drags an entire slice of pizza down the station stairs as commuters step around it.'),
  (4,  'The bodega cat will not move off the bread', 'A corner bodega at night: a fat, unbothered cat sleeps on the only loaf of bread while a customer waits politely.'),
  (5,  'A tourist asks you how to get to Times Square', 'On a busy Manhattan sidewalk, a lost tourist with a giant paper map asks a student for directions to Times Square.'),
  (6,  'Your roommate microwaves fish in the dorm lounge', 'A cramped dorm lounge where a roommate microwaves leftover fish as everyone else flees the smell.'),
  (7,  'The halal cart on Broadway at 1 a.m.', 'A glowing halal food cart on a Broadway street corner at 1 a.m., steam rising, a line of hungry students in hoodies.'),
  (8,  'A Midwest "hi!" meets a New York sidewalk', 'A cheerful student waves hello to strangers on a hurried New York sidewalk; nobody waves back.'),
  (9,  'The dorm radiator hisses at 3 a.m.', 'An old dorm room at 3 a.m. in October: the cast-iron radiator clanks and hisses like it is alive while a student stares at the ceiling.'),
  (10, 'Hunting for a seat on the Steps at noon', 'The first sunny day of the semester: every inch of a wide campus staircase is covered with students eating lunch.'),
  (11, 'Orgo Night in the library', 'A rowdy marching band bursts into a silent university library during finals week as students cheer and groan.'),
  (12, 'The Amsterdam Avenue wind tunnel', 'A November wind roars down Amsterdam Avenue, flipping umbrellas inside out and sending scarves and homework flying.'),
  (13, 'A $9 iced coffee in SoHo', 'A trendy SoHo cafe with a long line, where a tiny iced coffee costs nine dollars and comes in a very aesthetic cup.'),
  (14, 'Central Park on the first warm Saturday', 'Central Park on the first warm Saturday of spring: picnic blankets everywhere, dogs, frisbees, and not a patch of grass left.'),
  (15, 'Jaywalking like a true New Yorker', 'A student confidently crosses a Manhattan avenue against the "don''t walk" sign as yellow taxis honk.'),
  (16, 'The Staten Island Ferry at sunset', 'The orange Staten Island Ferry crossing New York Harbor at sunset, the Statue of Liberty and the skyline glowing behind it.'),
  (17, 'Waiting 40 minutes for the M4 bus', 'A crowd at an uptown bus stop stares down the avenue for a bus that never comes, then three arrive at once.'),
  (18, 'The great bagel debate', 'A New York bagel shop counter where two friends argue loudly over everything bagels versus plain with scallion cream cheese.'),
  (19, 'Touring a "cozy" $3,400 studio', 'A real estate agent proudly shows a tiny Manhattan studio where the shower is in the kitchen.'),
  (20, 'Rush hour at Times Square–42nd Street', 'A rush-hour subway platform at Times Square: a wall of commuters, a subway performer, and a train door closing on a backpack.');

-- Generations: written only by the server after Gemini returns. --------------------

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  -- Snapshots keep the public feed independent of private profile rows.
  author_display text not null check (char_length(btrim(author_display)) between 1 and 90),
  house public.hogwarts_house not null,
  character_id uuid not null references public.characters (id),
  owl_post_id uuid not null references public.owl_posts (id),
  owl_post_date date not null,
  user_twist text check (user_twist is null or char_length(btrim(user_twist)) between 1 and 140),
  caption text not null check (char_length(btrim(caption)) between 1 and 400),
  image_path text not null,
  caption_prompt text not null,
  image_prompt text not null,
  caption_model text not null,
  image_model text not null,
  upvotes integer not null default 0 check (upvotes >= 0),
  downvotes integer not null default 0 check (downvotes >= 0),
  score integer generated always as (upvotes - downvotes) stored,
  created_at timestamptz not null default now(),
  constraint generations_image_belongs_to_author check (image_path like author_id::text || '/%')
);

create index generations_feed_idx on public.generations (owl_post_date desc, score desc, created_at desc);
create index generations_author_day_idx on public.generations (author_id, owl_post_date);
create index generations_character_idx on public.generations (character_id);
create index generations_owl_post_idx on public.generations (owl_post_id);

alter table public.generations enable row level security;
revoke all on public.generations from anon, authenticated;
-- Prompts, models, and twists are kept for the record but are not exposed to clients.
grant select (
  id, author_display, house, character_id, owl_post_id, owl_post_date,
  caption, image_path, upvotes, downvotes, score, created_at
) on public.generations to anon, authenticated;
-- Signed-in clients need the author to hide self-votes; the vote policy checks it too.
grant select (author_id) on public.generations to authenticated;
-- No INSERT/UPDATE/DELETE grants or policies: only the server's secret key writes rows.

create policy "Generations are publicly readable"
  on public.generations for select to anon, authenticated
  using (true);

-- Votes: one row per user per generation. ---------------------------------------

create table public.votes (
  generation_id uuid not null references public.generations (id) on delete cascade,
  voter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (generation_id, voter_id)
);

create index votes_voter_idx on public.votes (voter_id);

alter table public.votes enable row level security;
revoke all on public.votes from anon, authenticated;
grant select, delete on public.votes to authenticated;
-- voter_id is omitted: it always comes from the column default, auth.uid().
grant insert (generation_id, value) on public.votes to authenticated;
grant update (value) on public.votes to authenticated;

create policy "Users can read their own votes"
  on public.votes for select to authenticated
  using ((select auth.uid()) = voter_id);

create policy "Users can vote on other people's generations"
  on public.votes for insert to authenticated
  with check (
    (select auth.uid()) = voter_id
    and not exists (
      select 1 from public.generations g
      where g.id = generation_id and g.author_id = (select auth.uid())
    )
  );

create policy "Users can change their own votes"
  on public.votes for update to authenticated
  using ((select auth.uid()) = voter_id)
  with check ((select auth.uid()) = voter_id);

create policy "Users can remove their own votes"
  on public.votes for delete to authenticated
  using ((select auth.uid()) = voter_id);

-- Vote totals are denormalized so votes can stay private to their owners.
create function public.apply_vote_to_generation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.generations
    set upvotes = upvotes - (old.value = 1)::integer,
        downvotes = downvotes - (old.value = -1)::integer
    where id = old.generation_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    update public.generations
    set upvotes = upvotes + (new.value = 1)::integer,
        downvotes = downvotes + (new.value = -1)::integer
    where id = new.generation_id;
  end if;

  return null;
end;
$$;

revoke execute on function public.apply_vote_to_generation() from public, anon, authenticated;

create trigger on_vote_changed
  after insert or update or delete on public.votes
  for each row execute function public.apply_vote_to_generation();

-- Casting a vote runs as the caller, so the grants and policies above still apply.
-- 1 or -1 inserts (or changes) the caller's vote; 0 removes it.
create function public.cast_vote(target_generation uuid, vote smallint)
returns table (upvotes integer, downvotes integer, my_vote smallint)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if vote = 0 then
    delete from public.votes
    where generation_id = target_generation and voter_id = (select auth.uid());
  else
    insert into public.votes (generation_id, value)
    values (target_generation, vote)
    on conflict (generation_id, voter_id) do update set value = excluded.value;
  end if;

  return query
    select g.upvotes, g.downvotes, nullif(vote, 0)::smallint
    from public.generations g
    where g.id = target_generation;
end;
$$;

revoke execute on function public.cast_vote(uuid, smallint) from public, anon;
grant execute on function public.cast_vote(uuid, smallint) to authenticated;

-- House Cup: daily points per house; the app sums the current week. ---------------

create view public.house_points
with (security_invoker = true)
as
  select house, owl_post_date, sum(score)::integer as points, count(*)::integer as generation_count
  from public.generations
  group by house, owl_post_date;

revoke all on public.house_points from anon, authenticated;
grant select on public.house_points to anon, authenticated;

-- Generated images: public to read (the feed is public), writable only by the server.
-- No storage.objects policies are added, so clients can neither upload nor list files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('generations', 'generations', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']);
