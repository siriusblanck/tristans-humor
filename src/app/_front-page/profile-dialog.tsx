"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import ProfileSheet from "@/app/profile/profile-sheet";
import type { ProfileDetails } from "@/app/profile/types";
import { EASE, play, prefersReducedMotion, stageScale } from "./motion";
import controls from "./controls.module.css";
import styles from "@/app/profile/profile.module.css";

/** Where `element` would have to stand, in its own (zoomed) pixels, to sit exactly on `target`. */
function onto(element: Element, target: Element) {
  const from = element.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const zoom = stageScale();
  const dx = (to.left + to.width / 2 - (from.left + from.width / 2)) / zoom;
  const dy = (to.top + to.height / 2 - (from.top + from.height / 2)) / zoom;
  return `translate(${dx}px, ${dy}px) scale(${to.width / from.width})`;
}

/**
 * The profile sheet, opened from the avatar: your photo lifts out of the corner and settles
 * into the middle of the sheet while the rest rises in. Closing (or saving) flies it back.
 */
export default function ProfileDialog({ details, originRef, onClosed }: {
  details: ProfileDetails;
  originRef: RefObject<HTMLElement | null>;
  onClosed: (saved: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const photo = useRef<HTMLLabelElement>(null);
  const closing = useRef(false);
  const saved = useRef(false);

  useLayoutEffect(() => {
    const element = dialog.current;
    const origin = originRef.current;
    if (!element || element.open) return;
    element.showModal();
    element.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    if (!origin || !photo.current || prefersReducedMotion()) return;
    origin.style.visibility = "hidden";
    void play(photo.current, [
      { transform: onto(photo.current, origin) },
      { transform: "translateY(-8px) scale(1.04)", offset: 0.78 },
      { transform: "none" },
    ], 640, EASE.flight, { fill: "none" }).then(() => { origin.style.visibility = ""; });
  }, [originRef]);

  async function close(withSave = false) {
    const element = dialog.current;
    if (!element?.open || closing.current) return;
    closing.current = true;
    saved.current = withSave;
    element.dataset.closing = "";
    const origin = originRef.current;
    const rising = [...element.querySelectorAll("[data-rise]")];
    const fades = rising.map((item) => play(item, [{ opacity: 1 }, { opacity: 0, transform: "translateY(10px)" }], 140, EASE.out));
    if (origin && photo.current) {
      origin.style.visibility = "hidden";
      await Promise.all([...fades, play(photo.current, [{ transform: "none" }, { transform: onto(photo.current, origin) }], 460, EASE.flight)]);
    } else {
      await Promise.all(fades);
    }
    element.close();
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="profile-title"
      onCancel={(event) => {
        event.preventDefault();
        void close();
      }}
      onClose={() => {
        if (originRef.current) {
          originRef.current.style.visibility = "";
          originRef.current.focus({ preventScroll: true });
        }
        onClosed(saved.current);
      }}
    >
      <ProfileSheet
        details={details}
        step="edit"
        photoRef={photo}
        onSaved={() => void close(true)}
        close={(
          <button type="button" className={controls.iconButton} aria-label="Close your profile" data-autofocus onClick={() => void close()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      />
    </dialog>
  );
}
