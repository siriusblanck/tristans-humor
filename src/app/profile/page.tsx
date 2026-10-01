import { requireAccount, getProfile } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile";
import { AVATAR_BUCKET } from "@/lib/avatars";
import AccountNav from "@/app/account-nav";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const { supabase, user } = await requireAccount();
  const profile = await getProfile(supabase, user.id);
  const onboarding = !isProfileComplete(profile);
  let avatarUrl: string | null = null;

  if (profile?.avatar_path) {
    const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(profile.avatar_path, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="profile-page">
      <AccountNav current="profile" onboarding={onboarding} />
      <main className="profile-main">
        <div className="profile-heading">
          {!onboarding && <p className="eyebrow">Make yourself at home</p>}
          <h1>{onboarding ? <>First, your<br />name<span>?</span></> : <>Your<br />profile<span>.</span></>}</h1>
          {!onboarding && <p>A name. A face. A little more you.</p>}
        </div>
        <ProfileForm profile={profile} email={user.email ?? ""} avatarUrl={avatarUrl} onboarding={onboarding} />
      </main>
    </div>
  );
}
