import Link from "next/link";
import type { ReactNode } from "react";

export default function PublicInfo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <header className="account-nav">
        <Link className="account-wordmark" href="/">Hog Wumbia</Link>
        <Link href="/">Sign in</Link>
      </header>
      <main className="public-info">
        <p className="eyebrow">Hog Wumbia · Updated October 8, 2026</p>
        <h1>{title}</h1>
        {children}
        <nav aria-label="App information">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </main>
    </>
  );
}
