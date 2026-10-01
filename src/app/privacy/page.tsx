import type { Metadata } from "next";
import PublicInfo from "@/app/public-info";

export const metadata: Metadata = { title: "Privacy · Humour me" };

export default function PrivacyPage() {
  return (
    <PublicInfo title="Your profile. Your privacy.">
      <p>Humour me is an animated character gallery. Google sign-in lets you enter the gallery and keep a personal profile.</p>
      <h2>Information used by the app</h2>
      <p>When you sign in, Google provides your account identifier, email address, and basic profile information to our authentication service, Supabase. This may include your Google display name and profile photo URL. We use this information to identify your account and maintain your sign-in session.</p>
      <p>Your profile stores the first and last names you enter and, if you choose to upload a photo, a reference to that photo. The app requests basic sign-in information from Google.</p>
      <h2>Storage and access</h2>
      <p>Supabase stores account and profile records. Uploaded photos are kept in private file storage, and the app displays them through temporary links. Profile access is restricted to the signed-in owner. Authorized app operators can maintain account records.</p>
      <p>Vercel hosts the app. Requests and technical logs are processed to serve the application. Session cookies keep you signed in. The app does not include advertising trackers or a feature that sells your profile information.</p>
      <h2>Your choices</h2>
      <p>You can change your names and replace your photo in Profile, or sign out to end the session in this browser. Uploading a photo is optional.</p>
      <p>For questions or to request deletion of your account and uploaded photo, contact <a href="mailto:realtristanrai@gmail.com">realtristanrai@gmail.com</a>.</p>
    </PublicInfo>
  );
}
