"use client";

import Link from "next/link";

export default function ErrorScreen({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="error-screen">
      <p className="eyebrow">Hog Wumbia</p>
      <h1>A little hiccup.</h1>
      <p>We couldn&apos;t load this page. Give it another go.</p>
      <div><button className="text-button" onClick={reset}>Try again</button><Link href="/">Back to start</Link></div>
    </main>
  );
}
