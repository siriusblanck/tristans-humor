import Link from "next/link";
import LowLibrary from "@/app/_front-page/low-library";
import SceneFit from "@/app/_front-page/scene-fit";
import Starfield from "@/app/_front-page/starfield";
import { signedPhoto } from "@/lib/avatar-urls";
import { getProfile, requireAccount } from "@/lib/auth";
import { profileStep } from "@/lib/profile";
import ProfileSheet from "./profile-sheet";
import controls from "@/app/_front-page/controls.module.css";
import styles from "./profile.module.css";

/** The profile sheet on its own: for first sign-in, and for anyone who lands on /profile. */
export default async function ProfilePage() {
  const { supabase, user } = await requireAccount();
  const profile = await getProfile(supabase, user.id);
  const photo = await signedPhoto(supabase, profile?.avatar_path ?? null);
  const step = profileStep(profile);

  return (
    <div className={styles.page}>
      <SceneFit />
      <Starfield held />
      <div className={styles.pageBackdrop} aria-hidden="true"><LowLibrary /></div>
      <div className={styles.veil} aria-hidden="true" />
      <main>
        <ProfileSheet
          details={{
            firstName: profile?.first_name ?? "",
            lastName: profile?.last_name ?? "",
            house: profile?.house ?? null,
            email: user.email ?? "",
            photoUrl: photo?.url ?? null,
          }}
          step={step}
          close={step === "edit" && (
            <Link className={controls.iconButton} href="/" aria-label="Back to the front page">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </Link>
          )}
        />
      </main>
    </div>
  );
}
