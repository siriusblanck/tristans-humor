import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import { createGeneration, type GenerationDeps } from "@/lib/owl-post/create-generation";
import { USER_DAILY_LIMIT, GLOBAL_DAILY_LIMIT } from "@/lib/owl-post/limits";

/* Behavior inventory:
 * Happy path: New York date drives the prompt and row; caption -> image -> upload -> insert,
 * in that order; the row records both prompts, both models, the byline, house, and twist.
 * Quota: a slot is claimed atomically before any Gemini call and released exactly once
 * on every later path (success or failure); a refused claim never reaches Gemini.
 * Stops before Gemini: unknown/undrawable character, no Owl Post, either quota exhausted,
 * context load or claim failure. Stops before storage: caption or image refused, empty, malformed,
 * or thrown (rate limit/network). Storage failure -> no row. Row failure -> upload removed.
 * Invariants: image prompt never names the cast; failures are logged with context and
 * surface friendly messages; the author's identity comes from the verified session only.
 */
const AUTHOR = { id: "author-id", first_name: "Tristan", last_name: "Rai", house: "ravenclaw" as const };
const HAGRID = { id: "11111111-1111-4111-8111-111111111111", name: "Hagrid", appearance: "a towering groundskeeper" };
const ERROL = { id: "22222222-2222-4222-8222-222222222222", name: "Errol", appearance: null };
const POST = { id: "post-0", sort_order: 0, headline: "The 1 train skips 116th", scene: "A train roars past." };
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const captionJson = JSON.stringify({ caption: "Blimey, it didn't even slow down!", scene: "Hagrid waves a lantern at a speeding train." });

let deps: Mocked<GenerationDeps>;

beforeEach(() => {
  deps = {
    now: vi.fn(() => new Date("2026-10-09T03:30:00Z")), // 11:30 p.m. on Oct 8 in New York
    newId: vi.fn(() => "generation-id"),
    models: { text: "text-model", image: "image-model" },
    loadContext: vi.fn(async () => ({ cast: [HAGRID, ERROL], owlPosts: [POST] })),
    claimSlot: vi.fn(async () => ({ claimId: "claim-1", userUsed: 1, globalUsed: 10 })),
    releaseSlot: vi.fn(async () => undefined),
    generateCaption: vi.fn(async () => ({ text: captionJson, candidates: [{ finishReason: "STOP" }] })),
    generateImage: vi.fn(async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ inlineData: { data: PNG.toString("base64"), mimeType: "image/png" } }] } }] })),
    uploadImage: vi.fn(async () => true),
    removeImage: vi.fn(async () => undefined),
    insertGeneration: vi.fn(async () => true),
    log: vi.fn(),
  } as Mocked<GenerationDeps>;
});

const run = (characterId = HAGRID.id, twist: string | null = "my RA saw it") =>
  createGeneration(deps, AUTHOR, { characterId, twist });

