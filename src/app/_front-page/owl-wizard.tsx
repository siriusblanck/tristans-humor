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

/** Centre each row independently, including a partially filled last row. */
function column(index: number, count: number, columns: number) {
  const start = Math.floor(index / columns) * columns;
  return index - start - (Math.min(columns, count - start) - 1) / 2;
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
  const root = useRef<HTMLElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const carrier = useRef<HTMLDivElement>(null);
  const carrying = useRef<Promise<void>>(Promise.resolve());
  const handled = useRef<ComposerState>(state);
  const leaving = useRef(false);
  const pickedFrom = useRef<string | null>(null);
  const pickerScroll = useRef(0);
  const entrance = useRef<Animation[]>([]);

  // Open: the page blurs and the cast fans up out of the send button.
  useLayoutEffect(() => {
    let active = true;
    const cover = veil.current;
    const scene = sceneRef.current;
    if (!isDesktop() && scene) {
      const chip = scene.querySelector('[data-reveal="chip"]');
      if (chip && root.current) root.current.style.setProperty("--wizard-top", `${chip.getBoundingClientRect().bottom + 12}px`);
    }
    void play(cover, [{ opacity: 0 }, { opacity: 1 }], 380, EASE.out, { fill: "none" });
    const from = isDesktop() ? "translate(470px, 330px) rotate(28deg) scale(.3)" : "translate(0px, 520px) rotate(12deg) scale(.4)";
    const reduced = prefersReducedMotion();
    const animations = cards.current.flatMap((card, index) => {
      if (!card) return [];
      // Use the resting layout, never a sampled in-flight matrix. Strict Mode replays
      // this effect; sampling the first entrance made the replay hold and then snap.
      const rowIndex = index < 6 ? index : index - 6;
      return [card.animate([
        { transform: from, opacity: 0 },
        { transform: "translate(var(--x), var(--y)) rotate(var(--r)) scale(1)", opacity: 1 },
      ], { duration: reduced ? 1 : 560, easing: EASE.settle, delay: reduced ? 0 : rowIndex * 45, fill: "backwards" })];
    });
    entrance.current = animations;
    void Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(() => {
      if (!active || entrance.current !== animations) return;
      entrance.current = [];
      if (!leaving.current) cards.current[0]?.focus({ preventScroll: true });
    });
    document.body.style.setProperty("overflow", "hidden");
    return () => {
      active = false;
      animations.forEach((animation) => animation.cancel());
      if (entrance.current === animations) entrance.current = [];
      clearScripted(cover);
      document.body.style.removeProperty("overflow");
    };
  }, [sceneRef, writers.length]);

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
    const frame = root.current;
    const card = cards.current[index];
    pickerScroll.current = frame?.scrollTop ?? 0;
    // Preserve the visible pose if selected during unfolding or from a scrolled row.
    if (frame && card && (entrance.current.length > 0 || frame.scrollTop > 0)) {
      const start = new DOMMatrix(getComputedStyle(card).transform);
      start.m42 -= frame.scrollTop;
      pickedFrom.current = start.toString();
      frame.scrollTop = 0;
    }
    const opening = entrance.current;
    entrance.current = [];
    opening.forEach((animation) => animation.cancel());
    setChosen(index);
    setStage("twist");
  }

  useLayoutEffect(() => {
    if (stage !== "twist" || chosen === null || !pickedFrom.current) return;
    const from = pickedFrom.current;
    pickedFrom.current = null;
    void play(cards.current[chosen], [
      { transform: from },
      { transform: "translate(var(--cx), var(--cy)) scale(var(--cs))" },
    ], 540, EASE.flight, { fill: "none" });
  }, [chosen, stage]);

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
    requestAnimationFrame(() => {
      // Restore the row that held focus before the chosen card moved to the form.
      // scrollIntoView here would measure the card midway through its return animation.
      if (!isDesktop() && root.current) root.current.scrollTop = pickerScroll.current;
      cards.current[chosen ?? 0]?.focus({ preventScroll: true });
    });
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
      <section ref={root} className={styles.wizard} data-stage={stage} role="dialog" aria-modal="true" aria-labelledby="wizard-title" aria-busy={pending}>
        <h2 id="wizard-title" className={styles.title} data-hidden={stage !== "pick"}>Who’s writing?</h2>
        {stage !== "flight" && (
          <button type="button" className={`${controls.iconButton} ${styles.close}`} aria-label="Close" onClick={() => void close(onClose)}>
            <CloseIcon />
          </button>
        )}

        <div className={styles.cast} role="group" aria-labelledby="wizard-title" style={{ "--compact-rows": Math.ceil(writers.length / 3) } as CSSProperties}>
          {writers.map((option, index) => {
            // Keep the original six above the expanded cast, with exactly two fans.
            const fanRow = index < 6 ? 0 : 1;
            const rowCount = fanRow === 0 ? Math.min(6, writers.length) : writers.length - 6;
            const fanColumn = index - fanRow * 6 - (rowCount - 1) / 2;
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
                  "--fan-x": `${fanColumn * 112}px`,
                  "--fan-y": `${fanRow * 234 + fanColumn * fanColumn * 5}px`,
                  "--fan-r": `${fanColumn * 4}deg`,
                  "--compact-column": column(index, writers.length, 3),
                  "--compact-row": Math.floor(index / 3),
                  "--h": option.hue,
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
