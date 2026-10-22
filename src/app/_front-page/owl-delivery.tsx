"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import { OwlArt, Seal } from "./art";
import { deliveryKey } from "./boot-script";
import { dealInPage, deliverLetter, makeTiming, type DeliveryParts } from "./delivery-choreography";
import { clearScripted, finishScripted } from "./motion";
import type { Prompt } from "./types";
import controls from "./controls.module.css";
import styles from "./overlays.module.css";
import WelcomeStory, { playWelcome, WELCOME_KEY } from "./welcome-story";
import welcomeStyles from "./welcome.module.css";

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
export default function OwlDelivery({ weekKey, prompt, weekLabel, replay, welcomeReplay, sceneRef }: {
  weekKey: string;
  prompt: Prompt | null;
  weekLabel: string;
  /** Increases each time the prompt bar asks to see the letter again. */
  replay: number;
  welcomeReplay: number;
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
  const welcome = useRef<HTMLDivElement>(null);
  const storyControls = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const [pauseLabel, setPauseLabel] = useState("Pause");

  const release = useCallback(() => waiters.current.splice(0).forEach((resolve) => resolve()), []);

  const skip = useCallback(() => {
    skipping.current = true;
    release();
    finishScripted(sceneRef.current);
  }, [release, sceneRef]);

  const run = useCallback(async (withWelcome = false) => {
    const scene = sceneRef.current;
    if (playing.current || !scene) return;
    playing.current = true;
    skipping.current = false;
    paused.current = false;
    setPauseLabel("Pause");
    if (welcome.current) welcome.current.dataset.paused = "false";
    const html = document.documentElement;
    html.dataset.intro = "play";
    const parts: DeliveryParts = {
      courier: courier.current, owl: owl.current, envelope: envelope.current, flap: flap.current,
      envelopeSeal: envelopeSeal.current, hero: hero.current, skipButton: skipButton.current,
    };
    if (courier.current) courier.current.style.visibility = withWelcome ? "hidden" : "";
    const timing = makeTiming(() => skipping.current, waiters.current);
    const background = Array.from(scene.children).filter((element): element is HTMLElement => element instanceof HTMLElement && !element.contains(skipButton.current));
    const previousInert = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    try {
      skipButton.current?.focus({ preventScroll: true });
      if (withWelcome) {
        if (storyControls.current) storyControls.current.hidden = false;
        await playWelcome(welcome.current, timing, () => paused.current, () => skipping.current);
        if (storyControls.current) storyControls.current.hidden = true;
        try { localStorage.setItem(WELCOME_KEY, "1"); } catch { /* Storage is optional. */ }
      }
      if (courier.current) courier.current.style.visibility = "";
      if (hero.current) hero.current.setAttribute("aria-hidden", "false");
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
      background.forEach((element,index) => { element.inert = previousInert[index]; });
      hero.current?.setAttribute("aria-hidden", "true");
      if (storyControls.current) storyControls.current.hidden = true;
      playing.current = false;
      skipping.current = false;
      scene.querySelector<HTMLButtonElement>("[data-reveal='fab']")?.focus({ preventScroll: true });
    }
  }, [sceneRef, weekKey]);

  // First visit this week: the boot script has already asked for the delivery. In-app
  // navigations skip the boot script, so check here too.
  useEffect(() => {
    window.__hwIntro = true;
    let needsWelcome = false;
    try { needsWelcome = !localStorage.getItem(WELCOME_KEY); } catch { /* Keep the page usable without storage. */ }
    if (document.documentElement.dataset.intro === "play" || !deliveredAlready(weekKey) || needsWelcome) void run(needsWelcome);
  }, [run, weekKey]);

  useEffect(() => {
    if (replay > 0) void run();
  }, [replay, run]);

  useEffect(() => {
    if (welcomeReplay > 0) void run(true);
  }, [welcomeReplay, run]);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape" && playing.current) skip();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.intro} onClick={release} role="dialog" aria-modal="true" aria-label="Welcome to Hog Wumbia and this week’s prompt">
      <WelcomeStory rootRef={welcome}/>
      <div ref={storyControls} className={welcomeStyles.storyControls} hidden>
        <button type="button" onClick={event => { event.stopPropagation(); paused.current = !paused.current; setPauseLabel(paused.current ? "Resume" : "Pause"); if (welcome.current) welcome.current.dataset.paused = String(paused.current); if (!paused.current) release(); }}>{pauseLabel}</button>
        <button type="button" onClick={event => { event.stopPropagation(); paused.current = false; setPauseLabel("Pause"); if (welcome.current) welcome.current.dataset.paused = "false"; release(); }}>Next →</button>
      </div>
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
