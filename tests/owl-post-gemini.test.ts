import { describe, expect, it } from "vitest";
import { CAPTION_MAX_LENGTH, failureMessage, readCaption, readImage } from "@/lib/owl-post/gemini-response";

/* Behavior inventory:
 * Caption: valid JSON -> trimmed caption + scene; invalid JSON, missing or oversized
 * fields -> invalid; prompt blocks and safety finishes -> blocked; no text -> empty.
 * Image: first inline image part wins; only PNG/JPEG/WebP whose bytes match the claimed
 * type and fit the size limit; IMAGE_SAFETY/OTHER -> blocked; NO_IMAGE/text-only -> empty.
 * Every failure maps to a friendly message without provider codes.
 */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString("base64");
const textResponse = (text: string | undefined, finishReason = "STOP") => ({ text, candidates: [{ finishReason }] });
const imageResponse = (parts: object[], finishReason = "STOP") => ({ candidates: [{ finishReason, content: { parts } }] });

describe("reading the caption", () => {
  it("parses and trims the structured caption", () => {
    expect(readCaption(textResponse(JSON.stringify({ caption: "  Blimey, the 1 train.  ", scene: " A giant on a platform. " })))).toEqual({
      ok: true, value: { caption: "Blimey, the 1 train.", scene: "A giant on a platform." },
    });
  });

  it.each([
    ["not JSON", "invalid"],
    [JSON.stringify({ caption: "Only a caption" }), "invalid"],
    [JSON.stringify({ caption: " ", scene: "x" }), "invalid"],
    [JSON.stringify({ caption: "a".repeat(CAPTION_MAX_LENGTH + 1), scene: "x" }), "invalid"],
    [JSON.stringify(["caption", "scene"]), "invalid"],
    [undefined, "empty"],
    ["", "empty"],
  ])("rejects %j as %s", (text, failure) => {
    expect(readCaption(textResponse(text))).toEqual({ ok: false, failure });
  });

  it.each(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"])("treats finish reason %s as blocked", (reason) => {
    expect(readCaption(textResponse(JSON.stringify({ caption: "x", scene: "y" }), reason))).toEqual({ ok: false, failure: "blocked" });
  });

  it("treats a blocked prompt as blocked", () => {
    expect(readCaption({ promptFeedback: { blockReason: "SAFETY" }, candidates: [] })).toEqual({ ok: false, failure: "blocked" });
  });
});

describe("reading the image", () => {
  it("returns the first valid inline image", () => {
    const result = readImage(imageResponse([{ text: "Here you go" }, { inlineData: { data: PNG, mimeType: "image/png" } }]));
    expect(result).toEqual({ ok: true, mimeType: "image/png", bytes: new Uint8Array(Buffer.from(PNG, "base64")) });
  });

  it.each([
    [{ inlineData: { data: PNG, mimeType: "image/gif" } }, "invalid"],
    [{ inlineData: { data: Buffer.from("<svg onload=alert(1)>").toString("base64"), mimeType: "image/png" } }, "invalid"],
    [{ inlineData: { data: PNG } }, "invalid"],
    [{ text: "I can't draw that." }, "empty"],
  ])("rejects part %j as %s", (part, failure) => {
    expect(readImage(imageResponse([part]))).toEqual({ ok: false, failure });
  });

  it("rejects images over the size limit", () => {
    expect(readImage(imageResponse([{ inlineData: { data: PNG, mimeType: "image/png" } }]), 8)).toEqual({ ok: false, failure: "invalid" });
  });

  it.each([["IMAGE_SAFETY", "blocked"], ["IMAGE_PROHIBITED_CONTENT", "blocked"], ["OTHER", "blocked"], ["NO_IMAGE", "empty"]])(
    "maps finish reason %s to %s", (reason, failure) => {
      expect(readImage(imageResponse([], reason))).toEqual({ ok: false, failure });
    },
  );

  it("handles a response with no candidates", () => {
    expect(readImage({})).toEqual({ ok: false, failure: "empty" });
    expect(readImage({ promptFeedback: { blockReason: "IMAGE_SAFETY" } })).toEqual({ ok: false, failure: "blocked" });
  });
});

describe("failure messages", () => {
  it.each(["blocked", "empty", "invalid", "unavailable"] as const)("explains %s kindly", (failure) => {
    const message = failureMessage(failure);
    expect(message.length).toBeGreaterThan(20);
    expect(message).not.toMatch(/SAFETY|finish|JSON|Gemini|API/);
  });
});
