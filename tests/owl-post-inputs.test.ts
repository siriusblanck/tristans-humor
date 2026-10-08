import { describe, expect, it } from "vitest";
import { parseGenerationForm, parseVote, TWIST_MAX_LENGTH } from "@/lib/owl-post/inputs";
import { GLOBAL_DAILY_LIMIT, quotaDecision, USER_DAILY_LIMIT } from "@/lib/owl-post/limits";

/* Behavior inventory:
 * Generation form: a UUID character and an optional trimmed twist (blank -> null,
 * max-1/max/max+1); missing/forged/non-text fields rejected; author fields ignored.
 * Votes: UUID target and exactly -1, 0, or 1 as numbers; everything else rejected.
 * Quota: per-user cap before the app-wide cap; the remaining count after this post.
 */
const CHARACTER = "3f1c2a8e-4b7d-4c1e-9a2b-1d2e3f4a5b6c";

function form(fields: Record<string, string | File>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("generation form", () => {
  it("accepts a character and a trimmed twist, ignoring forged ownership fields", () => {
    expect(parseGenerationForm(form({ character_id: CHARACTER, twist: "  my RA saw it  ", author_id: "victim", house: "slytherin" }))).toEqual({
      ok: true, value: { characterId: CHARACTER, twist: "my RA saw it" },
    });
  });

  it.each(["", "   \n"])("treats a blank twist (%j) as none", (twist) => {
    expect(parseGenerationForm(form({ character_id: CHARACTER, twist }))).toEqual({ ok: true, value: { characterId: CHARACTER, twist: null } });
    expect(parseGenerationForm(form({ character_id: CHARACTER }))).toEqual({ ok: true, value: { characterId: CHARACTER, twist: null } });
  });

  it("enforces the twist length boundary", () => {
    for (const length of [TWIST_MAX_LENGTH - 1, TWIST_MAX_LENGTH, TWIST_MAX_LENGTH + 1]) {
      const result = parseGenerationForm(form({ character_id: CHARACTER, twist: "a".repeat(length) }));
      expect(result.ok).toBe(length <= TWIST_MAX_LENGTH);
      if (!result.ok) expect(result.fields.twist).toBe(`Keep it to ${TWIST_MAX_LENGTH} characters.`);
    }
  });

  it.each([{}, { character_id: "" }, { character_id: "hagrid" }, { character_id: new File(["x"], "x.txt") }])(
    "requires a real character choice: %j", (fields) => {
      const result = parseGenerationForm(form(fields as Record<string, string | File>));
      expect(result).toEqual({ ok: false, fields: { character_id: "Choose who's writing today." } });
    },
  );

  it("rejects a file sent as the twist", () => {
    const result = parseGenerationForm(form({ character_id: CHARACTER, twist: new File(["x"], "twist.txt") }));
    expect(result.ok).toBe(false);
  });
});

describe("vote input", () => {
  it.each([1, -1, 0])("accepts %d", (value) => {
    expect(parseVote(CHARACTER, value)).toEqual({ generationId: CHARACTER, value });
  });

  it.each([[CHARACTER, 2], [CHARACTER, "1"], [CHARACTER, 0.5], [CHARACTER, Number.NaN], [CHARACTER, null], ["not-a-uuid", 1], [null, 1]])(
    "rejects %j / %j", (generationId, value) => {
      expect(parseVote(generationId, value)).toBeNull();
    },
  );
});

describe("daily quota", () => {
  it("allows posts until the personal limit and reports what is left", () => {
    expect(quotaDecision(0, 0)).toEqual({ allowed: true, remainingAfter: USER_DAILY_LIMIT - 1 });
    expect(quotaDecision(USER_DAILY_LIMIT - 1, GLOBAL_DAILY_LIMIT - 1)).toEqual({ allowed: true, remainingAfter: 0 });
  });

  it("stops at the personal limit first, then the app-wide limit", () => {
    expect(quotaDecision(USER_DAILY_LIMIT, GLOBAL_DAILY_LIMIT)).toMatchObject({ allowed: false, reason: "user" });
    expect(quotaDecision(0, GLOBAL_DAILY_LIMIT)).toMatchObject({ allowed: false, reason: "global" });
    expect(quotaDecision(USER_DAILY_LIMIT + 5, 0)).toMatchObject({ allowed: false, reason: "user" });
  });
});
