import type { Photo } from "@/lib/avatars";
import type { House, RailHouse } from "@/lib/owl-post/houses";
import type { VoteValue } from "@/lib/owl-post/inputs";

// What the server hands the front page. Everything here is already parsed and safe to show.

export type Owl = {
  id: string;
  caption: string;
  imageUrl: string;
  imageAlt: string;
  authorDisplay: string;
  house: House;
  writer: string;
  upvotes: number;
  downvotes: number;
  score: number;
  myVote: VoteValue;
  isMine: boolean;
  /** The day it was sent, as stamped on the postmark ("OCT 8"). */
  postmark: string;
};

export type Writer = { id: string; name: string; imageUrl: string | null; hue: number };

export type Viewer =
  | { signedIn: false }
  | { signedIn: true; firstName: string; lastName: string; initial: string; house: House; email: string; photo: Photo | null };

export type Prompt = { headline: string; scene: string };

export type FrontPageData = {
  prompt: Prompt | null;
  /** "Oct 5 – 11" */
  weekLabel: string;
  /** Monday of this week (YYYY-MM-DD): the delivery plays once per week. */
  weekKey: string;
  rail: RailHouse[];
  owls: Owl[];
  writers: Writer[];
  viewer: Viewer;
  remaining: number;
  authError?: string;
};

/** Why the sign-in letter opened; its wording follows. */
export type SignInReason = "vote" | "owl" | "signin";

/** Set before leaving for Google so the page can reopen the same owl afterwards. */
export const RETURN_KEY = "hw:return";
