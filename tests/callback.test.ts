import { beforeEach, describe, expect, it, vi } from "vitest";

/* Behavior inventory:
 * Valid exchange -> gallery for complete names, profile for missing/blank names.
 * Denial/provider error, absent/empty code, invalid exchange, userless response,
 * thrown network error, and database failure -> retryable landing screen.
 * Invariants: never exchange when provider denies; never follow supplied next/host headers;
 * keep the browser on its origin even when the server normalizes request.url's hostname.
 */
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getProfile: vi.fn(), exchange: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/auth", () => ({ getProfile: mocks.getProfile }));
import { GET } from "@/app/auth/callback/route";

beforeEach(() => {
  mocks.createClient.mockResolvedValue({ auth: { exchangeCodeForSession: mocks.exchange } });
  mocks.exchange.mockResolvedValue({ data: { user: { id: "verified-id" } }, error: null });
  mocks.getProfile.mockResolvedValue({ first_name: "Tristan", last_name: "Rai" });
});

describe("OAuth callback", () => {
  it("keeps the browser on its original origin when the server normalizes the host", async () => {
    const response = await GET(new Request("http://localhost:3000/auth/callback?error=access_denied", {
      headers: { host: "127.0.0.1:3000" },
    }));
    expect(response.headers.get("location")).toBe("/?auth=cancelled");
  });

  it("exchanges the code and uses the verified user to choose the gallery", async () => {
    const response = await GET(new Request("https://humour.example/auth/callback?code=valid-code"));
    expect(response.headers.get("location")).toBe("/gallery");
    expect(mocks.exchange).toHaveBeenCalledWith("valid-code");
    expect(mocks.getProfile).toHaveBeenCalledWith(expect.anything(), "verified-id");
  });

  it.each([null, { first_name: null, last_name: null }, { first_name: " ", last_name: "Rai" }, { first_name: "Tristan", last_name: null }])("onboards incomplete profile: %j", async (profile) => {
    mocks.getProfile.mockResolvedValue(profile);
    const response = await GET(new Request("https://humour.example/auth/callback?code=valid"));
    expect(response.headers.get("location")).toBe("/profile");
  });

  it.each(["", "?code=", "?code=bad", "?code=bad&next=//evil.example"])("returns invalid codes to the landing screen: %s", async (query) => {
    mocks.exchange.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    expect((await GET(new Request(`https://humour.example/auth/callback${query}`))).headers.get("location")).toBe("/?auth=error");
    if (!query.includes("code=bad")) expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it.each(["access_denied", "server_error", "<script>alert(1)</script>"])("handles provider error without exchanging: %s", async (error) => {
    const response = await GET(new Request(`https://humour.example/auth/callback?code=valid&error=${encodeURIComponent(error)}`));
    expect(response.headers.get("location")).toBe(`/?auth=${error === "access_denied" ? "cancelled" : "error"}`);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects a successful exchange without an authenticated user", async () => {
    mocks.exchange.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET(new Request("https://humour.example/auth/callback?code=valid"))).headers.get("location")).toBe("/?auth=error");
    expect(mocks.getProfile).not.toHaveBeenCalled();
  });

  it.each(["exchange", "profile"])("handles a thrown %s failure", async (stage) => {
    if (stage === "exchange") mocks.exchange.mockRejectedValue(new Error("network"));
    else mocks.getProfile.mockRejectedValue(new Error("database unavailable"));
    expect((await GET(new Request("https://humour.example/auth/callback?code=valid"))).headers.get("location")).toBe("/?auth=error");
  });

  it("ignores hostile redirect parameters and forwarded hosts", async () => {
    const response = await GET(new Request("https://humour.example/auth/callback?code=valid&next=https://evil.example&id=victim", { headers: { "x-forwarded-host": "evil.example" } }));
    expect(response.headers.get("location")).toBe("/gallery");
  });
});
