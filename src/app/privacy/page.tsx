import type { Metadata } from "next";
import PublicInfo from "@/app/public-info";

export const metadata: Metadata = { title: "Privacy · Hog Wumbia" };

export default function PrivacyPage() {
  return (
    <PublicInfo title="Your profile. Your privacy.">
      <p>Hog Wumbia is an educational project: a weekly Owl Post where signed-in readers ask a wizarding-world character to caption a New York moment, and everyone votes on the results.</p>
      <h2>Information used by the app</h2>
      <p>When you sign in, Google provides your account identifier, email address, and basic profile information to our authentication service, Supabase. This may include your Google display name and profile photo URL. We use this information to identify your account and maintain your sign-in session.</p>
      <p>Your profile stores the first and last names you enter, the house you choose and, if you choose to upload a photo, a reference to that photo.</p>
      <h2>What other people can see</h2>
      <p>Owls you send are public, including to visitors who are not signed in. Each one shows the caption, the generated picture, the character, your first name with your last initial, and your house. Your email address, full last name, profile photo, and the twist you typed are not shown to other people.</p>
      <p>Your votes are private. Other people see only each post&apos;s point total.</p>
      <h2>AI generation</h2>
      <p>When you send an owl, the week&apos;s prompt, the character you picked, and your optional twist are sent to Google&apos;s Gemini API to write the caption and draw the picture. The app uses Gemini&apos;s paid tier, so Google doesn&apos;t use these requests to improve its products. Even so, please don&apos;t put personal information in a twist. Generated pictures carry Google&apos;s SynthID watermark. We store the caption, the picture, and the exact prompts used to create them.</p>
      <h2>Storage and access</h2>
      <p>Supabase stores account, profile, post, and vote records. Profile photos are kept in private file storage and shown through temporary links; generated pictures are stored publicly so the feed can display them. Profile access is restricted to the signed-in owner. Authorized app operators can maintain these records.</p>
      <p>Vercel hosts the app. Requests and technical logs are processed to serve the application. Session cookies keep you signed in. The app does not include advertising trackers or a feature that sells your information.</p>
      <h2>Your choices</h2>
      <p>You can change your names, house, and photo in Profile, remove a vote by selecting it again, or sign out to end the session in this browser. Uploading a photo and adding a twist are optional.</p>
      <p>For questions or to request deletion of your account, posts, and uploaded photo, contact <a href="mailto:realtristanrai@gmail.com">realtristanrai@gmail.com</a>.</p>
    </PublicInfo>
  );
}
