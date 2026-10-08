import { describe, expect, it } from "vitest";
import { parseGenerationRows, parseVoteRows, toFeedItems } from "@/lib/owl-post/feed";

/* Behavior inventory:
 * Rows are parsed one at a time: malformed rows (unknown house, missing fields, bad date)
 * are dropped without discarding valid ones; non-arrays yield nothing.
 * Feed items: character (name, portrait, card hue) looked up by id (null when missing),
 * public image URL and alt text (generic when absent), viewer's own
 * vote (0 when none), "mine" only when the signed-in viewer is the author; anon rows lack
 * author_id and are never "mine".
 */
const row = (overrides: Record<string, unknown> = {}) => ({
  id: "gen-1", author_display: "Tristan R.", house: "ravenclaw", character_id: "char-1", owl_post_date: "2026-10-08",
  caption: "Blimey!", image_path: "author-1/gen-1.png", upvotes: 3, downvotes: 1, score: 2, created_at: "2026-10-08T20:00:00Z",
  ...overrides,
});
const cast = [{ id: "char-1", name: "Hagrid", image_url: "https://img.example/hagrid.png", sort_order: 0 }];
const imageUrl = (path: string) => `https://cdn.example/${path}`;

describe("parsing generation rows", () => {
  it("keeps valid rows and drops malformed ones individually", () => {
    const rows = parseGenerationRows([row(), row({ id: "gen-2", house: "durmstrang" }), row({ id: "gen-3", caption: null }), row({ id: "gen-4", owl_post_date: "yesterday" }), "junk"]);
    expect(rows.map(({ id }) => id)).toEqual(["gen-1"]);
  });

  it.each([null, undefined, {}, "rows"])("treats %j as no rows", (value) => {
    expect(parseGenerationRows(value)).toEqual([]);
  });

  it("parses only well-formed votes", () => {
    expect(parseVoteRows([{ generation_id: "gen-1", value: 1 }, { generation_id: "gen-2", value: 7 }, { value: -1 }])).toEqual(
      new Map([["gen-1", 1]]),
    );
  });
});

describe("feed items", () => {
  it("joins the character, public image, and the viewer's vote", () => {
    const [item] = toFeedItems(parseGenerationRows([row({ author_id: "author-1", image_alt: "A giant at a food cart." })]), {
      cast, viewerId: "viewer-1", votes: new Map([["gen-1", -1]]), imageUrl,
    });
    expect(item).toEqual({
      id: "gen-1", caption: "Blimey!", imageUrl: "https://cdn.example/author-1/gen-1.png", imageAlt: "A giant at a food cart.",
      authorDisplay: "Tristan R.", house: "ravenclaw", character: { name: "Hagrid", imageUrl: "https://img.example/hagrid.png", hue: 14 },
      upvotes: 3, downvotes: 1, score: 2, owlPostDate: "2026-10-08", isMine: false, myVote: -1,
    });
  });

  it("marks the viewer's own posts and defaults to no vote", () => {
    const [item] = toFeedItems(parseGenerationRows([row({ author_id: "viewer-1" })]), { cast, viewerId: "viewer-1", votes: new Map(), imageUrl });
    expect(item).toMatchObject({ isMine: true, myVote: 0 });
  });

  it("never marks anonymous rows as mine and tolerates a missing character", () => {
    const [item] = toFeedItems(parseGenerationRows([row({ character_id: "gone" })]), { cast, viewerId: null, votes: new Map(), imageUrl });
    expect(item).toMatchObject({ isMine: false, myVote: 0, character: null, imageAlt: "An AI illustration for this caption." });
  });
});
