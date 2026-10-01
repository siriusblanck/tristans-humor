import { beforeEach, describe, expect, it, vi } from "vitest";

/* Behavior inventory:
 * Online-verified users accepted; missing/invalid users redirected; cached cookie identity untrusted.
 * Profile reads always filter by the verified ID; missing row -> null; query failure -> explicit error.
 */
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { getAccount, requireAccount, getProfile } from "@/lib/auth";

beforeEach(() => {
  const query = { select: mocks.select, eq: mocks.eq, maybeSingle: mocks.maybeSingle };
  mocks.from.mockReturnValue(query); mocks.select.mockReturnValue(query); mocks.eq.mockReturnValue(query);
  mocks.maybeSingle.mockResolvedValue({ data: { id: "verified-id", first_name: "Tristan", last_name: "Rai", avatar_path: null }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-id" } }, error: null });
  mocks.createClient.mockResolvedValue({ from: mocks.from, auth: { getUser: mocks.getUser } });
  mocks.redirect.mockImplementation((path: string) => { throw new Error(`redirect:${path}`); });
});

describe("server authentication", () => {
  it("accepts the online-verified user", async () => {
    const account = await requireAccount();
    expect(account.user).toEqual({ id: "verified-id" });
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it.each([{ data: { user: null }, error: null }, { data: { user: { id: "forged" } }, error: new Error("invalid JWT") }])("redirects when verification fails: %j", async (result) => {
    mocks.getUser.mockResolvedValue(result);
    expect((await getAccount()).user).toBeNull();
    await expect(requireAccount()).rejects.toThrow("redirect:/");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("selects only the current user's profile fields", async () => {
    const client = await mocks.createClient();
    expect(await getProfile(client, "verified-id")).toEqual({ id: "verified-id", first_name: "Tristan", last_name: "Rai", avatar_path: null });
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.eq).toHaveBeenCalledWith("id", "verified-id");
    expect(mocks.select).toHaveBeenCalledWith("id, first_name, last_name, avatar_path");
  });

  it("represents a missing profile without a fabricated complete profile", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getProfile(await mocks.createClient(), "verified-id")).toBeNull();
  });

  it("reports profile query errors", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: new Error("database unavailable") });
    await expect(getProfile(await mocks.createClient(), "verified-id")).rejects.toThrow("We couldn't load your profile. Please try again.");
  });
});
