-- Add the thirteenth selectable writer without altering the existing cast.
insert into public.characters (letter, name, image_url, appearance, sort_order, is_active) values
  ('v', 'Voldemort',
   'https://contentful.harrypotter.com/usf1vwtuqyxm/6QxQAoCAiE6WftwA2hpsN3/740adf989ddc5db20a82163ec057af58/lord-voldemort-tom-riddle_2_1800x1248.png?w=600&fm=webp&q=80&fit=fill&f=top',
   'a tall, gaunt, bald wizard with chalk-white skin, slit-like nostrils, long pale fingers, and flowing black robes', 13, true);
