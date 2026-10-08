import { beforeEach, describe, expect, it, vi } from "vitest";
import { readReturn } from "@/app/_front-page/return-to-owl";
import { RETURN_KEY } from "@/app/_front-page/types";

/* Behavior inventory:
 * After Google sign-in the page reads where the visitor was, exactly once (the note is
 * removed). Only a well-formed note counts: an owl id (or none) and a known reason.
 * Missing, malformed, or forged notes and blocked storage all mean "nothing to restore".
 */
const store = new Map<string, string>();
const storage = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  removeItem: vi.fn((key: string) => { store.delete(key); }),
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal("sessionStorage", storage);
});

describe("returning to the same owl", () => {
  it("reads the note once and removes it", () => {
    store.set(RETURN_KEY, JSON.stringify({ owlId: "4a1c2a8e-4b7d-4c1e-9a2b-1d2e3f4a5b6c", reason: "vote" }));
    expect(readReturn()).toEqual({ owlId: "4a1c2a8e-4b7d-4c1e-9a2b-1d2e3f4a5b6c", reason: "vote" });
    expect(store.has(RETURN_KEY)).toBe(false);
    expect(readReturn()).toBeNull();
  });

  it("accepts a note without an owl (an empty week)", () => {
    store.set(RETURN_KEY, JSON.stringify({ owlId: null, reason: "owl" }));
    expect(readReturn()).toEqual({ owlId: null, reason: "owl" });
  });

  it.each(["not json", "null", "[]", JSON.stringify({ owlId: 5, reason: "vote" }), JSON.stringify({ owlId: "a", reason: "hack" }), JSON.stringify({ owlId: "x".repeat(200), reason: "vote" })])(
    "ignores a malformed note: %s", (raw) => {
      store.set(RETURN_KEY, raw);
      expect(readReturn()).toBeNull();
      expect(store.has(RETURN_KEY)).toBe(false);
    },
  );

  it("treats blocked storage as nothing to restore", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("blocked"); }, removeItem: () => undefined });
    expect(readReturn()).toBeNull();
  });
});
