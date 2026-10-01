import type { Metadata } from "next";
import PublicInfo from "@/app/public-info";

export const metadata: Metadata = { title: "Terms · Humour me" };

export default function TermsPage() {
  return (
    <PublicInfo title="A little humour. A few terms.">
      <p>Humour me is a free educational project: an animated gallery with Google sign-in and a personal profile.</p>
      <h2>Using your account</h2>
      <p>Sign in with your own Google account. Upload only photos you have permission to use, and avoid uploading private information about other people.</p>
      <h2>Using the app</h2>
      <p>Use the gallery for personal enjoyment. Do not attempt to access another person’s profile, interfere with sign-in, or disrupt the application. Displayed characters and images remain the property of their respective owners.</p>
      <h2>An app in development</h2>
      <p>The app may change or become unavailable while the project is developed. There is no charge to sign in or use the gallery.</p>
      <p>For questions, contact <a href="mailto:realtristanrai@gmail.com">realtristanrai@gmail.com</a>. The privacy page explains how account and profile information is used.</p>
    </PublicInfo>
  );
}
