import { describe, expect, it } from "vitest";
import { isAvailableWriter } from "@/lib/characters";

/* Behavior inventory:
 * Active characters with a name and drawable appearance can be selected.
 * Retired characters stay unavailable even with complete data.
 * Null, empty, or whitespace-only names/appearances never become choices.
 * Filtering keeps original IDs/order, excludes retired Errol, and does not mutate history.
 */
const writer = { id: "human", name: "Hermione Granger", appearance: "a young witch with bushy brown hair", is_active: true };

describe("available writers", () => {
  it("accepts an active character with complete writing data", () => {
    expect(isAvailableWriter(writer)).toBe(true);
  });

  it("excludes a retired character with complete writing data", () => {
    expect(isAvailableWriter({ ...writer, is_active: false })).toBe(false);
  });

  it.each([null, "", " ", "\n\t"])("excludes a blank name or appearance: %j", (value) => {
    expect(isAvailableWriter({ ...writer, name: value })).toBe(false);
    expect(isAvailableWriter({ ...writer, appearance: value })).toBe(false);
  });

  it("keeps active writers in order while preserving the retired record", () => {
    const errol = { ...writer, id: "owl", name: "Errol", is_active: false };
    const luna = { ...writer, id: "luna", name: "Luna Lovegood" };
    const cast = [writer, errol, luna];
    expect(cast.filter(isAvailableWriter).map(({ id }) => id)).toEqual(["human", "luna"]);
    expect(cast[1]).toEqual(errol);
    expect(cast).toHaveLength(3);
  });
});
