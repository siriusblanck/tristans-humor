import { describe, expect, it } from "vitest";
import { addDays, dayNumber, formatDateline, formatMonthDay, formatPostmark, formatWeekRange, formatWeekday, newYorkDate, parseIsoDate, weekStart } from "@/lib/owl-post/dates";
import { pickOwlPost, type OwlPost } from "@/lib/owl-post/owl-posts";
import { HOUSES, houseName, houseRail, parseHouse, weeklyHouseCup } from "@/lib/owl-post/houses";

/* Behavior inventory:
 * "Today" is the New York calendar date: EDT/EST evening boundaries, both DST changes.
 * Date math is whole days in UTC; weeks start Monday; malformed dates are rejected.
 * Labels: the week range (same month, across months and years) and the postmark day.
 * The weekly prompt holds Monday through Sunday, rotates by week in sort order, keeps the
 * halal cart for the week of Oct 5 2026 (when the rotation began), works before that week,
 * wraps, ignores input order, and never mutates input.
 * House Cup: always four houses, sums only this week, ignores unknown houses, stable ties.
 * House rail: fixed house order; the leader's glass is full, others in proportion,
 * negative or zero points show an empty glass with the real number; no leader when nobody scores.
 */
const date = (value: string) => parseIsoDate(value)!;

