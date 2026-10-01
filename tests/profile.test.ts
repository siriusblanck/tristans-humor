import { describe, expect, it } from "vitest";
import { isProfileComplete, validateProfileNames, NAME_MAX_LENGTH } from "@/lib/profile";

/* Behavior inventory:
 * Completeness: both names; either missing, null, empty, or whitespace; trimmed names.
 * Name input: Unicode/punctuation, trim, required, missing/wrong shape, max-1/max/max+1.
 * Invariant: neither a forged ID nor extra form fields can enter the update payload.
 * Choice: both names are required by the UI; database fields remain nullable.
 */
describe("profile completion", () => {
  it("accepts two trimmed names", () => {
    expect(isProfileComplete({ first_name: "  Zoë ", last_name: "王 " })).toBe(true);
  });

  it.each([null, { first_name: null, last_name: null }, ...["", " \n\t", null].flatMap((name) => [
    { first_name: name, last_name: "Rai" }, { first_name: "Tristan", last_name: name },
  ])])("requires both names: %j", (profile) => {
    expect(isProfileComplete(profile)).toBe(false);
  });
});

describe("name validation", () => {
  it("trims international names and ignores hostile extra fields", () => {
    const form = new FormData();
    form.set("first_name", "  Zoë-Marie  ");
    form.set("last_name", " O'王 ");
    form.set("id", "another-user");
    form.set("avatar_path", "another-user/photo.png");
    expect(validateProfileNames(form)).toEqual({
      names: { first_name: "Zoë-Marie", last_name: "O'王" }, fields: {}, valid: true,
    });
  });

  it.each(["first_name", "last_name"] as const)("rejects missing, blank, and non-text %s", (field) => {
    for (const raw of [null, "", "\t \n", new File(["image"], "name.png")]) {
      const form = new FormData();
      form.set("first_name", "Tristan"); form.set("last_name", "Rai");
      if (raw === null) form.delete(field); else form.set(field, raw);
      const result = validateProfileNames(form);
      expect(result.valid).toBe(false);
      expect(result.fields[field]).toBe(`Add your ${field === "first_name" ? "first" : "last"} name.`);
    }
  });

  it.each(["first_name", "last_name"] as const)("enforces the exact %s length boundary", (field) => {
    for (const length of [NAME_MAX_LENGTH - 1, NAME_MAX_LENGTH, NAME_MAX_LENGTH + 1, 10000]) {
      const form = new FormData();
      form.set("first_name", "Tristan"); form.set("last_name", "Rai");
      form.set(field, "a".repeat(length));
      const result = validateProfileNames(form);
      expect(result.valid).toBe(length <= NAME_MAX_LENGTH);
      expect(result.fields[field]).toBe(length > NAME_MAX_LENGTH ? "Use 80 characters or fewer." : undefined);
    }
  });
});
