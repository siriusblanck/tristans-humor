import type { House } from "@/lib/owl-post/houses";

/** What the profile sheet shows and edits. Everything here is the signed-in user's own. */
export type ProfileDetails = {
  firstName: string;
  lastName: string;
  house: House | null;
  email: string;
  photoUrl: string | null;
};
