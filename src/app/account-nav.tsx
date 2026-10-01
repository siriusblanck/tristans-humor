import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export default function AccountNav({ current, onboarding = false }: {
  current: "gallery" | "profile";
  onboarding?: boolean;
}) {
  return (
    <header className="account-nav">
      <Link className="account-wordmark" href={onboarding ? "/profile" : "/gallery"}>Humour me<span>...</span></Link>
      <nav aria-label="Account">
        {!onboarding && <Link href="/gallery" aria-current={current === "gallery" ? "page" : undefined}>Gallery</Link>}
        <Link href="/profile" aria-current={current === "profile" ? "page" : undefined}>Profile</Link>
        <form action={signOut}><button className="text-button" type="submit">Sign out</button></form>
      </nav>
    </header>
  );
}
