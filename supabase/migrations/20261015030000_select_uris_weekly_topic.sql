-- Editorial topics have their own row, preserving the meaning of historical posts.
alter table public.owl_posts
  add column week_start date unique,
  add constraint owl_posts_week_starts_monday
    check (week_start is null or extract(isodow from week_start) = 1);

insert into public.owl_posts (id, sort_order, headline, scene, week_start)
values (
  '4177e5e0-7cdc-4d13-9f3f-8d81b76dd9a1',
  21,
  'when you''re tryna study but uris turnstile has other ideas',
  'At Columbia''s Uris Library, the character heads in to study when the metal turnstile arm swings into their hip. The joke is the physical hit from the gate, not a rejected ID or locked entrance. Keep Uris and the mishap central unless the reader''s twist changes the outcome.',
  '2026-10-12'
);
