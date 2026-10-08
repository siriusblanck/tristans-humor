"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccount, getProfile, requireAccount } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile";
import { createGeneration } from "@/lib/owl-post/create-generation";
import { buildGenerationDeps } from "@/lib/owl-post/generation-deps";
import { parseGenerationForm, parseVote, type ComposerState, type VoteResult } from "@/lib/owl-post/inputs";

export async function submitGeneration(_previous: ComposerState, formData: FormData): Promise<ComposerState> {
  const { supabase, user } = await requireAccount();
  const profile = await getProfile(supabase, user.id);
  if (!isProfileComplete(profile)) redirect("/profile");

  const input = parseGenerationForm(formData);
  if (!input.ok) return { error: "Check the form below.", fields: input.fields };

  // The author is the verified session user and their saved profile, never form fields.
  const author = { id: user.id, first_name: profile.first_name, last_name: profile.last_name, house: profile.house };
  const outcome = await createGeneration(buildGenerationDeps(supabase, user.id), author, input.value);
  if (!outcome.ok) return { error: outcome.error };

  revalidatePath("/");
  return { success: "Your owl has landed.", generationId: outcome.generationId, remaining: outcome.remaining };
}

const VOTE_ERRORS: Record<string, string> = {
  "42501": "You can't award points to your own post.", // row-level security: self-vote
  "23503": "That post has vanished.", // foreign key: no such generation
  PGRST116: "That post has vanished.", // no row returned
};

export async function castVote(generationId: unknown, value: unknown): Promise<VoteResult> {
  const vote = parseVote(generationId, value);
  if (!vote) return { ok: false, error: "That vote didn't make sense. Refresh and try again." };

  const { supabase, user } = await getAccount();
  if (!user) return { ok: false, error: "Sign in to award points." };

  // Runs as the signed-in user: RLS decides whether this vote may be written.
  const { data, error } = await supabase
    .rpc("cast_vote", { target_generation: vote.generationId, vote: vote.value })
    .single<{ upvotes: number; downvotes: number; my_vote: -1 | 1 | null }>();

  if (error || !data) {
    const known = error?.code ? VOTE_ERRORS[error.code] : undefined;
    if (!known) console.error("Vote failed", { generationId: vote.generationId, userId: user.id, code: error?.code, error: error?.message });
    return { ok: false, error: known ?? "Your vote didn't go through. Please try again." };
  }

  revalidatePath("/");
  return { ok: true, upvotes: data.upvotes, downvotes: data.downvotes, myVote: data.my_vote ?? 0 };
}
