-- Daily limits must hold even when several requests arrive at once. The server reserves a
-- slot here before calling Gemini (which costs money), then releases it once the post is
-- saved or has failed. Counting and reserving happen under one lock, so parallel requests
-- cannot all see "2 of 3 used" and all proceed.

create table public.generation_claims (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  owl_post_date date not null,
  created_at timestamptz not null default now()
);

create index generation_claims_day_idx on public.generation_claims (owl_post_date, author_id);
create index generation_claims_author_idx on public.generation_claims (author_id);

-- Server-only bookkeeping: no client privileges and no policies.
alter table public.generation_claims enable row level security;
revoke all on public.generation_claims from anon, authenticated;

create function public.claim_generation_slot(
  p_author uuid,
  p_date date,
  p_user_limit integer,
  p_global_limit integer
)
returns table (claim_id uuid, user_used integer, global_used integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user integer;
  v_global integer;
  v_claim uuid;
begin
  -- Serializes only this count-and-reserve step for the day, not the Gemini calls.
  perform pg_advisory_xact_lock(hashtextextended('owl-post-quota:' || p_date::text, 0));

  -- A claim outlives any request (the page's maxDuration is 120 s), so older ones are
  -- leftovers from a crashed instance and no longer count.
  delete from public.generation_claims where created_at < now() - interval '3 minutes';

  select
    (select count(*) from public.generations g where g.owl_post_date = p_date and g.author_id = p_author)
      + (select count(*) from public.generation_claims c where c.owl_post_date = p_date and c.author_id = p_author),
    (select count(*) from public.generations g where g.owl_post_date = p_date)
      + (select count(*) from public.generation_claims c where c.owl_post_date = p_date)
  into v_user, v_global;

  if v_user < p_user_limit and v_global < p_global_limit then
    insert into public.generation_claims (author_id, owl_post_date)
    values (p_author, p_date)
    returning id into v_claim;
  end if;

  return query select v_claim, v_user, v_global;
end;
$$;

revoke execute on function public.claim_generation_slot(uuid, date, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_generation_slot(uuid, date, integer, integer) to service_role;
