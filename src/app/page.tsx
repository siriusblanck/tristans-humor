import { redirect } from "next/navigation";
import { signedPhoto } from "@/lib/avatar-urls";
import { getAccount, getProfile } from "@/lib/auth";
import { characterHue } from "@/lib/characters";
import { formatPostmark, formatWeekRange } from "@/lib/owl-post/dates";
import { houseRail } from "@/lib/owl-post/houses";
import { remainingToday } from "@/lib/owl-post/limits";
import { loadFrontPage } from "@/lib/owl-post/repository";
import { initialOf, isProfileComplete } from "@/lib/profile";
import FrontPageApp from "./_front-page/front-page-app";
import LowLibrary from "./_front-page/low-library";
import Starfield from "./_front-page/starfield";
import type { FrontPageData, Viewer } from "./_front-page/types";

// Generating a caption and a picture can take most of a minute.
export const maxDuration = 120;

const AUTH_MESSAGES: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Give it another go when you're ready.",
  error: "We couldn't finish sign-in. Please try again.",
};

export default async function FrontPage({ searchParams }: PageProps<"/">) {
  const { supabase, user } = await getAccount();
  const profile = user ? await getProfile(supabase, user.id) : null;
  if (user && !isProfileComplete(profile)) redirect("/profile");

  const [page, photo] = await Promise.all([
    loadFrontPage(supabase, user?.id ?? null, new Date()),
    signedPhoto(supabase, profile?.avatar_path ?? null),
  ]);
  const { auth } = await searchParams;
  const viewer: Viewer = user && isProfileComplete(profile)
    ? {
      signedIn: true,
      firstName: profile.first_name,
      lastName: profile.last_name,
      initial: initialOf(profile.first_name),
      house: profile.house,
      email: user.email ?? "",
      photo,
    }
    : { signedIn: false };

  const data: FrontPageData = {
    prompt: page.owlPost ? { headline: page.owlPost.headline, scene: page.owlPost.scene } : null,
    weekLabel: formatWeekRange(page.monday),
    weekKey: page.monday,
    rail: houseRail(page.standings),
    owls: page.owls.map((item) => ({
      id: item.id,
      caption: item.caption,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      authorDisplay: item.authorDisplay,
      house: item.house,
      writer: item.character?.name ?? "A mystery writer",
      upvotes: item.upvotes,
      downvotes: item.downvotes,
      score: item.score,
      myVote: item.myVote,
      isMine: item.isMine,
      postmark: formatPostmark(item.owlPostDate),
    })),
    writers: page.cast.flatMap(({ id, name, image_url, sort_order }) =>
      name ? [{ id, name, imageUrl: image_url, hue: characterHue(sort_order) }] : []),
    viewer,
    remaining: remainingToday(page.usedToday),
    authError: typeof auth === "string" ? AUTH_MESSAGES[auth] : undefined,
  };

  return <FrontPageApp data={data} backdrop={<LowLibrary />} sky={<Starfield />} />;
}
