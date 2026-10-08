import { describe, expect, it } from "vitest";
import { addDays, dayNumber, formatDateline, formatMonthDay, formatWeekday, newYorkDate, parseIsoDate, weekStart } from "@/lib/owl-post/dates";
import { pickOwlPost, type OwlPost } from "@/lib/owl-post/owl-posts";
import { HOUSES, parseHouse, weeklyHouseCup } from "@/lib/owl-post/houses";

/* Behavior inventory:
 * "Today" is the New York calendar date: EDT/EST evening boundaries, both DST changes.
 * Date math is whole days in UTC; weeks start Monday; malformed dates are rejected.
 * The daily prompt rotates by day, ignores input order, wraps, and never mutates input.
 * House Cup: always four houses, sums only this week, ignores unknown houses, stable ties.
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

  it.each(["", "2026-13-01", "2026-02-30", "26-10-08", "2026-10-08T00:00:00Z", null, 20261008])("rejects malformed date %j", (value) => {
    expect(parseIsoDate(value)).toBeNull();
  });
});

describe("Owl Post of the day", () => {
  const posts: OwlPost[] = [2, 0, 1].map((sort_order) => ({
    id: `post-${sort_order}`, sort_order, headline: `Headline ${sort_order}`, scene: `Scene ${sort_order}`,
  }));

  it("rotates through the pool by day, in sort order, and wraps", () => {
    const start = date("2026-10-08");
    const offset = dayNumber(start) % 3;
    const picks = [0, 1, 2, 3].map((days) => pickOwlPost(posts, addDays(start, days))?.sort_order);
    expect(picks).toEqual([0, 1, 2, 3].map((days) => (offset + days) % 3));
    expect(picks[3]).toBe(picks[0]);
  });

  it("is stable for the whole New York day and leaves the input untouched", () => {
    const snapshot = structuredClone(posts);
    const evening = newYorkDate(new Date("2026-10-09T03:59:00Z"));
    expect(pickOwlPost(posts, evening)).toEqual(pickOwlPost(posts, date("2026-10-08")));
    expect(posts).toEqual(snapshot);
  });

  it("returns null when there are no prompts", () => {
    expect(pickOwlPost([], date("2026-10-08"))).toBeNull();
  });
});

describe("houses and the House Cup", () => {
  it("parses only the four houses", () => {
    expect(HOUSES.map((house) => house.id)).toEqual(["gryffindor", "hufflepuff", "ravenclaw", "slytherin"]);
    expect(parseHouse("ravenclaw")).toBe("ravenclaw");
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
