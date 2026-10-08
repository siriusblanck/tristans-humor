import Link from "next/link";
import { redirect } from "next/navigation";
import AccountNav from "@/app/account-nav";
import SignInButton from "@/app/sign-in-button";
import { getAccount, getProfile } from "@/lib/auth";
import { characterHue } from "@/lib/characters";
import { formatDateline, formatMonthDay, formatWeekday, weekStart } from "@/lib/owl-post/dates";
import { remainingToday } from "@/lib/owl-post/limits";
import { loadFrontPage } from "@/lib/owl-post/repository";
import { isProfileComplete } from "@/lib/profile";
import Composer from "./_front-page/composer";
import FeedSection from "./_front-page/feed-section";
import HouseCup from "./_front-page/house-cup";
import LetterPicker, { type CastOption } from "./_front-page/letter-picker";
import styles from "./_front-page/front-page.module.css";

// Generating a caption and a picture can take most of a minute.
export const maxDuration = 120;

const AUTH_MESSAGES: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Give it another go when you're ready.",
  error: "We couldn't finish sign-in. Please try again.",
};

export default async function FrontPage({ searchParams }: PageProps<"/">) {
  const { supabase, user } = await getAccount();
  if (user && !isProfileComplete(await getProfile(supabase, user.id))) redirect("/profile");

  const page = await loadFrontPage(supabase, user?.id ?? null, new Date());
  const { auth } = await searchParams;
  const signedIn = Boolean(user);
  const cast: CastOption[] = page.cast.flatMap(({ id, letter, name, image_url, sort_order }) =>
    name ? [{ id, letter, name, imageUrl: image_url, hue: characterHue(sort_order) }] : []);

  return (
    <div className={styles.page}>
      <AccountNav current="front" signedIn={signedIn} dateline={formatDateline(page.date)}
        authError={typeof auth === "string" ? AUTH_MESSAGES[auth] : undefined} />

      <main className={styles.main}>
        <div className={styles.hero}>
          <section className={styles.owlPost} aria-labelledby="owl-post">
            <p className="eyebrow">Owl Post · {formatWeekday(page.date)}</p>
            <h1 id="owl-post">{page.owlPost?.headline ?? "Today's Owl Post is still in the air."}</h1>
            {page.owlPost && <p>{page.owlPost.scene}</p>}
          </section>
          <HouseCup standings={page.standings} weekOf={formatMonthDay(weekStart(page.date))} />
        </div>

        {signedIn ? (
          <Composer cast={cast} remaining={remainingToday(page.usedToday)} />
        ) : (
          <div className={styles.composer}>
            <LetterPicker cast={cast} selected={null} />
            <p className={styles.invite}>
              Pick a writer, add a twist, and send today&apos;s owl <SignInButton label="by Signing In" className={styles.inviteLink} />
            </p>
          </div>
        )}

        <FeedSection
          id="today"
          title="Today's owls"
          items={page.today}
          signedIn={signedIn}
          prioritizeFirst
          empty={signedIn ? "No owls yet today. Pick a letter above and send the first." : "No owls yet today. Sign in and send the first."}
        />
        <FeedSection id="earlier" title="The past week" items={page.earlier} signedIn={signedIn} />
      </main>

      <footer className={styles.footer}>
        <nav aria-label="App information">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </div>
  );
}
