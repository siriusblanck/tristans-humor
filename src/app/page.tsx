import { redirect } from "next/navigation";
import { getAccount, getProfile } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile";
import SignInScreen from "./sign-in-screen";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { supabase, user } = await getAccount();
  if (user) {
    const profile = await getProfile(supabase, user.id);
    redirect(isProfileComplete(profile) ? "/gallery" : "/profile");
  }

  const { auth } = await searchParams;
  const message = auth === "cancelled"
    ? "Sign-in was cancelled. Give it another go when you're ready."
    : auth === "error"
      ? "We couldn't finish sign-in. Please try again."
      : undefined;

  return <SignInScreen message={message} />;
}
