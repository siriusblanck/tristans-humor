import { describe, expect, it } from "vitest";
import { glints, starField } from "@/lib/sky";

/* Behavior inventory:
 * The night sky is drawn from a seed, so the server and the browser draw the same stars.
 * Stars: the requested count; positions inside the frame (percent); radius and brightness in
 * range; thicker toward the top of the sky; a few warm, candle-coloured ones.
 * Glints: the requested count; every third one a four-point sparkle, the rest twinkling dots;
 * each with its own size, delay, and duration in range, so they don't twinkle together; kept
 * to the sky above the rooftops.
 * Numbers are rounded to two decimals so the markup stays small. Different seeds differ.
 */
const decimals = (value: number) => (String(value).split(".")[1] ?? "").length;

describe("star field", () => {
  const stars = starField(7, 400);

  it("draws the same sky from the same seed, and a different one from another", () => {
    expect(starField(7, 400)).toEqual(stars);
    expect(starField(8, 400)).not.toEqual(stars);
  });

  it("draws the requested number of stars inside the frame", () => {
    expect(stars).toHaveLength(400);
    expect(starField(7, 0)).toEqual([]);
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(100);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThan(100);
      expect(star.r).toBeGreaterThanOrEqual(0.5);
      expect(star.r).toBeLessThanOrEqual(1.6);
      expect(star.opacity).toBeGreaterThanOrEqual(0.25);
      expect(star.opacity).toBeLessThanOrEqual(0.95);
      expect(Math.max(...[star.x, star.y, star.r, star.opacity].map(decimals))).toBeLessThanOrEqual(2);
    }
  });

  it("crowds the stars toward the top of the sky", () => {
    const upper = stars.filter(({ y }) => y < 50).length;
    expect(upper).toBeGreaterThan(stars.length * 0.6);
  });

  it("makes a few of them warm", () => {
    const warm = stars.filter(({ warm }) => warm).length;
    expect(warm).toBeGreaterThan(0);
    expect(warm).toBeLessThan(stars.length * 0.2);
  });
});

describe("glints", () => {
  const list = glints(3, 36);

  it("draws the same glints from the same seed", () => {
    expect(glints(3, 36)).toEqual(list);
    expect(glints(4, 36)).not.toEqual(list);
  });

  it("makes every third glint a sparkle and the rest twinkling dots", () => {
    expect(list).toHaveLength(36);
    expect(list.filter(({ kind }) => kind === "spark")).toHaveLength(12);
    expect(list.map(({ kind }) => kind).slice(0, 3)).toEqual(["dot", "dot", "spark"]);
  });

  it("gives each glint its own size and rhythm, above the rooftops", () => {
    for (const glint of list) {
      const [low, high] = glint.kind === "spark" ? [9, 18] : [2, 3.5];
      expect(glint.size).toBeGreaterThanOrEqual(low);
      expect(glint.size).toBeLessThanOrEqual(high);
      expect(glint.duration).toBeGreaterThanOrEqual(2.4);
      expect(glint.duration).toBeLessThanOrEqual(6);
      expect(glint.delay).toBeGreaterThanOrEqual(0);
      expect(glint.delay).toBeLessThan(glint.duration);
      expect(glint.y).toBeLessThan(70);
    }
    expect(new Set(list.map(({ delay }) => delay)).size).toBeGreaterThan(30);
  });
});
