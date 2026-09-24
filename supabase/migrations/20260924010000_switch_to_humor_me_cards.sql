alter table public.characters
  drop constraint if exists characters_letter_check;

alter table public.characters
  add constraint characters_letter_check
  check (letter ~ '^[a-z?]$');

update public.characters
set letter = case sort_order
  when 4 then 'r'
  when 5 then 'm'
  when 6 then 'e'
  when 7 then '?'
end
where sort_order between 4 and 7;
