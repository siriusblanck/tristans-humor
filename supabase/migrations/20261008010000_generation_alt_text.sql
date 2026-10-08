-- The caption model already describes the picture it asks for; keep that description as
-- the image's alt text so screen readers get more than "AI illustration".
alter table public.generations
  add column image_alt text
  constraint generations_image_alt_length check (image_alt is null or char_length(btrim(image_alt)) between 1 and 600);

grant select (image_alt) on public.generations to anon, authenticated;
