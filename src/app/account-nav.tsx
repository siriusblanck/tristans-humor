import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import SignInButton from "@/app/sign-in-button";

export default function AccountNav({ current, signedIn = true, onboarding = false, dateline, authError }: {
  current: "front" | "profile";
  signedIn?: boolean;
  onboarding?: boolean;
  dateline?: string;
  authError?: string;
}) {
  return (
    <header className="account-nav">
      <Link className="account-wordmark" href={onboarding ? "/profile" : "/"}>Humour me<span>...</span></Link>
      {dateline && <p className="account-dateline">{dateline}</p>}
      <nav aria-label="Account">
        {signedIn ? (
          <>
            {!onboarding && <Link href="/" aria-current={current === "front" ? "page" : undefined}>Front page</Link>}
            <Link href="/profile" aria-current={current === "profile" ? "page" : undefined}>Profile</Link>
            <form action={signOut}><button className="text-button" type="submit">Sign out</button></form>
          </>
        ) : (
          <SignInButton initialError={authError} />
        )}
      </nav>
    </header>
  );
}
