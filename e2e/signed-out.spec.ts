import { expect, test, type Page } from "@playwright/test";
import { newYorkDate, weekStart } from "../src/lib/owl-post/dates";
import { removeOwl, seedOwl, type OwlFixture } from "./fixtures";

/* Signed-out journeys (Google OAuth itself is not automated):
 * the week's owl delivery plays on the first visit, can be skipped, and doesn't replay;
 * the front page shows this week's prompt, four crest hourglasses, and owls as letters;
 * browsing with the arrow keys, the ‹ › buttons, or a swipe never votes;
 * voting or sending while signed out opens the sign-in letter and changes nothing;
 * protected and retired routes redirect; legal pages are reachable; no sideways scroll.
 */
const today = newYorkDate(new Date());
const deliveredKey = `hw:delivered:${weekStart(today)}`;
let owls: OwlFixture[] = [];

test.beforeAll(async () => {
  owls = [await seedOwl(today), await seedOwl(today)];
});

test.afterAll(async () => {
  for (const owl of owls) await removeOwl(owl);
});

const front = (page: Page) => page.locator('article[data-depth="0"]');
const counter = (page: Page) => page.locator("main p[aria-hidden='true']");
const dock = (page: Page) => page.getByRole("group", { name: "Points for this owl" });

/** Opens the front page with this week's delivery already seen. */
async function openFrontPage(page: Page, path = "/") {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), deliveredKey);
  await page.goto(path);
  await expect(front(page)).toBeVisible();
}

/** Browses forward until the owl with this caption is the front card. */
async function browseTo(page: Page, caption: string) {
  for (let step = 0; step < 150; step += 1) {
    if ((await front(page).textContent())?.includes(caption)) return;
    const before = await counter(page).textContent();
    await page.keyboard.press("ArrowRight");
    await expect(counter(page)).not.toHaveText(before ?? "");
  }
  throw new Error(`Never reached the owl "${caption}".`);
}

test.describe("the weekly delivery", () => {
  test.use({ reducedMotion: "no-preference" });

  test("plays on the first visit, can be skipped, and doesn't replay", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-intro", /play|dock/);
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/);
    await expect(page.getByRole("button", { name: "Skip" })).toBeHidden();
  });
});

test.describe("the front page", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows this week's prompt, the house hourglasses, and owls as letters", async ({ page }) => {
    await openFrontPage(page);
    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
    await expect(page.locator('[data-reveal="chip"]').getByText(/^This week · /)).toBeVisible();
    const houses = page.getByRole("list", { name: "House points this week" }).getByRole("listitem");
    await expect(houses).toHaveCount(4);
    await expect(houses.first()).toContainText(/Gryffindor, -?\d+ points?/);
    await expect(front(page)).toContainText("—");
    await expect(front(page)).toContainText("sent by");
    await expect(dock(page).getByRole("button", { name: "Award a point" })).toBeVisible();
    await expect(counter(page)).toHaveText(/^1 \/ \d+$/);
  });

  test("the prompt bar replays the delivery", async ({ page }) => {
    await openFrontPage(page);
    await page.getByRole("button", { name: "Read this week’s letter again" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-intro", /play|dock/);
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-intro", /.*/);
  });

  test("browsing with keys, buttons, or a swipe never votes", async ({ page, isMobile }) => {
    await openFrontPage(page);
    const total = (await counter(page).textContent())!.split(" / ")[1];
    await page.keyboard.press("ArrowRight");
    await expect(counter(page)).toHaveText(`2 / ${total}`);
    await page.keyboard.press("ArrowLeft");
    await expect(counter(page)).toHaveText(`1 / ${total}`);
    if (!isMobile) {
      await page.getByRole("button", { name: "Next owl" }).click();
      await expect(counter(page)).toHaveText(`2 / ${total}`);
      await page.getByRole("button", { name: "Previous owl" }).click();
      await expect(counter(page)).toHaveText(`1 / ${total}`);
    }

    const box = (await front(page).boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.75, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.05, y, { steps: 8 });
    await page.mouse.up();
    await expect(counter(page)).toHaveText(`2 / ${total}`);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("voting while signed out opens the sign-in letter and changes nothing", async ({ page }) => {
    await openFrontPage(page);
    await browseTo(page, owls[0].caption);
    const points = dock(page).locator('[aria-live="polite"]');
    await expect(points).toHaveText("0");

    await dock(page).getByRole("button", { name: "Award a point" }).click();
    const letter = page.getByRole("dialog", { name: "Sign in to award points" });
    await expect(letter).toBeVisible();
    await expect(letter.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
    await letter.getByRole("button", { name: "Not now" }).click();
    await expect(letter).toBeHidden();
    await expect(points).toHaveText("0");
    await expect(dock(page).getByRole("button", { name: "Award a point" })).toHaveAttribute("aria-pressed", "false");
  });

  test("sending an owl or signing in while signed out opens the letter", async ({ page }) => {
    await openFrontPage(page);
    await page.getByRole("button", { name: "Send in your owl" }).click();
    await expect(page.getByRole("dialog", { name: "Sign in to send an owl" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Sign in", exact: true })).toBeVisible();
  });

  test("a cancelled sign-in explains what happened", async ({ page }) => {
    await openFrontPage(page, "/?auth=cancelled");
    // Next.js adds its own (empty) role="alert" route announcer, so match ours by text.
    await expect(page.getByRole("alert").filter({ hasText: "Sign-in was cancelled" }))
      .toHaveText("Sign-in was cancelled. Give it another go when you're ready.");
  });

  test("privacy and terms are linked from the front page and describe what is public", async ({ page }) => {
    await openFrontPage(page);
    const about = page.getByRole("navigation", { name: "About Hog Wumbia" });
    await about.getByRole("link", { name: "Privacy" }).click();
    await expect(page.getByRole("heading", { name: "What other people can see" })).toBeVisible();
    await openFrontPage(page);
    await about.getByRole("link", { name: "Terms" }).click();
    await expect(page.getByRole("heading", { name: "Sending owls and voting" })).toBeVisible();
  });

  test("protected and retired routes redirect to the front page", async ({ page }) => {
    for (const path of ["/profile", "/gallery"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test("the page never scrolls sideways", async ({ page }) => {
    await openFrontPage(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
