update public.characters
set letter = case sort_order
  when 4 then 'u'
  when 5 then 'r'
  when 6 then 'm'
  when 7 then 'e'
end
where sort_order between 4 and 7;

alter table public.characters
  drop constraint if exists characters_letter_check;

alter table public.characters
  add constraint characters_letter_check
  check (letter ~ '^[a-z]$');
