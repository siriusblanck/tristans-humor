-- RLS and privilege checks for the Owl Post migrations (owl_post, generation_alt_text,
-- generation_claims).
--
-- Run inside a transaction that is always rolled back, after the migration is applied:
--   begin; <this file>; rollback;
-- It borrows the two oldest auth users as fixtures, writes one generation and some votes,
-- and reports one PASS/FAIL line per check. Nothing persists after the rollback.
-- Counts are scoped to the fixture generation because the fixture users may own real votes.
--
-- Role switches happen outside the exception blocks: a failed block rolls back its
-- subtransaction, which would otherwise also undo `set local role`.

create temp table rls_report (n serial, line text) on commit drop;

do $$
declare
  author uuid;
  voter uuid;
  generation uuid;
  n integer;
  counts record;
  slot record;
  report text[] := '{}';
begin
  select id into author from auth.users order by created_at limit 1;
  select id into voter from auth.users order by created_at offset 1 limit 1;
  if author is null or voter is null then
    raise exception 'Need at least two auth users as fixtures';
  end if;

  insert into public.generations (
    author_id, author_display, house, character_id, owl_post_id, owl_post_date,
    caption, image_path, caption_prompt, image_prompt, caption_model, image_model
  )
  select author, 'Fixture A.', 'gryffindor', c.id, o.id, current_date,
    'Fixture caption', author::text || '/fixture.png', 'caption prompt', 'image prompt', 'text-model', 'image-model'
  from public.characters c, public.owl_posts o
  order by c.sort_order, o.sort_order
  limit 1
  returning id into generation;

  -- Signed-out visitors ------------------------------------------------------------
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  begin
    select count(*) into n from public.generations where id = generation;
    report := report || format('%s anon reads the public feed', case when n = 1 then 'PASS' else 'FAIL' end);
  exception when others then report := report || ('FAIL anon reads the public feed: ' || sqlerrm);
  end;

  begin
    select count(*) into n from public.owl_posts;
    report := report || format('%s anon reads owl posts (%s)', case when n >= 1 then 'PASS' else 'FAIL' end, n);
    select count(*) into n from public.characters;
    report := report || format('%s anon reads characters (%s)', case when n >= 1 then 'PASS' else 'FAIL' end, n);
    select count(*) into n from public.house_points;
    report := report || text 'PASS anon reads house points';
  exception when others then report := report || ('FAIL anon reference reads: ' || sqlerrm);
  end;

  begin
    perform author_id from public.generations limit 1;
    report := report || text 'FAIL anon can read generation authors';
  exception when insufficient_privilege then report := report || text 'PASS anon cannot read generation authors';
  end;

  begin
    perform caption_prompt from public.generations limit 1;
    report := report || text 'FAIL anon can read stored prompts';
  exception when insufficient_privilege then report := report || text 'PASS anon cannot read stored prompts';
  end;

  begin
    perform 1 from public.votes limit 1;
    report := report || text 'FAIL anon can read votes';
  exception when insufficient_privilege then report := report || text 'PASS anon cannot read votes';
  end;

  begin
    perform public.cast_vote(generation, 1::smallint);
    report := report || text 'FAIL anon can vote';
  exception when insufficient_privilege then report := report || text 'PASS anon cannot vote';
  end;

  begin
    insert into public.characters (letter, sort_order) values ('x', 6);
    report := report || text 'FAIL anon can insert characters';
  exception when insufficient_privilege then report := report || text 'PASS anon cannot insert characters';
  end;

  -- The author ---------------------------------------------------------------------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', author, 'role', 'authenticated')::text, true);

  begin
    insert into public.generations (author_id, author_display, house, character_id, owl_post_id, owl_post_date, caption, image_path, caption_prompt, image_prompt, caption_model, image_model)
    select author, 'Forged', 'slytherin', character_id, owl_post_id, owl_post_date, 'Not from Gemini', author::text || '/forged.png', 'x', 'x', 'x', 'x'
    from public.generations where id = generation;
    report := report || text 'FAIL users can insert generations directly';
  exception when insufficient_privilege then report := report || text 'PASS users cannot insert generations directly';
  end;

  begin
    update public.generations set upvotes = 999 where id = generation;
    report := report || text 'FAIL users can edit vote totals';
  exception when insufficient_privilege then report := report || text 'PASS users cannot edit vote totals';
  end;

  begin
    perform public.cast_vote(generation, 1::smallint);
    report := report || text 'FAIL authors can vote on their own generation';
  exception when insufficient_privilege then report := report || text 'PASS authors cannot vote on their own generation';
  end;

  begin
    truncate public.characters;
    report := report || text 'FAIL users can truncate characters';
  exception when insufficient_privilege then report := report || text 'PASS users cannot truncate characters';
  end;

  begin
    update public.profiles set house = 'ravenclaw' where id = author;
    get diagnostics n = row_count;
    report := report || format('%s users can choose their own house', case when n = 1 then 'PASS' else 'FAIL' end);
    update public.profiles set house = 'slytherin' where id = voter;
    get diagnostics n = row_count;
    report := report || format('%s users cannot change another user''s house', case when n = 0 then 'PASS' else 'FAIL' end);
  exception when others then report := report || ('FAIL house updates: ' || sqlerrm);
  end;

  -- Another signed-in user -----------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', voter, 'role', 'authenticated')::text, true);

  begin
    select * into counts from public.cast_vote(generation, 1::smallint);
    report := report || format('%s an upvote inserts a vote row (%s up / %s down, mine %s)',
      case when counts.upvotes = 1 and counts.downvotes = 0 and counts.my_vote = 1 then 'PASS' else 'FAIL' end,
      counts.upvotes, counts.downvotes, counts.my_vote);
    select * into counts from public.cast_vote(generation, (-1)::smallint);
    report := report || format('%s changing to a downvote moves the totals (%s up / %s down)',
      case when counts.upvotes = 0 and counts.downvotes = 1 and counts.my_vote = -1 then 'PASS' else 'FAIL' end,
      counts.upvotes, counts.downvotes);
    select count(*) into n from public.votes where generation_id = generation;
    report := report || format('%s voters see their own vote', case when n = 1 then 'PASS' else 'FAIL' end);
  exception when others then report := report || ('FAIL voting: ' || sqlerrm);
  end;

  begin
    insert into public.votes (generation_id, voter_id, value) values (generation, author, 1);
    report := report || text 'FAIL users can vote as someone else';
  exception when insufficient_privilege then report := report || text 'PASS users cannot vote as someone else';
  end;

  begin
    update public.votes set generation_id = gen_random_uuid() where voter_id = voter;
    report := report || text 'FAIL users can move a vote to another generation';
  exception when insufficient_privilege then report := report || text 'PASS users cannot move a vote to another generation';
  end;

  begin
    perform public.cast_vote(generation, 2::smallint);
    report := report || text 'FAIL out-of-range votes are accepted';
  exception when check_violation then report := report || text 'PASS out-of-range votes are rejected';
  end;

  -- Back to the author: someone else's vote is invisible and untouchable.
  perform set_config('request.jwt.claims', json_build_object('sub', author, 'role', 'authenticated')::text, true);
  begin
    select count(*) into n from public.votes where generation_id = generation;
    report := report || format('%s votes are private to the voter', case when n = 0 then 'PASS' else 'FAIL' end);
    delete from public.votes where generation_id = generation;
    get diagnostics n = row_count;
    report := report || format('%s users cannot delete other people''s votes', case when n = 0 then 'PASS' else 'FAIL' end);
    perform author_id from public.generations limit 1;
    report := report || text 'PASS signed-in users can read generation authors';
  exception when others then report := report || ('FAIL author checks: ' || sqlerrm);
  end;

  begin
    insert into storage.objects (bucket_id, name, owner_id) values ('generations', author::text || '/upload.png', author::text);
    report := report || text 'FAIL users can upload generation images';
  exception when insufficient_privilege then report := report || text 'PASS users cannot upload generation images';
  end;

  -- The voter removes their vote.
  perform set_config('request.jwt.claims', json_build_object('sub', voter, 'role', 'authenticated')::text, true);
  begin
    select * into counts from public.cast_vote(generation, 0::smallint);
    select count(*) into n from public.votes where generation_id = generation;
    report := report || format('%s removing a vote deletes the row and restores totals (%s up / %s down)',
      case when counts.upvotes = 0 and counts.downvotes = 0 and counts.my_vote is null and n = 0 then 'PASS' else 'FAIL' end,
      counts.upvotes, counts.downvotes);
  exception when others then report := report || ('FAIL vote removal: ' || sqlerrm);
  end;

  begin
    perform 1 from public.generation_claims limit 1;
    report := report || text 'FAIL users can read generation claims';
  exception when insufficient_privilege then report := report || text 'PASS users cannot read generation claims';
  end;

  begin
    perform public.claim_generation_slot(voter, current_date, 3, 100);
    report := report || text 'FAIL users can reserve generation slots';
  exception when insufficient_privilege then report := report || text 'PASS users cannot reserve generation slots';
  end;

  -- The server's slot reservation (run as the table owner, standing in for service_role).
  execute 'reset role';

  begin
    -- The author already has the fixture generation today: two claims fill a limit of 3.
    for i in 1..2 loop
      select * into slot from public.claim_generation_slot(author, current_date, 3, 100);
      if slot.claim_id is null then raise exception 'claim % refused early', i; end if;
    end loop;
    select * into slot from public.claim_generation_slot(author, current_date, 3, 100);
    report := report || format('%s the daily limit counts saved posts plus open claims (%s used, claim %s)',
      case when slot.claim_id is null and slot.user_used = 3 then 'PASS' else 'FAIL' end, slot.user_used, coalesce(slot.claim_id::text, 'refused'));

    select * into slot from public.claim_generation_slot(voter, current_date, 3, slot.global_used);
    report := report || format('%s the app-wide limit refuses everyone once reached',
      case when slot.claim_id is null then 'PASS' else 'FAIL' end);

    update public.generation_claims set created_at = now() - interval '10 minutes' where author_id = author;
    select * into slot from public.claim_generation_slot(author, current_date, 3, 100);
    report := report || format('%s claims from crashed requests expire (%s used after expiry)',
      case when slot.claim_id is not null and slot.user_used = 1 then 'PASS' else 'FAIL' end, slot.user_used);
  exception when others then report := report || ('FAIL slot reservation: ' || sqlerrm);
  end;

  insert into rls_report (line) select unnest(report);
end;
$$;

select line from rls_report order by n;
