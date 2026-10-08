"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { houseName } from "@/lib/owl-post/houses";
import { GemIcon, SplitGemIcon } from "./art";
import { EASE, play } from "./motion";
import type { Owl } from "./types";
import styles from "./card.module.css";

/**
 * Frosted night glass floating under the front card: a gem to award a point, a split gem to
 * take one, the points between them, and the crest of the house that gets them.
 */
export default function VoteDock({ owl, voting, onVote }: {
  owl: Owl;
  voting: boolean;
  onVote: (direction: 1 | -1, button: HTMLButtonElement) => void;
}) {
  const dock = useRef<HTMLDivElement>(null);
  const points = useRef<HTMLSpanElement>(null);
  const shown = useRef({ id: owl.id, score: owl.score });

  // Browsing fades the dock to the next owl's points; a vote rolls the number.
  useLayoutEffect(() => {
    const previous = shown.current;
    shown.current = { id: owl.id, score: owl.score };
    if (previous.id !== owl.id) {
      void play(dock.current, [{ opacity: 0.3 }, { opacity: 1 }], 260, EASE.out, { fill: "none" });
    } else if (previous.score !== owl.score) {
      const offset = owl.score > previous.score ? 6 : -6;
      void play(points.current, [{ transform: `translateY(${offset}px)`, opacity: 0.2 }, { transform: "none", opacity: 1 }], 240, EASE.out, { fill: "none" });
    }
  }, [owl.id, owl.score]);

  return (
    <div ref={dock} className={styles.dock} data-house={owl.house} role="group" aria-label="Points for this owl">
      {owl.isMine ? (
        <>
          <span className={styles.ownTag}>Your owl</span>
          <span ref={points} className={styles.points}>{owl.score}</span>
        </>
      ) : (
        <>
          <button
            type="button"
            className={styles.vote}
            data-direction="up"
            aria-label="Award a point"
            aria-pressed={owl.myVote === 1}
            aria-disabled={voting}
            onClick={(event) => onVote(1, event.currentTarget)}
          >
            <GemIcon />
          </button>
          <span ref={points} className={styles.points} aria-live="polite">{owl.score}</span>
          <button
            type="button"
            className={styles.vote}
            data-direction="down"
            aria-label="Take a point"
            aria-pressed={owl.myVote === -1}
            aria-disabled={voting}
            onClick={(event) => onVote(-1, event.currentTarget)}
          >
            <SplitGemIcon />
          </button>
        </>
      )}
      <span className={styles.divider} aria-hidden="true" />
      <Image className={styles.dockCrest} src={`/crests/${owl.house}.png`} alt="" width={30} height={33} />
      <span className="visually-hidden">Points go to {houseName(owl.house)}</span>
    </div>
  );
}
