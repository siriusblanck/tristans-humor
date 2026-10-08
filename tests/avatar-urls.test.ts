import { describe, expect, it, vi } from "vitest";
import { AVATAR_URL_SECONDS, signedPhoto } from "@/lib/avatar-urls";

/* Behavior inventory:
 * No stored photo: no request, no photo. A stored photo is signed for an hour from the private
 * bucket and returned with its path. A failed signing shows no photo instead of breaking the page.
 */
function storage(result: { data: { signedUrl: string } | null; error: unknown }) {
  const createSignedUrl = vi.fn(async () => result);
  const from = vi.fn(() => ({ createSignedUrl }));
  return { client: { storage: { from } }, from, createSignedUrl };
}

describe("signed photo", () => {
  it("asks for nothing when there is no photo", async () => {
    const { client, from } = storage({ data: null, error: null });
    expect(await signedPhoto(client, null)).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("signs the stored photo for an hour", async () => {
    const { client, from, createSignedUrl } = storage({ data: { signedUrl: "https://x/signed" }, error: null });
    expect(await signedPhoto(client, "u/one.png")).toEqual({ path: "u/one.png", url: "https://x/signed" });
    expect(from).toHaveBeenCalledWith("avatars");
    expect(createSignedUrl).toHaveBeenCalledWith("u/one.png", AVATAR_URL_SECONDS);
    expect(AVATAR_URL_SECONDS).toBe(3600);
  });

  it("shows no photo when signing fails", async () => {
    const { client } = storage({ data: null, error: new Error("denied") });
    expect(await signedPhoto(client, "u/one.png")).toBeNull();
  });
});
