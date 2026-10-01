"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignInScreen({ message }: { message?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(message);

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
    <main className="sign-in-screen">
      <h1 className="landing-wordmark" aria-label="Humour me...">
        <span>Humour</span>{" "}<span>me<span className="landing-ellipsis">...</span></span>
      </h1>

      <div className="sign-in-corner">
        <button
          className="sign-in-link"
          type="button"
          onClick={signIn}
          disabled={pending}
          aria-label="Signing in with Google"
          aria-describedby={error ? "sign-in-error" : undefined}
          aria-busy={pending}
        >
          Signing in
        </button>
        {pending && <p className="sign-in-status" role="status">Opening Google...</p>}
        {error && <p className="sign-in-error" id="sign-in-error" role="alert">{error}</p>}
      </div>
    </main>
  );
}
