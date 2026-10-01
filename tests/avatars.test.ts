import { describe, expect, it } from "vitest";
import { AVATAR_MAX_BYTES, validateAvatar, validateAvatarMetadata } from "@/lib/avatars";

/* Behavior inventory:
 * Optional input: absent/empty browser placeholder; named empty file and text are errors.
 * Types: JPG/PNG/WebP headers; unsupported, spoofed MIME, truncated, and mismatched bytes.
 * Boundary: exactly 3 MiB allowed; one byte over rejected. One byte and zero distinguished.
 * Invariant: arbitrary user filenames never determine the storage extension.
 */
const images = [
  { type: "image/jpeg", extension: "jpg", bytes: [0xff, 0xd8, 0xff, 0xe0] },
  { type: "image/png", extension: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/webp", extension: "webp", bytes: [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50] },
];

describe("avatar validation", () => {
  it.each(images)("accepts $type and derives its extension", async ({ type, extension, bytes }) => {
    const file = new File([new Uint8Array(bytes)], "../../evil.exe", { type });
    expect(await validateAvatar(file)).toEqual({ file, extension });
  });

  it("treats an absent upload as optional", async () => {
    expect(await validateAvatar(null)).toBeNull();
    expect(await validateAvatar(new File([], ""))).toBeNull();
  });

  it("rejects a named empty upload", async () => {
    expect(await validateAvatar(new File([], "empty.png", { type: "image/png" }))).toEqual({ error: "That photo is empty. Choose another file." });
  });

  it.each(["", "../../other-user/picture.png", "data:image/png;base64,AAA"])("rejects text masquerading as a file: %s", async (value) => {
    expect(await validateAvatar(value)).toEqual({ error: "Choose a JPG, PNG, or WebP photo." });
  });

  it.each(["image/svg+xml", "image/gif", "text/html", "", "application/octet-stream"])("rejects %s", async (type) => {
    expect(await validateAvatar(new File(["garbage"], "photo.png", { type }))).toEqual({ error: "Choose a JPG, PNG, or WebP photo." });
  });

  it.each(images)("rejects forged or truncated $type", async ({ type }) => {
    for (const bytes of [new Uint8Array([0xff]), new TextEncoder().encode("<script>alert(1)</script>")]) {
      expect(await validateAvatar(new File([bytes], "photo", { type }))).toEqual({ error: "That file isn't a valid JPG, PNG, or WebP photo." });
    }
  });

  it("requires both WebP header sections", async () => {
    for (const bytes of [images[2].bytes.map((v, i) => i === 0 ? 0 : v), images[2].bytes.map((v, i) => i === 8 ? 0 : v)]) {
      expect(await validateAvatar(new File([new Uint8Array(bytes)], "photo.webp", { type: "image/webp" }))).toEqual({ error: "That file isn't a valid JPG, PNG, or WebP photo." });
    }
  });

  it("rejects a valid header with the wrong MIME type", async () => {
    expect(await validateAvatar(new File([new Uint8Array(images[0].bytes)], "photo.png", { type: "image/png" }))).toEqual({ error: "That file isn't a valid JPG, PNG, or WebP photo." });
  });

  it("enforces exact upload size boundaries", async () => {
    for (const size of [AVATAR_MAX_BYTES - 1, AVATAR_MAX_BYTES, AVATAR_MAX_BYTES + 1]) {
      const bytes = new Uint8Array(size); bytes.set(images[1].bytes);
      const file = new File([bytes], "photo.png", { type: "image/png" });
      expect(validateAvatarMetadata(file)).toBe(size > AVATAR_MAX_BYTES ? "Choose a photo smaller than 3 MB." : null);
      if (size > AVATAR_MAX_BYTES) expect(await validateAvatar(file)).toEqual({ error: "Choose a photo smaller than 3 MB." });
      else expect(await validateAvatar(file)).toEqual({ file, extension: "png" });
    }
  });
});
