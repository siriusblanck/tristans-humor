import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* Behavior inventory:
 * Missing URL/key rejected; browser client uses public config; per-request server client.
 * Server cookies read/write; read-only rendering cookie writes safely ignored.
 * Proxy refresh forwards new cookies to both request and response, with no-store headers.
 * Refresh without a cookie write still returns a non-cacheable response.
 */
const mocks = vi.hoisted(() => ({ createBrowserClient: vi.fn(), createServerClient: vi.fn(), getAll: vi.fn(), set: vi.fn(), cookies: vi.fn(), getClaims: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createBrowserClient: mocks.createBrowserClient, createServerClient: mocks.createServerClient }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient as browserClient } from "@/lib/supabase/client";
import { createClient as serverClient } from "@/lib/supabase/server";
import { proxy } from "@/proxy";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key");
  mocks.getAll.mockReturnValue([{ name: "session", value: "old" }]);
  mocks.cookies.mockResolvedValue({ getAll: mocks.getAll, set: mocks.set });
  mocks.set.mockImplementation(() => undefined);
  mocks.createServerClient.mockReturnValue({ auth: { getClaims: mocks.getClaims } });
  mocks.createBrowserClient.mockReturnValue({ browser: true });
  mocks.getClaims.mockResolvedValue({ data: null, error: null });
});

describe("Supabase client wiring", () => {
  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])("rejects missing %s", (field) => {
    vi.stubEnv(field, "");
    expect(getSupabaseConfig).toThrow("Supabase environment variables are missing.");
  });

  it("creates the browser client with only public config", () => {
    expect(browserClient()).toEqual({ browser: true });
    expect(mocks.createBrowserClient).toHaveBeenCalledWith("https://project.supabase.co", "public-key");
  });

  it("wires request-local server cookies", async () => {
    await serverClient();
    const options = mocks.createServerClient.mock.calls[0][2];
    expect(options.cookies.getAll()).toEqual([{ name: "session", value: "old" }]);
    options.cookies.setAll([{ name: "session", value: "new", options: { path: "/" } }]);
    expect(mocks.set).toHaveBeenCalledWith("session", "new", { path: "/" });
  });

  it("supports read-only cookie access during a Server Component render", async () => {
    mocks.set.mockImplementation(() => { throw new Error("read-only cookies"); });
    await serverClient();
    const options = mocks.createServerClient.mock.calls[0][2];
    expect(() => options.cookies.setAll([{ name: "session", value: "new", options: {} }])).not.toThrow();
  });

  it("refreshes cookies on both sides and forwards Supabase cache headers", async () => {
    const request = new NextRequest("https://humour.example/gallery", { headers: { cookie: "session=old" } });
    mocks.getClaims.mockImplementation(async () => {
      const options = mocks.createServerClient.mock.calls[0][2];
      expect(options.cookies.getAll()).toEqual([{ name: "session", value: "old" }]);
      options.cookies.setAll([{ name: "session", value: "fresh", options: { path: "/", sameSite: "lax" } }], { "Cache-Control": "private, no-cache, no-store", Expires: "0", Pragma: "no-cache" });
    });
    const response = await proxy(request);
    expect(request.cookies.get("session")?.value).toBe("fresh");
    expect(response.cookies.get("session")?.value).toBe("fresh");
    expect(response.headers.get("x-middleware-request-cookie")).toBe("session=fresh");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });

  it("refreshes authentication and prevents caching even without new cookies", async () => {
    const response = await proxy(new NextRequest("https://humour.example/"));
    expect(mocks.getClaims).toHaveBeenCalledOnce();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.cookies.getAll()).toEqual([]);
  });
});
