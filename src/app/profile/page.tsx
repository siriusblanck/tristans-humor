import { requireAccount, getProfile } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile";
import { AVATAR_BUCKET } from "@/lib/avatars";
import AccountNav from "@/app/account-nav";
import ProfileForm from "./profile-form";
import styles from "./profile.module.css";

export default async function ProfilePage() {
  const { supabase, user } = await requireAccount();
  const profile = await getProfile(supabase, user.id);
  const onboarding = !isProfileComplete(profile);
  // Accounts from before the House Cup already have names and only need a house.
  const needsHouseOnly = onboarding && Boolean(profile?.first_name?.trim() && profile?.last_name?.trim());
  let avatarUrl: string | null = null;

  if (profile?.avatar_path) {
    const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(profile.avatar_path, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }

  return (
    <div className={styles.page}>
      <AccountNav current="profile" onboarding={onboarding} />
      <main className={styles.main}>
        <div className={styles.heading}>
          {needsHouseOnly && <p className="eyebrow">One more thing</p>}
          {!onboarding && <p className="eyebrow">Make yourself at home</p>}
          <h1>
            {needsHouseOnly ? <>Now, your<br />house<span>?</span></>
              : onboarding ? <>First, your<br />name<span>?</span></>
                : <>Your<br />profile<span>.</span></>}
          </h1>
          {needsHouseOnly && <p>Pick a house for the weekly House Cup, then send your first owl.</p>}
          {!onboarding && <p>A name. A face. A house. A little more you.</p>}
        </div>
        <ProfileForm profile={profile} email={user.email ?? ""} avatarUrl={avatarUrl} onboarding={onboarding} />
      </main>
    </div>
  );
}
