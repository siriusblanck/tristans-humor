import { redirect } from "next/navigation";
import { requireAccount, getProfile } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile";
import { EMPTY_CHARACTER_SLOTS, type Character } from "@/lib/characters";
import CharacterSequence from "@/app/character-sequence";
import AccountNav from "@/app/account-nav";

export default async function Gallery() {
  const { supabase, user } = await requireAccount();
  const profile = await getProfile(supabase, user.id);
  if (!isProfileComplete(profile)) redirect("/profile");

  const { data, error } = await supabase
    .from("characters")
    .select("id, letter, name, image_url, fact, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw new Error("We couldn't load the gallery. Please try again.");
  const rowByOrder = new Map((data as Character[]).map((row) => [row.sort_order, row]));
  const characters = EMPTY_CHARACTER_SLOTS.map((slot) => rowByOrder.get(slot.sort_order) ?? slot);

  return (
    <div className="gallery-page">
      <AccountNav current="gallery" />
      <CharacterSequence characters={characters} />
    </div>
  );
}
