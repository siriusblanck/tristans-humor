"use client";

import Image from "next/image";
import { useActionState, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from "react";
import { TWIST_MAX_LENGTH, type ComposerState } from "@/lib/owl-post/inputs";
import { submitGeneration } from "./actions";
import { CloseIcon, OwlArt, Seal } from "./art";
import { EASE, boxIn, clearScripted, isDesktop, play, prefersReducedMotion, sceneScale } from "./motion";
import type { Writer } from "./types";
import controls from "./controls.module.css";
import styles from "./wizard.module.css";

type Stage = "pick" | "twist" | "flight";

type Deck = { spacing: number; drop: number; tilt: number };

const DESKTOP_DECK: Deck = { spacing: 112, drop: 7, tilt: 7 };
const COMPACT_CARD = { width: 96, height: 134 };
const COMPACT_TILT = 4.5;

/** The fan's spread. On phones it narrows until the outer cards, tilted, still fit the screen. */
function deckGeometry(count: number): Deck {
  if (isDesktop()) return DESKTOP_DECK;
  const half = (count - 1) / 2;
  const swing = COMPACT_CARD.height * Math.sin((half * COMPACT_TILT * Math.PI) / 180);
  const spacing = (window.innerWidth - 24 - COMPACT_CARD.width - 2 * swing) / (count - 1);
  return { spacing: Math.min(112, Math.max(24, spacing)), drop: 3, tilt: COMPACT_TILT };
}

/** Where each of the seven writers sits in the fan. */
function pose(index: number, count: number, deck: Deck) {
  const offset = index - (count - 1) / 2;
  return { x: offset * deck.spacing, y: offset * offset * deck.drop, r: offset * deck.tilt };
}

/**
 * "Send in your owl": the page blurs behind the prompt bar, the cast fans up out of the
 * button, the chosen writer takes the centre with the twist box beside it, and an owl
 * carries the letter off until the server has the caption and picture (10–60 s).
 */
export default function OwlWizard({ writers, remaining, sceneRef, onClose, onLanded }: {
  writers: Writer[];
  remaining: number;
  sceneRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onLanded: (generationId: string) => void;
}) {
  const [state, formAction, pending] = useActionState<ComposerState, FormData>(submitGeneration, {});
  const [stage, setStage] = useState<Stage>("pick");
  const [chosen, setChosen] = useState<number | null>(null);
  const [twist, setTwist] = useState("");
  const [carried, setCarried] = useState(false);
  // The wizard only mounts in the browser (after a click), so it can measure the window here.
  const [deck] = useState(() => deckGeometry(writers.length));
  const root = useRef<HTMLElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const carrier = useRef<HTMLDivElement>(null);
  const carrying = useRef<Promise<void>>(Promise.resolve());
  const handled = useRef<ComposerState>(state);
  const leaving = useRef(false);

  // Open: the page blurs and the cast fans up out of the send button.
  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!isDesktop() && scene) {
      const chip = scene.querySelector('[data-reveal="chip"]');
      if (chip && root.current) root.current.style.setProperty("--wizard-top", `${chip.getBoundingClientRect().bottom + 12}px`);
    }
    void play(veil.current, [{ opacity: 0 }, { opacity: 1 }], 380, EASE.out, { fill: "none" });
    const from = isDesktop() ? "translate(470px, 330px) rotate(28deg) scale(.3)" : "translate(0px, 520px) rotate(12deg) scale(.4)";
    void Promise.all(cards.current.map((card, index) => {
      if (!card) return undefined;
      const { x, y, r } = pose(index, writers.length, deck);
      return play(card, [{ transform: from, opacity: 0 }, { transform: `translate(${x}px, ${y}px) rotate(${r}deg)`, opacity: 1 }], 560, EASE.settle, { delay: index * 45, fill: "backwards" });
    })).then(() => cards.current[0]?.focus({ preventScroll: true }));
    document.body.style.setProperty("overflow", "hidden");
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [deck, sceneRef, writers.length]);

  async function close(after: () => void) {
    if (leaving.current) return;
    leaving.current = true;
    await Promise.all([
      play(root.current, [{ opacity: 1 }, { opacity: 0 }], 220, EASE.out),
      play(veil.current, [{ opacity: 1 }, { opacity: 0 }], 320, EASE.out),
    ]);
    after();
  }

  function pick(index: number) {
    if (stage !== "pick") return;
    setChosen(index);
    setStage("twist");
  }

  // The twist box slides in once the chosen card has taken the centre.
  useEffect(() => {
    if (stage !== "twist") return;
    const form = textarea.current?.form;
    void play(form, [{ opacity: 0, transform: "translateX(28px)" }, { opacity: 1, transform: "none" }], 380, EASE.out, { delay: 200, fill: "backwards" })
      .then(() => textarea.current?.focus({ preventScroll: true }));
  }, [stage]);

  function pickAgain() {
    setChosen(null);
    setStage("pick");
    requestAnimationFrame(() => cards.current[chosen ?? 0]?.focus({ preventScroll: true }));
  }

  // Sending: the owl swoops in, takes the card, and flies off with it.
  function send(event: FormEvent<HTMLFormElement>) {
    if (chosen === null || pending) {
      event.preventDefault();
      return;
    }
    setStage("flight");
    setCarried(false);
    const card = cards.current[chosen];
    const frame = root.current;
    const owl = carrier.current;
    carrying.current = (async () => {
      if (!card || !frame || !owl || prefersReducedMotion()) return;
      const scale = sceneRef.current ? sceneScale(sceneRef.current) : 1;
      const box = boxIn(card, frame, scale);
      const width = frame.getBoundingClientRect().width / scale;
      const perch = { x: box.cx - 55, y: box.top - 60 };
      const away = { x: -(box.cx + 320), y: -(box.top + 420) };
      owl.hidden = false;
      await play(owl, [{ transform: `translate(${width + 50}px, -40px) rotate(-12deg)` }, { transform: `translate(${perch.x}px, ${perch.y}px)` }], 700, EASE.flight);
      const resting = getComputedStyle(card).transform;
      void play(owl, [{ transform: `translate(${perch.x}px, ${perch.y}px)` }, { transform: `translate(${perch.x + away.x}px, ${perch.y + away.y}px) rotate(-10deg)` }], 900, EASE.in);
      await play(card, [{ transform: resting }, { transform: `translate(${away.x}px, ${away.y}px) scale(.45) rotate(-12deg)`, opacity: 1 }], 900, EASE.in);
      owl.hidden = true;
    })().finally(() => setCarried(true));
  }

  // The server answered: land the owl on the stack, or bring the letter back with the reason.
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    void carrying.current.then(() => {
      if (state.generationId) {
        void close(() => onLanded(state.generationId!));
        return;
      }
      clearScripted(root.current);
      if (carrier.current) carrier.current.hidden = true;
      setStage("twist");
    });
    // close/onLanded are stable for the wizard's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape" && stage !== "flight") void close(onClose);
  });

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const writer = chosen === null ? null : writers[chosen];
  const fieldError = state.fields?.twist ?? state.fields?.character_id;
  const showError = stage === "twist" && (fieldError ?? state.error);

  return (
    <>
      <div ref={veil} className={styles.veil} aria-hidden="true" />
      <section ref={root} className={styles.wizard} role="dialog" aria-modal="true" aria-labelledby="wizard-title" aria-busy={pending}>
        <h2 id="wizard-title" className={styles.title} data-hidden={stage !== "pick"}>Who’s writing?</h2>
        {stage !== "flight" && (
          <button type="button" className={`${controls.iconButton} ${styles.close}`} aria-label="Close" onClick={() => void close(onClose)}>
            <CloseIcon />
          </button>
        )}

        <div role="group" aria-labelledby="wizard-title">
          {writers.map((option, index) => {
            const { x, y, r } = pose(index, writers.length, deck);
            const cardState = chosen === null ? undefined : chosen === index ? "chosen" : "gone";
            return (
              <button
                key={option.id}
                ref={(element) => { cards.current[index] = element; }}
                type="button"
                aria-pressed={chosen === index}
                className={styles.writer}
                data-state={cardState}
                disabled={stage !== "pick" && chosen !== index}
                tabIndex={stage === "pick" ? 0 : -1}
                onClick={() => pick(index)}
                style={{
                  "--x": `${x}px`, "--y": `${y}px`, "--r": `${r}deg`, "--h": option.hue,
                  "--spin": `${(index - (chosen ?? index)) * 9}deg`,
                  "--delay": `${Math.abs(index - (chosen ?? index)) * 30}ms`,
                } as CSSProperties}
              >
                <span className={styles.portrait} aria-hidden="true">
                  {option.imageUrl && <Image src={option.imageUrl} alt="" fill sizes="192px" unoptimized />}
                </span>
                <span className={styles.name}>{option.name}</span>
              </button>
            );
          })}
        </div>

        <form className={styles.twist} action={formAction} onSubmit={send} hidden={stage !== "twist"}>
          <input type="hidden" name="character_id" value={writer?.id ?? ""} />
          <label htmlFor="twist">Add a twist</label>
          <textarea
            ref={textarea}
            id="twist"
            name="twist"
            value={twist}
            maxLength={TWIST_MAX_LENGTH}
            placeholder="my RA is third in line"
            onChange={(event) => setTwist(event.target.value)}
            aria-describedby="twist-count owls-left"
            aria-invalid={Boolean(state.fields?.twist)}
          />
          <div className={styles.twistRow}>
            <span id="twist-count">Optional · <span className={styles.count}>{twist.length}</span> / {TWIST_MAX_LENGTH}</span>
            <span id="owls-left">{remaining} {remaining === 1 ? "owl" : "owls"} left today</span>
          </div>
          {showError && <p className={styles.error} role="alert">{fieldError ?? state.error}</p>}
          <div className={styles.actions}>
            <button type="submit" className={`${controls.sealButton} ${controls.compact}`} aria-busy={pending}>
              <Seal />
              {pending ? "Sending…" : "Send owl"}
            </button>
            <button type="button" className={controls.ghost} onClick={pickAgain}>Pick someone else</button>
          </div>
        </form>

        {stage === "flight" && carried && (
          <>
            <div className={styles.orbit} aria-hidden="true"><OwlArt /></div>
            <div className={styles.flight} role="status">
              <p className={styles.flightTitle}>{writer?.name ?? "Your writer"} is writing…</p>
              <p className={styles.flightHint}>Owls take up to a minute.</p>
            </div>
          </>
        )}
        <div ref={carrier} className={styles.carrier} hidden aria-hidden="true"><OwlArt /></div>
      </section>
    </>
  );
}
