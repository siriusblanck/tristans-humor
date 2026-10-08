import { z } from "zod";
import { RETURN_KEY, type SignInReason } from "./types";

// The note the sign-in letter leaves before going to Google, so the visitor lands back on
// the owl they were looking at. Session storage is outside data: parse it, read it once.

const noteSchema = z.object({
  owlId: z.string().min(1).max(64).nullable(),
  reason: z.enum(["vote", "owl", "signin"]),
});

export type ReturnNote = { owlId: string | null; reason: SignInReason };

export function readReturn(): ReturnNote | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (!raw) return null;
    const parsed = noteSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // blocked storage or unreadable JSON: start from the first owl
  }
}
