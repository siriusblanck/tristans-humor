import { dayNumber, type IsoDate } from "./dates";

export type OwlPost = {
  id: string;
  sort_order: number;
  headline: string;
  scene: string;
};

/** Everyone sees the same prompt for a New York day; the pool repeats once exhausted. */
export function pickOwlPost(posts: readonly OwlPost[], date: IsoDate): OwlPost | null {
  if (posts.length === 0) return null;
  const ordered = [...posts].sort((a, b) => a.sort_order - b.sort_order);
  return ordered[dayNumber(date) % ordered.length];
}
