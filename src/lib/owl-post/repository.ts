import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { GenerationContext } from "./create-generation";
import { addDays, newYorkDate, weekStart, type IsoDate } from "./dates";
import { parseGenerationRows, parseVoteRows, toFeedItems, type CastCard, type FeedItem } from "./feed";
import { weeklyHouseCup, type HouseStanding } from "./houses";
import { pickOwlPost, type OwlPost } from "./owl-posts";

export const GENERATIONS_BUCKET = "generations";
const FEED_COLUMNS = "id, author_display, house, character_id, owl_post_date, caption, image_path, image_alt, upvotes, downvotes, score";
const TODAY_LIMIT = 48;
const EARLIER_LIMIT = 12;

const castSchema = z.array(z.object({
  id: z.string(), letter: z.string(), name: z.string().nullable(), image_url: z.string().nullable(),
  appearance: z.string().nullable(), sort_order: z.number(),
}));
const owlPostsSchema = z.array(z.object({ id: z.string(), sort_order: z.number(), headline: z.string(), scene: z.string() }));
const housePointsSchema = z.array(z.object({ house: z.unknown(), owl_post_date: z.unknown(), points: z.number() }));

export type CastMemberRow = z.infer<typeof castSchema>[number];

export type FrontPage = {
  date: IsoDate;
  owlPost: OwlPost | null;
  cast: CastMemberRow[];
  today: FeedItem[];
  earlier: FeedItem[];
  standings: HouseStanding[];
  usedToday: number;
};

type Result = { data: unknown; error: { message: string } | null; count?: number | null };

function unwrap<T>(result: Result, schema: z.ZodType<T>, label: string): T {
  if (result.error) throw new Error(`${label} query failed: ${result.error.message}`);
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) throw new Error(`${label} returned an unexpected shape.`);
  return parsed.data;
}

function count(result: Result, label: string) {
  if (result.error) throw new Error(`${label} count failed: ${result.error.message}`);
  return result.count ?? 0;
}

const loadCast = async (supabase: SupabaseClient) =>
  unwrap(await supabase.from("characters").select("id, letter, name, image_url, appearance, sort_order").order("sort_order"), castSchema, "characters");

const loadOwlPosts = async (supabase: SupabaseClient) =>
  unwrap(await supabase.from("owl_posts").select("id, sort_order, headline, scene"), owlPostsSchema, "owl_posts");

async function countGenerations(supabase: SupabaseClient, date: IsoDate, authorId?: string) {
  let query = supabase.from("generations").select("id", { count: "exact", head: true }).eq("owl_post_date", date);
  if (authorId) query = query.eq("author_id", authorId);
  return count(await query, "generations");
}

export async function loadGenerationContext(supabase: SupabaseClient): Promise<GenerationContext> {
  const [cast, owlPosts] = await Promise.all([loadCast(supabase), loadOwlPosts(supabase)]);
  return { cast, owlPosts };
}

async function loadGenerationRows(supabase: SupabaseClient, viewerId: string | null, from: IsoDate, to: IsoDate, limit: number) {
  // anon cannot select author_id (column grant), so it is requested only for signed-in viewers.
  const columns = viewerId ? `${FEED_COLUMNS}, author_id` : FEED_COLUMNS;
  const result = await supabase.from("generations").select(columns)
    .gte("owl_post_date", from).lte("owl_post_date", to)
    .order("score", { ascending: false }).order("created_at", { ascending: false })
    .limit(limit);
  if (result.error) throw new Error(`generations query failed: ${result.error.message}`);
  return parseGenerationRows(result.data);
}

async function loadMyVotes(supabase: SupabaseClient, viewerId: string | null, generationIds: string[]) {
  if (!viewerId || generationIds.length === 0) return new Map();
  // RLS returns only the viewer's own votes.
  const result = await supabase.from("votes").select("generation_id, value").in("generation_id", generationIds);
  if (result.error) throw new Error(`votes query failed: ${result.error.message}`);
  return parseVoteRows(result.data);
}

export async function loadFrontPage(supabase: SupabaseClient, viewerId: string | null, now: Date): Promise<FrontPage> {
  const date = newYorkDate(now);
  const [cast, owlPosts, todayRows, earlierRows, points, usedToday] = await Promise.all([
    loadCast(supabase),
    loadOwlPosts(supabase),
    loadGenerationRows(supabase, viewerId, date, date, TODAY_LIMIT),
    loadGenerationRows(supabase, viewerId, addDays(date, -6), addDays(date, -1), EARLIER_LIMIT),
    supabase.from("house_points").select("house, owl_post_date, points").gte("owl_post_date", weekStart(date))
      .then((result) => unwrap(result, housePointsSchema, "house_points")),
    viewerId ? countGenerations(supabase, date, viewerId) : Promise.resolve(0),
  ]);

  const votes = await loadMyVotes(supabase, viewerId, [...todayRows, ...earlierRows].map(({ id }) => id));
  const imageUrl = (path: string) => supabase.storage.from(GENERATIONS_BUCKET).getPublicUrl(path).data.publicUrl;
  const castCards: CastCard[] = cast;
  const toItems = (rows: typeof todayRows) => toFeedItems(rows, { cast: castCards, viewerId, votes, imageUrl });

  return {
    date,
    owlPost: pickOwlPost(owlPosts, date),
    cast,
    today: toItems(todayRows),
    earlier: toItems(earlierRows),
    standings: weeklyHouseCup(points, weekStart(date)),
    usedToday,
  };
}
