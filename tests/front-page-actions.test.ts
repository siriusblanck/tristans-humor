import { beforeEach, describe, expect, it, vi } from "vitest";

/* Behavior inventory:
 * Generation: requires a session; incomplete profiles go to onboarding; malformed forms
 * never reach Gemini; the author is the verified user and their saved profile, never form
 * fields; success revalidates the front page; failures pass through without revalidating.
 * Votes: malformed input and signed-out callers never reach the database; the RPC gets the
 * parsed values; own-post (RLS), missing post, and unexpected errors map to messages;
 * success returns the new totals and revalidates.
 */
const mocks = vi.hoisted(() => ({
  requireAccount: vi.fn(), getAccount: vi.fn(), getProfile: vi.fn(), createGeneration: vi.fn(),
  buildGenerationDeps: vi.fn(), revalidatePath: vi.fn(), redirect: vi.fn(), rpc: vi.fn(), single: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAccount: mocks.requireAccount, getAccount: mocks.getAccount, getProfile: mocks.getProfile }));
vi.mock("@/lib/owl-post/create-generation", () => ({ createGeneration: mocks.createGeneration }));
vi.mock("@/lib/owl-post/generation-deps", () => ({ buildGenerationDeps: mocks.buildGenerationDeps }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { castVote, submitGeneration } from "@/app/_front-page/actions";

const GENERATION = "4a1c2a8e-4b7d-4c1e-9a2b-1d2e3f4a5b6c";
const CHARACTER = "3f1c2a8e-4b7d-4c1e-9a2b-1d2e3f4a5b6c";
const profile = { id: "verified-id", first_name: "Tristan", last_name: "Rai", avatar_path: null, house: "ravenclaw" };
const supabase = { rpc: mocks.rpc };

function form(fields: Record<string, string> = { character_id: CHARACTER, twist: "  late again " }) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

beforeEach(() => {
  mocks.requireAccount.mockResolvedValue({ supabase, user: { id: "verified-id" } });
  mocks.getAccount.mockResolvedValue({ supabase, user: { id: "verified-id" } });
  mocks.getProfile.mockResolvedValue(profile);
  mocks.buildGenerationDeps.mockReturnValue({ fake: "deps" });
  mocks.createGeneration.mockResolvedValue({ ok: true, generationId: GENERATION, remaining: 1 });
  mocks.redirect.mockImplementation((path: string) => { throw new Error(`redirect:${path}`); });
  mocks.rpc.mockReturnValue({ single: mocks.single });
  mocks.single.mockResolvedValue({ data: { upvotes: 3, downvotes: 1, my_vote: 1 }, error: null });
});

describe("submitting a generation", () => {
  it("generates as the verified user with their saved profile", async () => {
    const data = form({ character_id: CHARACTER, twist: "late again", author_id: "victim", house: "slytherin", first_name: "Evil" });
    expect(await submitGeneration({}, data)).toEqual({ success: "Your owl has landed.", generationId: GENERATION, remaining: 1 });
    expect(mocks.buildGenerationDeps).toHaveBeenCalledWith(supabase, "verified-id");
    expect(mocks.createGeneration).toHaveBeenCalledWith(
      { fake: "deps" },
      { id: "verified-id", first_name: "Tristan", last_name: "Rai", house: "ravenclaw" },
      { characterId: CHARACTER, twist: "late again" },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("requires a session", async () => {
    mocks.requireAccount.mockRejectedValue(new Error("redirect:/"));
    await expect(submitGeneration({}, form())).rejects.toThrow("redirect:/");
    expect(mocks.createGeneration).not.toHaveBeenCalled();
  });

  it.each([null, { ...profile, house: null }, { ...profile, last_name: " " }])("sends incomplete profiles to onboarding: %j", async (saved) => {
    mocks.getProfile.mockResolvedValue(saved);
    await expect(submitGeneration({}, form())).rejects.toThrow("redirect:/profile");
    expect(mocks.createGeneration).not.toHaveBeenCalled();
  });

  it("returns field errors without calling Gemini", async () => {
    expect(await submitGeneration({}, form({ character_id: "hagrid" }))).toEqual({
      error: "Check the form below.", fields: { character_id: "Choose who's writing today." },
    });
    expect(mocks.createGeneration).not.toHaveBeenCalled();
  });

  it("passes failures through without revalidating", async () => {
    mocks.createGeneration.mockResolvedValue({ ok: false, error: "The owl refused to carry that one." });
    expect(await submitGeneration({}, form())).toEqual({ error: "The owl refused to carry that one." });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("casting a vote", () => {
  it("calls the RPC with parsed values and returns the new totals", async () => {
    expect(await castVote(GENERATION, 1)).toEqual({ ok: true, upvotes: 3, downvotes: 1, myVote: 1 });
    expect(mocks.rpc).toHaveBeenCalledWith("cast_vote", { target_generation: GENERATION, vote: 1 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("returns a null vote after removing one", async () => {
    mocks.single.mockResolvedValue({ data: { upvotes: 2, downvotes: 1, my_vote: null }, error: null });
    expect(await castVote(GENERATION, 0)).toEqual({ ok: true, upvotes: 2, downvotes: 1, myVote: 0 });
  });

  it.each([[GENERATION, 5], ["drop table", 1], [GENERATION, "1"]])("rejects malformed input %j / %j", async (id, value) => {
    expect(await castVote(id, value)).toEqual({ ok: false, error: "That vote didn't make sense. Refresh and try again." });
    expect(mocks.getAccount).not.toHaveBeenCalled();
  });

  it("asks signed-out visitors to sign in", async () => {
    mocks.getAccount.mockResolvedValue({ supabase, user: null });
    expect(await castVote(GENERATION, 1)).toEqual({ ok: false, error: "Sign in to award points." });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "You can't award points to your own post."],
    ["23503", "That post has vanished."],
    ["PGRST116", "That post has vanished."],
    ["57014", "Your vote didn't go through. Please try again."],
  ])("maps database error %s", async (code, error) => {
    mocks.single.mockResolvedValue({ data: null, error: { code, message: "db" } });
    expect(await castVote(GENERATION, -1)).toEqual({ ok: false, error });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
