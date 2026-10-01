import { beforeEach, expect, it, vi } from "vitest";

/* Behavior inventory: end this browser's session then navigate home; failure reports an error
 * and never claims a successful sign-out. Other devices retain their sessions.
 */
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), signOut: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { signOut } from "@/app/auth/actions";

beforeEach(() => {
  mocks.createClient.mockResolvedValue({ auth: { signOut: mocks.signOut } });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.redirect.mockImplementation((path: string) => { throw new Error(`redirect:${path}`); });
});

it("ends the local session and returns to the start", async () => {
  await expect(signOut()).rejects.toThrow("redirect:/");
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});

it("reports a failed sign-out without redirecting", async () => {
  mocks.signOut.mockResolvedValue({ error: new Error("network") });
  await expect(signOut()).rejects.toThrow("We couldn't sign you out. Please try again.");
  expect(mocks.redirect).not.toHaveBeenCalled();
});
