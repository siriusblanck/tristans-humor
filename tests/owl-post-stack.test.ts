import { describe, expect, it } from "vitest";
import { applyVote, captionSize, chooseOwl, currentOwl, landOwl, nextVote, reconcileOrder, resolveCurrent, startStack, stepOwl, syncStack } from "@/lib/owl-post/stack";

/* Behavior inventory:
 * Caption size: short (<= 120 characters), medium (<= 190), long; boundaries both sides.
 * Votes: pressing your current vote takes it back; otherwise it becomes your vote. The
 * tally moves your old vote out and the new one in, and the score follows.
 * Stack order: keeps the order you started browsing in when points change; drops owls
 * that vanished; adds new ones at the back; a freshly landed owl goes in front of the one
 * you are looking at (or first). Browsing stops at both ends. The current owl falls back to
 * the first when its id is unknown or gone.
 * Stack state: starts on the first owl; new page data keeps your place; your own owl lands in
 * front of the one you were reading as soon as the page includes it, whether that data came
 * before or after the send finished; an owl that never arrives changes nothing.
 */
describe("caption size", () => {
  it.each([[0, "s"], [120, "s"], [121, "m"], [190, "m"], [191, "l"], [280, "l"]])("a %i-character caption is %s", (length, size) => {
    expect(captionSize("a".repeat(length))).toBe(size);
  });
});

describe("votes", () => {
  it.each([[0, 1, 1], [0, -1, -1], [1, 1, 0], [-1, -1, 0], [1, -1, -1], [-1, 1, 1]] as const)(
    "with vote %i, pressing %i leaves %i", (current, pressed, expected) => {
      expect(nextVote(current, pressed)).toBe(expected);
    },
  );

  const tally = { upvotes: 5, downvotes: 2, score: 3 };

  it.each([
    [0, 1, { upvotes: 6, downvotes: 2, score: 4 }],
    [0, -1, { upvotes: 5, downvotes: 3, score: 2 }],
    [1, -1, { upvotes: 4, downvotes: 3, score: 1 }],
    [-1, 0, { upvotes: 5, downvotes: 1, score: 4 }],
    [1, 1, { upvotes: 5, downvotes: 2, score: 3 }],
  ] as const)("moving from %i to %i updates the tally", (myVote, next, expected) => {
    const item = { id: "a", ...tally, myVote };
    expect(applyVote(item, next)).toEqual({ id: "a", ...expected, myVote: next });
    expect(item).toEqual({ id: "a", ...tally, myVote }); // not mutated
  });
});

describe("stack order", () => {
  it("starts in the order the page arrived in", () => {
    expect(reconcileOrder([], ["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("keeps the browsing order when points reshuffle the page, dropping vanished owls and appending new ones", () => {
    expect(reconcileOrder(["a", "b", "c"], ["c", "d", "a"])).toEqual(["a", "c", "d"]);
  });

  it("puts a freshly landed owl in front of the one you are looking at", () => {
    expect(reconcileOrder(["a", "b", "c"], ["a", "b", "c", "new"], { landedId: "new", currentId: "b" })).toEqual(["a", "new", "b", "c"]);
    expect(reconcileOrder(["a", "b"], ["new", "a", "b"], { landedId: "new", currentId: "gone" })).toEqual(["new", "a", "b"]);
    expect(reconcileOrder(["a", "b"], ["a", "b"], { landedId: "missing", currentId: "a" })).toEqual(["a", "b"]);
  });

  it("browses forward and back, stopping at both ends", () => {
    const order = ["a", "b", "c"];
    expect(stepOwl(order, "a", 1)).toBe("b");
    expect(stepOwl(order, "b", -1)).toBe("a");
    expect(stepOwl(order, "c", 1)).toBeNull();
    expect(stepOwl(order, "a", -1)).toBeNull();
    expect(stepOwl(order, "zzz", 1)).toBe("b"); // unknown current acts as the first owl
    expect(stepOwl([], null, 1)).toBeNull();
  });

  it("falls back to the first owl when the current one is unknown", () => {
    expect(resolveCurrent(["a", "b"], "b")).toBe("b");
    expect(resolveCurrent(["a", "b"], "gone")).toBe("a");
    expect(resolveCurrent(["a", "b"], null)).toBe("a");
    expect(resolveCurrent([], "a")).toBeNull();
  });
});

describe("stack state", () => {
  it("starts on the first owl and follows your choice", () => {
    const state = startStack(["a", "b", "c"]);
    expect(currentOwl(state)).toBe("a");
    expect(currentOwl(chooseOwl(state, "c"))).toBe("c");
    expect(state.chosen).toBeNull(); // not mutated
  });

  it("keeps your place when votes reshuffle the page", () => {
    const state = syncStack(chooseOwl(startStack(["a", "b", "c"]), "b"), ["c", "b", "a"]);
    expect(state.order).toEqual(["a", "b", "c"]);
    expect(currentOwl(state)).toBe("b");
    expect(syncStack(state, ["c", "b", "a"])).toBe(state); // same page, same state
  });

  it("lands your owl at once when the page already has it", () => {
    const reading = chooseOwl(startStack(["a", "b"]), "b");
    const withNew = syncStack(reading, ["a", "b", "new"]);
    expect(withNew.order).toEqual(["a", "b", "new"]);
    const landed = landOwl(withNew, "new");
    expect(landed.order).toEqual(["a", "new", "b"]);
    expect(currentOwl(landed)).toBe("new");
    expect(landed.landed).toBe("new");
  });

  it("waits for the page to include your owl, then lands it where you were", () => {
    const waiting = landOwl(chooseOwl(startStack(["a", "b"]), "b"), "new");
    expect(waiting.order).toEqual(["a", "b"]);
    expect(currentOwl(waiting)).toBe("b");
    expect(waiting.landed).toBeNull();

    const arrived = syncStack(chooseOwl(waiting, "a"), ["new", "a", "b"]);
    expect(arrived.order).toEqual(["new", "a", "b"]);
    expect(currentOwl(arrived)).toBe("new");
    expect(arrived.landed).toBe("new");
    expect(arrived.pending).toBeNull();
  });

  it("changes nothing for an owl that never arrives", () => {
    const waiting = landOwl(startStack(["a", "b"]), "ghost");
    const later = syncStack(waiting, ["a", "b", "c"]);
    expect(later.order).toEqual(["a", "b", "c"]);
    expect(currentOwl(later)).toBe("a");
    expect(later.landed).toBeNull();
  });
});
