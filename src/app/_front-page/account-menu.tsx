"use client";

import Link from "next/link";
import type { RefObject, ToggleEvent } from "react";
import { signOut } from "@/app/auth/actions";
import Portrait from "./portrait";
import type { Viewer } from "./types";
import controls from "./controls.module.css";

/** Signed out: a "Sign in" button. Signed in: your photo, ringed in your house colour, opening a small menu. */
export default function AccountMenu({ viewer, photoUrl, avatarRef, onSignIn, onProfile }: {
  viewer: Viewer;
  photoUrl: string | null;
  avatarRef: RefObject<HTMLButtonElement | null>;
  onSignIn: () => void;
  onProfile: () => void;
}) {
  if (!viewer.signedIn) {
    return <button type="button" className={controls.ghost} onClick={onSignIn}>Sign in</button>;
  }

  // The menu lives in the top layer; place it under the avatar as it opens.
  function place(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== "open" || !avatarRef.current) return;
    const box = avatarRef.current.getBoundingClientRect();
    event.currentTarget.style.top = `${box.bottom + 10}px`;
    event.currentTarget.style.right = `${Math.max(12, window.innerWidth - box.right)}px`;
  }

  return (
    <>
      <button
        ref={avatarRef}
        type="button"
        className={controls.avatar}
        data-house={viewer.house}
        popoverTarget="account-menu"
        aria-label={`${viewer.firstName}’s account`}
      >
        <Portrait className={controls.avatarFace} photoUrl={photoUrl} initial={viewer.initial} />
      </button>
      <div id="account-menu" popover="auto" className={controls.menu} onBeforeToggle={place}>
        <button
          type="button"
          onClick={(event) => {
            event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();
            onProfile();
          }}
        >
          Profile
        </button>
        <form action={signOut}><button type="submit">Sign out</button></form>
        <hr />
        <Link className={controls.fine} href="/privacy">Privacy</Link>
        <Link className={controls.fine} href="/terms">Terms</Link>
      </div>
    </>
  );
}
