import { expect, test } from "@playwright/test";
import { newYorkDate } from "../src/lib/owl-post/dates";
import { removeOwl, seedOwl, type OwlFixture } from "./fixtures";

/* Signed-out journeys (Google OAuth itself is not automated):
 * the public front page shows today's Owl Post, House Cup, and the seven-letter cast;
 * visitors can read owls but voting asks them to sign in and changes nothing;
 * protected and retired routes redirect; legal pages are reachable; no sideways scroll.
 */
let owl: OwlFixture | undefined;

test.beforeAll(async () => {
  owl = await seedOwl(newYorkDate(new Date()));
});

test.afterAll(async () => {
  await removeOwl(owl);
});

test("the front page shows today's Owl Post, the House Cup, and the cast", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1#owl-post")).not.toBeEmpty();
  await expect(page.getByRole("region", { name: /House Cup/ }).getByRole("listitem")).toHaveCount(4);
  const cast = page.getByRole("group", { name: "Who's writing?" });
  await expect(cast.locator("label")).toHaveCount(7);
  await expect(cast.getByRole("radio")).toHaveCount(0); // read-only until sign-in
  await expect(page.getByRole("button", { name: "by Signing In" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send the owl" })).toHaveCount(0);
});

test("signed-out visitors can read owls but not vote on them", async ({ page }) => {
  await page.goto("/");
  const card = page.locator(`#owl-${owl!.generationId}`);
  await expect(card).toContainText(owl!.caption);
  await expect(card.getByRole("img", { name: "A fixture picture." })).toBeVisible();
  const score = card.locator('[aria-live="polite"]');
  await expect(score).toHaveText("0");

  await card.getByRole("button", { name: "Award a point" }).click();
  await expect(card.getByText("Points come from signed-in readers.")).toBeVisible();
  await expect(card.getByRole("button", { name: "Sign in to vote" })).toBeVisible();
  await expect(score).toHaveText("0");

  await page.reload();
  await expect(page.locator(`#owl-${owl!.generationId}`).locator('[aria-live="polite"]')).toHaveText("0");
});

test("protected and retired routes redirect to the front page", async ({ page }) => {
  for (const path of ["/profile", "/gallery"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
  }
});

test("a cancelled sign-in explains what happened", async ({ page }) => {
  await page.goto("/?auth=cancelled");
  // Next.js adds its own (empty) role="alert" route announcer, so match ours by text.
  await expect(page.getByRole("alert").filter({ hasText: "Sign-in was cancelled" }))
    .toHaveText("Sign-in was cancelled. Give it another go when you're ready.");
});

test("privacy and terms are linked from the footer and describe what is public", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { name: "What other people can see" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Terms" }).click();
  await expect(page.getByRole("heading", { name: "Sending owls and voting" })).toBeVisible();
});

test("the page never scrolls sideways", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
