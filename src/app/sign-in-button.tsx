"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignInButton({ label = "Sign in", className = "text-button", initialError }: {
  label?: string;
  className?: string;
  initialError?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);

  async function signIn() {
    if (pending) return;
    setPending(true);
    setError(undefined);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setError("We couldn't start sign-in. Please try again.");
      setPending(false);
    }
  }

  return (
    <>
      <button className={className} type="button" onClick={signIn} disabled={pending} aria-busy={pending}>
        {pending ? "Opening Google..." : label}
      </button>
      {error && <span className="sign-in-error" role="alert">{error}</span>}
    </>
  );
}