describe("New York calendar", () => {
  it.each([
    ["2026-10-09T03:30:00Z", "2026-10-08"], // 11:30 p.m. EDT
    ["2026-10-09T04:00:00Z", "2026-10-09"], // midnight EDT
    ["2026-12-01T04:59:00Z", "2026-11-30"], // 11:59 p.m. EST
    ["2026-12-01T05:00:00Z", "2026-12-01"], // midnight EST
    ["2026-03-08T04:30:00Z", "2026-03-07"], // spring forward night
    ["2026-11-01T03:59:00Z", "2026-10-31"], // fall-back eve, 11:59 p.m. EDT
    ["2026-11-01T06:30:00Z", "2026-11-01"], // after fall-back, 1:30 a.m. EST
  ])("%s is %s in New York", (instant, expected) => {
    expect(newYorkDate(new Date(instant))).toBe(expected);
  });

  it("counts whole days across daylight-saving changes", () => {
    expect(dayNumber(date("1970-01-01"))).toBe(0);
    for (const start of ["2026-03-07", "2026-10-31", "2026-12-31"]) {
      expect(dayNumber(addDays(date(start), 1)) - dayNumber(date(start))).toBe(1);
    }
    expect(addDays(date("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(date("2026-03-01"), -1)).toBe("2026-02-28");
  });

  it.each([["2026-10-05", "2026-10-05"], ["2026-10-08", "2026-10-05"], ["2026-10-11", "2026-10-05"], ["2026-10-12", "2026-10-12"]])(
    "the week containing %s starts on Monday %s", (day, monday) => {
      expect(weekStart(date(day))).toBe(monday);
    },
  );

  it("formats a dateline without shifting the day", () => {
    expect(formatDateline(date("2026-10-08"))).toBe("Thursday, October 8, 2026");
    expect(formatDateline(date("2027-01-01"))).toBe("Friday, January 1, 2027");
    expect(formatMonthDay(date("2026-10-05"))).toBe("October 5");
    expect(formatWeekday(date("2026-10-08"))).toBe("Thursday");
  });

  it.each([["2026-10-05", "Oct 5 – 11"], ["2026-09-28", "Sep 28 – Oct 4"], ["2026-12-28", "Dec 28 – Jan 3"]])(
    "labels the week of %s as %s", (monday, label) => {
      expect(formatWeekRange(date(monday))).toBe(label);
    },
  );

  it("stamps the postmark with the day it was sent", () => {
    expect(formatPostmark(date("2026-10-08"))).toBe("OCT 8");
    expect(formatPostmark(date("2027-01-01"))).toBe("JAN 1");
  });

  it.each(["", "2026-13-01", "2026-02-30", "26-10-08", "2026-10-08T00:00:00Z", null, 20261008])("rejects malformed date %j", (value) => {
    expect(parseIsoDate(value)).toBeNull();
  });
});

describe("Owl Post of the week", () => {
  const posts: OwlPost[] = [2, 0, 1].map((sort_order) => ({
    id: `post-${sort_order}`, sort_order, headline: `Headline ${sort_order}`, scene: `Scene ${sort_order}`,
  }));
  const pool: OwlPost[] = Array.from({ length: 21 }, (_, sort_order) => ({
    id: `pool-${sort_order}`, sort_order, headline: `Headline ${sort_order}`, scene: `Scene ${sort_order}`,
  }));

  it("keeps the halal cart (sort order 7) for the week the rotation began", () => {
    for (const day of ["2026-10-05", "2026-10-08", "2026-10-11"]) {
      expect(pickOwlPost(pool, date(day))?.sort_order).toBe(7);
    }
  });

  it("holds one prompt from Monday to Sunday in New York", () => {
    const monday = pickOwlPost(posts, date("2026-10-12"));
    for (let day = 0; day < 7; day += 1) expect(pickOwlPost(posts, addDays(date("2026-10-12"), day))).toEqual(monday);
    const sundayNight = newYorkDate(new Date("2026-10-19T03:59:00Z")); // 11:59 p.m. Sunday EDT
    expect(pickOwlPost(posts, sundayNight)).toEqual(monday);
  });

  it("moves to the next prompt each week, in sort order, wrapping before and after the first week", () => {
    const weeks = [-2, -1, 0, 1, 2, 3].map((week) => pickOwlPost(pool, addDays(date("2026-10-05"), week * 7))?.sort_order);
    expect(weeks).toEqual([5, 6, 7, 8, 9, 10]);
    expect(pickOwlPost(pool, addDays(date("2026-10-05"), 14 * 7))?.sort_order).toBe(0);
    const small = [0, 1, 2, 3].map((week) => pickOwlPost(posts, addDays(date("2026-10-05"), week * 7))?.sort_order);
    expect(small).toEqual([1, 2, 0, 1]);
  });

  it("leaves the input untouched and returns null when there are no prompts", () => {
    const snapshot = structuredClone(posts);
    pickOwlPost(posts, date("2026-10-08"));
    expect(posts).toEqual(snapshot);
    expect(pickOwlPost([], date("2026-10-08"))).toBeNull();
  });
});

describe("houses and the House Cup", () => {
  it("parses only the four houses", () => {
    expect(HOUSES.map((house) => house.id)).toEqual(["gryffindor", "hufflepuff", "ravenclaw", "slytherin"]);
    expect(parseHouse("ravenclaw")).toBe("ravenclaw");
    expect(HOUSES.map(({ id }) => houseName(id))).toEqual(["Gryffindor", "Hufflepuff", "Ravenclaw", "Slytherin"]);
    for (const value of ["Ravenclaw", " ravenclaw", "durmstrang", "", null, 1, ["slytherin"]]) {
      expect(parseHouse(value)).toBeNull();
    }
  });

  it("sums this week's points for all four houses, highest first, ties by name", () => {
    const monday = date("2026-10-05");
    const standings = weeklyHouseCup([
      { house: "slytherin", owl_post_date: "2026-10-05", points: 4 },
      { house: "slytherin", owl_post_date: "2026-10-07", points: -1 },
      { house: "ravenclaw", owl_post_date: "2026-10-06", points: 3 },
      { house: "gryffindor", owl_post_date: "2026-10-04", points: 50 }, // last week
      { house: "durmstrang", owl_post_date: "2026-10-06", points: 99 },
      { house: "hufflepuff", owl_post_date: "not-a-date", points: 7 },
    ], monday);
    expect(standings.map(({ house, points }) => [house, points])).toEqual([
      ["ravenclaw", 3], ["slytherin", 3], ["gryffindor", 0], ["hufflepuff", 0],
    ]);
    expect(standings[0].name).toBe("Ravenclaw");
  });
});

describe("the house rail", () => {
  const standing = (house: (typeof HOUSES)[number]["id"], points: number) => ({ house, name: house, points });

  it("lists the houses in a fixed order with the leader's glass full", () => {
    const rail = houseRail([standing("slytherin", 33), standing("gryffindor", 41), standing("ravenclaw", 29), standing("hufflepuff", 37)]);
    expect(rail.map(({ house }) => house)).toEqual(["gryffindor", "hufflepuff", "ravenclaw", "slytherin"]);
    expect(rail.map(({ name }) => name)).toEqual(["Gryffindor", "Hufflepuff", "Ravenclaw", "Slytherin"]);
    expect(rail[0]).toMatchObject({ points: 41, level: 1, leader: true });
    expect(rail[1].level).toBeCloseTo(37 / 41);
    expect(rail.filter(({ leader }) => leader)).toHaveLength(1);
  });

  it("shows an empty glass for houses at or below zero, with their real number", () => {
    const rail = houseRail([standing("gryffindor", 4), standing("hufflepuff", -2), standing("ravenclaw", 0)]);
    expect(rail.map(({ points, level }) => [points, level])).toEqual([[4, 1], [-2, 0], [0, 0], [0, 0]]);
  });

  it("crowns ties together and nobody when no house has scored", () => {
    expect(houseRail([standing("gryffindor", 5), standing("slytherin", 5)]).filter(({ leader }) => leader).map(({ house }) => house))
      .toEqual(["gryffindor", "slytherin"]);
    const empty = houseRail([]);
    expect(empty.every(({ level, leader, points }) => level === 0 && !leader && points === 0)).toBe(true);
  });
});
