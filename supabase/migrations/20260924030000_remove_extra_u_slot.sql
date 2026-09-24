delete from public.characters
where sort_order = 7
  and name is null
  and image_url is null
  and fact is null;

do $$
begin
  if exists (select 1 from public.characters where sort_order = 7) then
    raise exception 'Slot 7 contains character data and cannot be removed automatically';
  end if;
end;
$$;

update public.characters
set letter = case sort_order
  when 4 then 'r'
  when 5 then 'm'
  when 6 then 'e'
end
where sort_order between 4 and 6;

alter table public.characters
  drop constraint if exists characters_sort_order_check;

alter table public.characters
  add constraint characters_sort_order_check
  check (sort_order between 0 and 6);
