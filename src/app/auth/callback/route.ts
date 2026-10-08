import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile";

function callbackRedirect(path: string) {
  // A relative Location keeps the browser on the host that owns its cookies,
  // including preview deployments and servers behind a reverse proxy.
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (searchParams.has("error")) {
    const reason = searchParams.get("error") === "access_denied" ? "cancelled" : "error";
    return callbackRedirect(`/?auth=${reason}`);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        const profile = await getProfile(supabase, data.user.id);
        // Destinations are fixed; never accept a user-supplied `next` URL.
        return callbackRedirect(isProfileComplete(profile) ? "/" : "/profile");
      }
    } catch {
      // An expired code, failed exchange, or unavailable database returns to a retryable screen.
    }
  }

  return callbackRedirect("/?auth=error");
}
