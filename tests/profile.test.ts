import { describe, expect, it } from "vitest";
import { initialOf, isProfileComplete, profileStep, publicName, validateProfileNames, NAME_MAX_LENGTH } from "@/lib/profile";

/* Behavior inventory:
 * Completeness: both names and a house; either name missing, null, empty, or whitespace;
 * missing house; trimmed names.
 * Public name: first name and last initial, trimmed, Unicode-safe.
 * Name input: Unicode/punctuation, trim, required, missing/wrong shape, max-1/max/max+1.
 * Invariant: neither a forged ID nor extra form fields can enter the update payload.
 * Choice: both names are required by the UI; database fields remain nullable.
 * Step: no names yet asks for your name; names but no house (accounts from before the House
 * Cup) asks only for the house; a complete profile is edited.
 * Initial: the first character of the first name, upper-cased and Unicode-safe; "?" if blank.
 */
describe("profile completion", () => {
  it("accepts two trimmed names and a house", () => {
    expect(isProfileComplete({ first_name: "  Zoë ", last_name: "王 ", house: "hufflepuff" })).toBe(true);
  });

  it.each([null, { first_name: null, last_name: null, house: null }, ...["", " \n\t", null].flatMap((name) => [
    { first_name: name, last_name: "Rai", house: "gryffindor" as const }, { first_name: "Tristan", last_name: name, house: "gryffindor" as const },
  ])])("requires both names: %j", (profile) => {
    expect(isProfileComplete(profile)).toBe(false);
  });

  it("requires a house", () => {
    expect(isProfileComplete({ first_name: "Tristan", last_name: "Rai", house: null })).toBe(false);
  });
});

describe("public name", () => {
  it.each([
    [{ first_name: "Tristan", last_name: "Rai" }, "Tristan R."],
    [{ first_name: "  Zoë ", last_name: "  王小明 " }, "Zoë 王."],
    [{ first_name: "Ana", last_name: "Ñúñez" }, "Ana Ñ."],
    [{ first_name: "Sam", last_name: "😀Smile" }, "Sam 😀."],
  ])("shows %j as %s", (profile, expected) => {
    expect(publicName(profile)).toBe(expected);
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

describe("profile step", () => {
  it.each([
    [null, "name"],
    [{ first_name: null, last_name: null, house: null }, "name"],
    [{ first_name: "Tristan", last_name: " ", house: "gryffindor" as const }, "name"],
    [{ first_name: "Tristan", last_name: "Rai", house: null }, "house"],
    [{ first_name: "Tristan", last_name: "Rai", house: "ravenclaw" as const }, "edit"],
  ])("%j is at the %s step", (profile, step) => {
    expect(profileStep(profile)).toBe(step);
  });
});

describe("initial", () => {
  it.each([["tristan", "T"], ["  zoë", "Z"], ["😀Sam", "😀"], ["王小明", "王"], ["   ", "?"]])("%s starts with %s", (name, initial) => {
    expect(initialOf(name)).toBe(initial);
  });
});
