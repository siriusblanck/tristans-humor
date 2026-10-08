"use client";

import { useCallback, useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { OwlArt, Seal } from "./art";
import { deliveryKey } from "./boot-script";
import { dealInPage, deliverLetter, makeTiming, type DeliveryParts } from "./delivery-choreography";
import { clearScripted, finishScripted } from "./motion";
import type { Prompt } from "./types";
import controls from "./controls.module.css";
import styles from "./overlays.module.css";

declare global {
  interface Window { __hwIntro?: boolean }
}

const READING_MS = 1700;

function rememberDelivered(weekKey: string) {
  try {
    localStorage.setItem(deliveryKey(weekKey), "1");
  } catch {
    // Without storage the delivery simply plays again next visit.
  }
}

function deliveredAlready(weekKey: string) {
  try {
    return Boolean(localStorage.getItem(deliveryKey(weekKey)));
  } catch {
    return true; // blocked storage: don't replay the delivery on every visit
  }
}

/**
 * Once a week an owl swoops over Low Library and drops this week's letter: the seal pops,
 * the flap opens, the letter rises, then flies up into the prompt bar while the cards deal
 * in, the sand fills, and the send button stamps on. Skippable; reduced motion just fades.
 */
export default function OwlDelivery({ weekKey, prompt, weekLabel, replay, sceneRef }: {
  weekKey: string;
  prompt: Prompt | null;
  weekLabel: string;
  /** Increases each time the prompt bar asks to see the letter again. */
  replay: number;
  sceneRef: RefObject<HTMLElement | null>;
}) {
  const courier = useRef<HTMLDivElement>(null);
  const owl = useRef<HTMLDivElement>(null);
  const envelope = useRef<HTMLDivElement>(null);
  const flap = useRef<HTMLDivElement>(null);
  const envelopeSeal = useRef<HTMLSpanElement>(null);
  const hero = useRef<HTMLElement>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
  const playing = useRef(false);
  const skipping = useRef(false);
  const waiters = useRef<Array<() => void>>([]);

  const release = useCallback(() => waiters.current.splice(0).forEach((resolve) => resolve()), []);

  const skip = useCallback(() => {
    skipping.current = true;
    release();
    finishScripted(sceneRef.current);
  }, [release, sceneRef]);

  const run = useCallback(async () => {
    const scene = sceneRef.current;
    if (playing.current || !scene) return;
    playing.current = true;
    skipping.current = false;
    const html = document.documentElement;
    html.dataset.intro = "play";
    const parts: DeliveryParts = {
      courier: courier.current, owl: owl.current, envelope: envelope.current, flap: flap.current,
      envelopeSeal: envelopeSeal.current, hero: hero.current, skipButton: skipButton.current,
    };
    const timing = makeTiming(() => skipping.current, waiters.current);
    try {
      skipButton.current?.focus({ preventScroll: true });
      await deliverLetter(parts, timing);
      await timing.wait(READING_MS);
      rememberDelivered(weekKey);
      const rail = dealInPage(scene, parts, timing);
      html.dataset.intro = "dock"; // the page shows again; the overlay stays for the letter's flight
      if (rail) {
        rail.getBoundingClientRect(); // let the empty glasses render before the sand pours in
        delete rail.dataset.fill;
      }
      await timing.wait(timing.reduce ? 300 : 1700);
    } finally {
      // Whatever happens, the page comes back.
      delete html.dataset.intro;
      clearScripted(scene);
      playing.current = false;
      skipping.current = false;
    }
  }, [sceneRef, weekKey]);

  // First visit this week: the boot script has already asked for the delivery. In-app
  // navigations skip the boot script, so check here too.
  useEffect(() => {
    window.__hwIntro = true;
    if (document.documentElement.dataset.intro === "play" || !deliveredAlready(weekKey)) void run();
  }, [run, weekKey]);

  useEffect(() => {
    if (replay > 0) void run();
  }, [replay, run]);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape" && playing.current) skip();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.intro} onClick={release}>
      <div ref={courier} className={styles.courier} aria-hidden="true">
        <div ref={owl} className={styles.courierOwl}><OwlArt /></div>
        <div ref={envelope} className={styles.envelope}>
          <div className={styles.envelopeBack} />
          <div ref={flap} className={styles.envelopeFlap} />
          <div className={styles.envelopeFront} />
          <span ref={envelopeSeal} className={styles.envelopeSeal}><Seal size={40} /></span>
        </div>
      </div>
      <article ref={hero} className={styles.hero} aria-hidden="true">
        <p className={styles.heroHead}>{prompt?.headline ?? "This week’s owl is still in the air."}</p>
        {prompt && <p className={styles.heroScene}>{prompt.scene}</p>}
        <span className={styles.heroSub}>This week · {weekLabel}</span>
      </article>
      <button
        ref={skipButton}
        type="button"
        className={`${controls.ghost} ${styles.skip}`}
        onClick={(event) => {
          event.stopPropagation();
          skip();
        }}
      >
        Skip
      </button>
    </div>
  );
}
