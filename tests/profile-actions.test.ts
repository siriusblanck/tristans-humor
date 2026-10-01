import { beforeEach, describe, expect, it, vi } from "vitest";

/* Behavior inventory:
 * Require auth for every save; names validated before any writes; reject malformed photos.
 * Existing profiles save and stay; incomplete profiles save and enter gallery.
 * Upload, missing profile, DB error/empty result -> useful error and no unintended writes.
 * Invariants: verified ID only; Storage bytes + DB path only; upload precedes DB update;
 * retain old photo on failure; remove failed new upload; remove old photo after success.
 */
const mocks = vi.hoisted(() => ({
  requireAccount: vi.fn(), getProfile: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(),
  upload: vi.fn(), remove: vi.fn(), from: vi.fn(), storageFrom: vi.fn(), revalidatePath: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAccount: mocks.requireAccount, getProfile: mocks.getProfile }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { saveProfile } from "@/app/profile/actions";

const existingProfile = { id: "verified-id", first_name: "Tristan", last_name: "Rai", avatar_path: "verified-id/old.png" };
const photo = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "../../attack.png", { type: "image/png" });
function form(avatar?: File) {
  const data = new FormData();
  data.set("first_name", "  New "); data.set("last_name", " Name ");
  data.set("id", "victim-id"); data.set("avatar_path", "victim-id/stolen.png");
  if (avatar) data.set("avatar", avatar);
  return data;
}

beforeEach(() => {
  const query = { update: mocks.update, eq: mocks.eq, select: mocks.select, single: mocks.single };
  mocks.from.mockReturnValue(query); mocks.update.mockReturnValue(query); mocks.eq.mockReturnValue(query); mocks.select.mockReturnValue(query);
  mocks.single.mockResolvedValue({ data: { id: "verified-id" }, error: null });
  mocks.storageFrom.mockReturnValue({ upload: mocks.upload, remove: mocks.remove });
  mocks.upload.mockResolvedValue({ error: null }); mocks.remove.mockResolvedValue({ error: null });
  mocks.requireAccount.mockResolvedValue({ supabase: { from: mocks.from, storage: { from: mocks.storageFrom } }, user: { id: "verified-id" } });
  mocks.getProfile.mockResolvedValue(existingProfile);
  mocks.redirect.mockImplementation((path: string) => { throw new Error(`redirect:${path}`); });
});

describe("profile save action", () => {
  it("uses only validated names and verified identity", async () => {
    expect(await saveProfile({}, form())).toEqual({ success: "Profile saved." });
    expect(mocks.update).toHaveBeenCalledWith({ first_name: "New", last_name: "Name" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "verified-id");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/profile");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/gallery");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("requires a valid session even with forged form identity", async () => {
    mocks.requireAccount.mockRejectedValue(new Error("redirect:/"));
    await expect(saveProfile({}, form())).rejects.toThrow("redirect:/");
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects whitespace names before uploading", async () => {
    const data = form(photo()); data.set("first_name", "  ");
    expect(await saveProfile({}, data)).toEqual({ error: "Check your name below.", fields: { first_name: "Add your first name." } });
    expect(mocks.getProfile).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects a spoofed image before any write", async () => {
    expect(await saveProfile({}, form(new File(["<script>"], "photo.png", { type: "image/png" })))).toEqual({
      error: "That file isn't a valid JPG, PNG, or WebP photo.", fields: { avatar: "That file isn't a valid JPG, PNG, or WebP photo." },
    });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("reports a missing profile instead of silently claiming a successful save", async () => {
    mocks.getProfile.mockResolvedValue(null);
    expect(await saveProfile({}, form(photo()))).toEqual({ error: "We couldn't find your profile. Please try signing in again." });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });

  it.each([false, true])("enters the gallery only after a new profile is complete (photo %s)", async (includePhoto) => {
    mocks.getProfile.mockResolvedValue({ ...existingProfile, first_name: null, avatar_path: null });
    await expect(saveProfile({}, form(includePhoto ? photo() : undefined))).rejects.toThrow("redirect:/gallery");
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("stores image bytes in Storage and only its path in the database", async () => {
    const data = form(photo());
    expect(await saveProfile({}, data)).toEqual({ success: "Profile saved." });
    const newPath = mocks.upload.mock.calls[0][0];
    expect(newPath).toMatch(/^verified-id\/[0-9a-f-]+\.png$/);
    expect(mocks.storageFrom).toHaveBeenCalledWith("avatars");
    expect(mocks.upload).toHaveBeenCalledWith(newPath, data.get("avatar"), { contentType: "image/png", upsert: false });
    expect(mocks.update).toHaveBeenCalledWith({ first_name: "New", last_name: "Name", avatar_path: newPath });
    expect(mocks.upload.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
    expect(mocks.remove).toHaveBeenCalledWith([existingProfile.avatar_path]);
    expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
  });

  it("preserves the existing photo when upload fails", async () => {
    mocks.upload.mockResolvedValue({ error: new Error("bucket unavailable") });
    expect(await saveProfile({}, form(photo()))).toEqual({ error: "We couldn't upload your photo. Please try again." });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });

  it.each([{ data: null, error: new Error("database") }, { data: null, error: null }])("removes only the new upload on a failed update", async (result) => {
    mocks.single.mockResolvedValue(result);
    expect(await saveProfile({}, form(photo()))).toEqual({ error: "We couldn't save your profile. Please try again." });
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([mocks.upload.mock.calls[0][0]]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled(); expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("doesn't remove any photo when a name-only update fails", async () => {
    mocks.single.mockResolvedValue({ data: null, error: new Error("database") });
    expect(await saveProfile({}, form())).toEqual({ error: "We couldn't save your profile. Please try again." });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
