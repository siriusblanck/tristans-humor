-- Retire Errol without changing the writer attached to any existing generation.
alter table public.characters
  add column is_active boolean not null default true;

update public.characters
set is_active = false
where lower(btrim(name)) = 'errol';

alter table public.characters
  drop constraint characters_sort_order_check;

alter table public.characters
  add constraint characters_sort_order_check check (sort_order >= 0);

-- The first six humans keep their IDs/order. The second row uses the same official
-- portrait source as the existing cast, with appearance descriptions for generation.
insert into public.characters (letter, name, image_url, appearance, sort_order, is_active) values
  ('h', 'Harry Potter',
   'https://contentful.harrypotter.com/usf1vwtuqyxm/6fjvdemYmo7kJ2V5P5Xqhc/1fc2b0b396123f891e858069e00d0d2b/hp-f6-harry-at-great-hall-table-web-fact-file-image.jpg?w=600&fm=webp&q=80&fit=fill&f=top',
   'a slim young wizard with untidy black hair, round spectacles, a faint lightning-shaped forehead scar, and a red-and-gold scarf', 7, true),
  ('h', 'Hermione Granger',
   'https://contentful.harrypotter.com/usf1vwtuqyxm/4tNCXEveHBZWp1AgccZg52/39c30ab4bc67842362b78ca5ab8e0eef/HP-F4-goblet-of-fire-hermione-great-hall-smiling-book-web-landscape?w=600&fm=webp&q=80&fit=fill&f=top',
   'a young witch with bushy brown hair, an intent expression, a grey cardigan, a red-and-gold scarf, and an armful of annotated books', 8, true),
  ('d', 'Albus Dumbledore',
   'https://contentful.harrypotter.com/usf1vwtuqyxm/3BJZavhBZMxogQwDFJRGvi/d5bb755d86661e1e023a13e1640d8881/albus-dumbledore_2_1800x1248.png?w=600&fm=webp&q=80&fit=fill&f=top',
   'a tall elderly wizard with a long silver beard, half-moon spectacles, richly embroidered plum robes, and a matching pointed hat', 9, true),
  ('s', 'Severus Snape',
   'https://contentful.harrypotter.com/usf1vwtuqyxm/toxlayPDePtX8yx2wvWun/b65f6acd9087031b1ff39461d8f22d0a/severus-snape_2_1800x1248.png?w=600&fm=webp&q=80&fit=fill&f=top',
   'a tall, pale professor with shoulder-length straight black hair, a hooked nose, high-collared black robes, and a severe expression', 10, true),
  ('d', 'Draco Malfoy',
   'https://contentful.harrypotter.com/usf1vwtuqyxm/UVem7q7StFtLiccc4W1Yq/43b76ab775914fa8536d6d3297725881/draco-malfoy_2_1800x1248.png?w=600&fm=webp&q=80&fit=fill&f=top',
   'a pale young wizard with sleek platinum-blond hair, a narrow face, immaculate black robes, a green-and-silver scarf, and a cool smirk', 11, true),
  ('l', 'Luna Lovegood',
   'https://contentful.harrypotter.com/usf1vwtuqyxm/5YHzD6ve73jU2vEPQaTzEr/13ce606c8ae5d7842f86c1ef5fea38ea/luna-lovegood_4_1800x1248.png?w=600&fm=webp&q=80&fit=fill&f=top',
   'a dreamy young witch with waist-length pale-blond hair, wide pale eyes, radish earrings, a necklace of bottle caps, and a colourful knitted cardigan', 12, true);
