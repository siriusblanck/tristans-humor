import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/profile";

export const getAccount = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
});

export async function requireAccount() {
  const account = await getAccount();
  if (!account.user) redirect("/");
  return { supabase: account.supabase, user: account.user };
}

export async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_path")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error("We couldn't load your profile. Please try again.");
  return data as Profile | null;
}
