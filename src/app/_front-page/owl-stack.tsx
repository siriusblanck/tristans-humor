"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useRef, type PointerEvent, type RefObject } from "react";
import { stepOwl } from "@/lib/owl-post/stack";
import { ChevronIcon } from "./art";
import { EASE, clearScripted, play, prefersReducedMotion, sceneScale } from "./motion";
import OwlCard, { EmptyLetter } from "./owl-card";
import type { Owl } from "./types";
import cardStyles from "./card.module.css";
import controls from "./controls.module.css";
import styles from "./scene.module.css";

const SWIPE_DISTANCE = 80;
const BEHIND = "translateY(12px) scale(.965) rotate(1.4deg)";

type Entrance = { direction: 1 | -1; fromX: number | null } | { landing: true };

/**
 * The stack of owl letters. Swipe, the arrow keys, or ‹ › browse; the front card slides off
 * with a tilt and the next rises from the stack. Browsing never votes.
 */
export default function OwlStack({ owls, order, currentId, onNavigate, landedId, sceneRef, keyboard, inert }: {
  owls: ReadonlyMap<string, Owl>;
  order: readonly string[];
  currentId: string | null;
  onNavigate: (id: string) => void;
  /** Set once when your own owl has just landed on top of the stack. */
  landedId: string | null;
  sceneRef: RefObject<HTMLElement | null>;
  keyboard: boolean;
  inert: boolean;
}) {
  const front = useRef<HTMLElement | null>(null);
  const busy = useRef(false);
  const entrance = useRef<Entrance | null>(null);
  const landed = useRef<string | null>(null);
  const drag = useRef<{ startX: number; dx: number } | null>(null);
  const at = currentId ? order.indexOf(currentId) : -1;
  const visible = at < 0 ? [] : order.slice(at, at + 3);

  async function nudge() {
    await play(front.current, [{ transform: "none" }, { transform: "translateX(-10px)" }, { transform: "translateX(8px)" }, { transform: "none" }], 260, EASE.out);
    clearScripted(front.current);
  }

  async function go(direction: 1 | -1, fromX: number | null = null) {
    if (busy.current) return;
    const target = stepOwl(order, currentId, direction);
    const card = front.current;
    if (!target || !card) {
      card?.style.removeProperty("transform");
      return nudge();
    }
    if (prefersReducedMotion()) {
      // No motion, no waiting: every press moves straight to the next owl.
      card.style.removeProperty("transform");
      onNavigate(target);
      return;
    }
    busy.current = true;
    if (direction > 0) {
      const from = fromX === null ? "none" : `translateX(${fromX}px) rotate(${fromX / 30}deg)`;
      await play(card, [{ transform: from, opacity: 1 }, { transform: "translateX(-130%) rotate(-6deg)", opacity: 0 }], 320, EASE.in);
    }
    card.style.removeProperty("transform");
    entrance.current = { direction, fromX };
    onNavigate(target);
  }

  // The new front card arrives: from behind the stack (forward), from the left (back), or
  // dropped from above (your own owl landing).
  useLayoutEffect(() => {
    const card = front.current;
    let arriving = entrance.current;
    entrance.current = null;
    if (landedId && landedId === currentId && landed.current !== landedId) {
      landed.current = landedId;
      arriving = { landing: true };
    }
    if (!arriving) return;
    if (!card || prefersReducedMotion()) {
      busy.current = false;
      return;
    }
    busy.current = true;
    let frames: Keyframe[];
    let easing: string = EASE.out;
    let duration = 320;
    if ("landing" in arriving) {
      frames = [{ transform: "translateY(-260px) rotate(-8deg) scale(1.05)", opacity: 0 }, { transform: "translateY(6px) rotate(1deg)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }];
      easing = EASE.settle;
      duration = 620;
    } else if (arriving.direction > 0) {
      frames = [{ transform: BEHIND, filter: "brightness(.78)" }, { transform: "none", filter: "none" }];
      duration = 280;
    } else {
      frames = [{ transform: arriving.fromX === null ? "translateX(-130%) rotate(-6deg)" : `translateX(${arriving.fromX}px)`, opacity: arriving.fromX === null ? 0 : 1 }, { transform: "none", opacity: 1 }];
    }
    void play(card, frames, duration, easing).then(() => {
      clearScripted(card);
      busy.current = false;
    });
  }, [currentId, landedId]);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!keyboard || event.defaultPrevented || target?.closest("input, textarea, select, [contenteditable='true'], dialog")) return;
    if (event.key === "ArrowRight") { event.preventDefault(); void go(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); void go(-1); }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function scale() {
    return sceneRef.current ? sceneScale(sceneRef.current) : 1;
  }

  const dragHandlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (busy.current || event.button !== 0) return;
      drag.current = { startX: event.clientX, dx: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (!drag.current) return;
      drag.current.dx = (event.clientX - drag.current.startX) / scale();
      const { dx } = drag.current;
      event.currentTarget.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const moved = drag.current;
      drag.current = null;
      if (!moved) return;
      const element = event.currentTarget;
      if (Math.abs(moved.dx) > SWIPE_DISTANCE) {
        void go(moved.dx < 0 ? 1 : -1, moved.dx);
        return;
      }
      element.style.removeProperty("transform");
      if (moved.dx !== 0 && !prefersReducedMotion()) {
        element.animate([{ transform: `translateX(${moved.dx}px) rotate(${moved.dx / 30}deg)` }, { transform: "none" }], { duration: 240, easing: EASE.settle });
      }
    },
    onPointerCancel(event: PointerEvent<HTMLElement>) {
      drag.current = null;
      event.currentTarget.style.removeProperty("transform");
    },
  };

  const current = currentId ? owls.get(currentId) : undefined;

  return (
    <>
      <button className={`${controls.iconButton} ${styles.navPrev}`} type="button" aria-label="Previous owl" onClick={() => void go(-1)} inert={inert}>
        <ChevronIcon direction="left" />
      </button>
      <div className={`${styles.stack} ${cardStyles.stack}`} inert={inert}>
        {visible.length === 0 && <EmptyLetter />}
        {visible.map((id, depth) => {
          const owl = owls.get(id);
          if (!owl) return null;
          const isFront = depth === 0;
          return (
            <OwlCard
              key={id}
              owl={owl}
              depth={depth as 0 | 1 | 2}
              priority={isFront}
              drag={isFront ? dragHandlers : undefined}
              cardRef={isFront ? front : undefined}
            />
          );
        })}
        {current && (
          <p className="visually-hidden" aria-live="polite">Owl {at + 1} of {order.length}, from {current.writer}</p>
        )}
      </div>
      <button className={`${controls.iconButton} ${styles.navNext}`} type="button" aria-label="Next owl" onClick={() => void go(1)} inert={inert}>
        <ChevronIcon direction="right" />
      </button>
    </>
  );
}
