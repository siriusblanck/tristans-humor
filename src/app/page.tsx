import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import CharacterSequence from "./character-sequence";
import { EMPTY_CHARACTER_SLOTS, type Character } from "@/lib/characters";

type CharacterRow = Omit<Character, "id"> & { id: string };
type ConnectionStatus = "connected" | "missing" | "unavailable";

async function loadCharacters(): Promise<{
  characters: Character[];
  connectionStatus: ConnectionStatus;
}> {
  await connection();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { characters: EMPTY_CHARACTER_SLOTS, connectionStatus: "missing" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("characters")
    .select("id, letter, name, image_url, fact, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    return { characters: EMPTY_CHARACTER_SLOTS, connectionStatus: "unavailable" };
  }

  const rows = (data ?? []) as CharacterRow[];
  const rowByOrder = new Map(rows.map((row) => [row.sort_order, row]));
  const characters = EMPTY_CHARACTER_SLOTS.map(
    (emptySlot) => rowByOrder.get(emptySlot.sort_order) ?? emptySlot,
  );

  return { characters, connectionStatus: "connected" };
}

export default async function Home() {
  const { characters, connectionStatus } = await loadCharacters();

  return (
    <CharacterSequence
      characters={characters}
      connectionStatus={connectionStatus}
    />
  );
}