describe("creating a generation", () => {
  it("captions, draws, stores, and records today's post", async () => {
    expect(await run()).toEqual({ ok: true, generationId: "generation-id", remaining: USER_DAILY_LIMIT - 2 });

    expect(deps.loadContext).toHaveBeenCalledWith("2026-10-08");
    const captionPrompt = deps.generateCaption.mock.calls[0][0];
    expect(captionPrompt.system).toContain("Hagrid");
    expect(captionPrompt.user).toContain(POST.headline);
    expect(captionPrompt.user).toContain("<twist>my RA saw it</twist>");

    const imagePrompt: string = deps.generateImage.mock.calls[0][0];
    expect(imagePrompt).toContain(HAGRID.appearance);
    expect(imagePrompt).not.toMatch(/hagrid|errol/i);

    expect(deps.uploadImage).toHaveBeenCalledWith("author-id/generation-id.png", new Uint8Array(PNG), "image/png");
    expect(deps.insertGeneration).toHaveBeenCalledWith({
      id: "generation-id",
      author_id: "author-id",
      author_display: "Tristan R.",
      house: "ravenclaw",
      character_id: HAGRID.id,
      owl_post_id: POST.id,
      owl_post_date: "2026-10-08",
      user_twist: "my RA saw it",
      caption: "Blimey, it didn't even slow down!",
      image_path: "author-id/generation-id.png",
      image_alt: "Hagrid waves a lantern at a speeding train.",
      caption_prompt: captionPrompt.record,
      image_prompt: imagePrompt,
      caption_model: "text-model",
      image_model: "image-model",
    });

    expect(deps.claimSlot).toHaveBeenCalledWith("2026-10-08");
    const order = [deps.claimSlot, deps.generateCaption, deps.generateImage, deps.uploadImage, deps.insertGeneration, deps.releaseSlot]
      .map((fn) => fn.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(deps.releaseSlot).toHaveBeenCalledExactlyOnceWith("claim-1");
    expect(deps.removeImage).not.toHaveBeenCalled();
  });

  it("stores a missing twist as null", async () => {
    await run(HAGRID.id, null);
    expect(deps.generateCaption.mock.calls[0][0].user).not.toContain("<twist>");
    expect(deps.insertGeneration.mock.calls[0][0].user_twist).toBeNull();
  });

  it.each([
    ["an unknown character", () => run("33333333-3333-4333-8333-333333333333"), "Choose who's writing today."],
    ["a character without an appearance", () => run(ERROL.id), "Choose who's writing today."],
  ])("stops before claiming or calling Gemini for %s", async (_label, action, error) => {
    expect(await action()).toEqual({ ok: false, error });
    expect(deps.claimSlot).not.toHaveBeenCalled();
    expect(deps.generateCaption).not.toHaveBeenCalled();
  });

  it("stops when there is no Owl Post", async () => {
    deps.loadContext.mockResolvedValue({ cast: [HAGRID], owlPosts: [] });
    expect(await run()).toEqual({ ok: false, error: "Today's Owl Post hasn't arrived yet. Check back soon." });
    expect(deps.claimSlot).not.toHaveBeenCalled();
  });

  it.each([[USER_DAILY_LIMIT, 0, /all 3 owls/], [0, GLOBAL_DAILY_LIMIT, /Every owl/]])(
    "stops before Gemini when the claim is refused at %d mine / %d total", async (userUsed, globalUsed, message) => {
      deps.claimSlot.mockResolvedValue({ claimId: null, userUsed, globalUsed });
      const result = await run();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(message);
      expect(deps.generateCaption).not.toHaveBeenCalled();
      expect(deps.releaseSlot).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["loading the context", () => deps.loadContext.mockRejectedValue(new Error("connection reset")), "Owl Post context failed"],
    ["claiming a slot", () => deps.claimSlot.mockRejectedValue(new Error("lock timeout")), "Owl Post claim failed"],
  ])("reports an unavailable database while %s without calling Gemini", async (_label, arrange, logged) => {
    arrange();
    expect(await run()).toEqual({ ok: false, error: "The Owlery is swamped right now. Try again in a minute." });
    expect(deps.log).toHaveBeenCalledWith(logged, expect.objectContaining({ userId: "author-id" }));
    expect(deps.generateCaption).not.toHaveBeenCalled();
    expect(deps.releaseSlot).not.toHaveBeenCalled();
  });

  it.each([
    ["a thrown rate limit", () => deps.generateCaption.mockRejectedValue(Object.assign(new Error("429"), { status: 429 })), /swamped/],
    ["a refusal", () => deps.generateCaption.mockResolvedValue({ promptFeedback: { blockReason: "SAFETY" } }), /refused/],
    ["malformed JSON", () => deps.generateCaption.mockResolvedValue({ text: "{", candidates: [{ finishReason: "STOP" }] }), /smudged/],
  ])("does not draw after %s on the caption", async (_label, arrange, message) => {
    arrange();
    const result = await run();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
    expect(deps.generateImage).not.toHaveBeenCalled();
    expect(deps.uploadImage).not.toHaveBeenCalled();
    expect(deps.releaseSlot).toHaveBeenCalledExactlyOnceWith("claim-1");
  });

  it.each([
    ["a thrown network error", () => deps.generateImage.mockRejectedValue(new Error("fetch failed")), /swamped/],
    ["an image refusal", () => deps.generateImage.mockResolvedValue({ candidates: [{ finishReason: "IMAGE_SAFETY" }] }), /refused/],
    ["no image", () => deps.generateImage.mockResolvedValue({ candidates: [{ finishReason: "NO_IMAGE" }] }), /empty-taloned/],
  ])("stores nothing after %s on the image", async (_label, arrange, message) => {
    arrange();
    const result = await run();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
    expect(deps.uploadImage).not.toHaveBeenCalled();
    expect(deps.insertGeneration).not.toHaveBeenCalled();
    expect(deps.releaseSlot).toHaveBeenCalledExactlyOnceWith("claim-1");
  });

  it("records nothing when the upload fails", async () => {
    deps.uploadImage.mockResolvedValue(false);
    expect(await run()).toEqual({ ok: false, error: "We couldn't save your picture. Please try again." });
    expect(deps.insertGeneration).not.toHaveBeenCalled();
    expect(deps.releaseSlot).toHaveBeenCalledExactlyOnceWith("claim-1");
  });

  it.each([
    ["returns false", () => deps.insertGeneration.mockResolvedValue(false)],
    ["throws", () => deps.insertGeneration.mockRejectedValue(new Error("constraint"))],
  ])("removes the uploaded picture when the insert %s", async (_label, arrange) => {
    arrange();
    expect(await run()).toEqual({ ok: false, error: "We couldn't save your post. Please try again." });
    expect(deps.removeImage).toHaveBeenCalledExactlyOnceWith("author-id/generation-id.png");
    expect(deps.releaseSlot).toHaveBeenCalledExactlyOnceWith("claim-1");
  });

  it("still reports the failure if cleanup also fails", async () => {
    deps.insertGeneration.mockResolvedValue(false);
    deps.removeImage.mockRejectedValue(new Error("storage down"));
    expect(await run()).toEqual({ ok: false, error: "We couldn't save your post. Please try again." });
    expect(deps.log).toHaveBeenCalledWith("Owl Post image cleanup failed", expect.objectContaining({ path: "author-id/generation-id.png" }));
  });

  it("keeps the post when releasing the claim fails; the claim expires on its own", async () => {
    deps.releaseSlot.mockRejectedValue(new Error("network"));
    expect(await run()).toEqual({ ok: true, generationId: "generation-id", remaining: USER_DAILY_LIMIT - 2 });
    expect(deps.log).toHaveBeenCalledWith("Owl Post claim release failed", expect.objectContaining({ claimId: "claim-1" }));
  });
});
