-- Use the face-forward portrait from the same official character gallery.
update public.characters
set image_url = 'https://contentful.harrypotter.com/usf1vwtuqyxm/bL0jwWRYbIyDAgsl8W8Qw/22772152beef835f111dbd91535971eb/lord-voldemort-tom-riddle_3_1800x1248.png?w=600&fm=webp&q=80&fit=fill&f=top'
where name = 'Voldemort' and sort_order = 13;
