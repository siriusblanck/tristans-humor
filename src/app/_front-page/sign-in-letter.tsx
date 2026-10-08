"use client";

import { useEffect, useRef } from "react";
import SignInButton from "@/app/sign-in-button";
import { GoogleIcon, Seal } from "./art";
import { EASE, play } from "./motion";
import { RETURN_KEY, type SignInReason } from "./types";
import controls from "./controls.module.css";
import styles from "./overlays.module.css";

const COPY: Record<SignInReason, { title: string; body: string }> = {
  vote: { title: "Sign in to award points", body: "Points go to the writer’s house." },
  owl: { title: "Sign in to send an owl", body: "You can send three a day." },
  signin: { title: "Sign in", body: "Vote on owls and send your own." },
};

/**
 * The sign-in letter rises from below with its seal stamping on. It remembers which owl you
 * were looking at, so you land back on it after Google.
 */
export default function SignInLetter({ reason, owlId, onClose }: {
  reason: SignInReason | null;
  owlId: string | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const copy = COPY[reason ?? "signin"];

  useEffect(() => {
    const element = dialog.current;
    if (reason && element && !element.open) {
      closing.current = false;
      element.showModal();
    }
  }, [reason]);

  async function close() {
    const element = dialog.current;
    if (!element?.open || closing.current) return;
    closing.current = true;
    const letter = element.firstElementChild;
    await play(letter, [{ transform: "none", opacity: 1 }, { transform: "translateY(120px) scale(.9)", opacity: 0 }], 260, EASE.in);
    element.close();
    letter?.getAnimations().forEach((animation) => animation.cancel());
  }

  function remember() {
    try {
      sessionStorage.setItem(RETURN_KEY, JSON.stringify({ owlId, reason }));
    } catch {
      // Without storage the visitor simply returns to the first owl.
    }
  }

  return (
    <dialog
      ref={dialog}
      className={styles.letterDialog}
      aria-labelledby="sign-in-title"
      onCancel={(event) => {
        event.preventDefault();
        void close();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) void close();
      }}
    >
      <div className={styles.letter}>
        <Seal className={styles.letterSeal} />
        <h2 id="sign-in-title" className={styles.letterTitle}>{copy.title}</h2>
        <p className={styles.letterSub}>{copy.body}</p>
        <div className={styles.letterActions}>
          <SignInButton className={controls.googleButton} icon={<GoogleIcon />} label="Sign in with Google" onStart={remember} />
          <button type="button" className={`${controls.ghost} ${controls.onPaper}`} onClick={() => void close()}>Not now</button>
        </div>
      </div>
    </dialog>
  );
}
