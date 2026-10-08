"use client";

import Image from "next/image";
import { useId, type PointerEventHandler, type Ref } from "react";
import { houseName } from "@/lib/owl-post/houses";
import { captionSize } from "@/lib/owl-post/stack";
import type { Owl } from "./types";
import styles from "./card.module.css";

type Drag = {
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
};

/** "OWL POST · MORNINGSIDE" around the day the owl was sent, with the cancellation waves. */
function Postmark({ date }: { date: string }) {
  const ring = useId();
  return (
    <svg className={styles.postmark} viewBox="0 0 120 76" aria-hidden="true">
      <defs><path id={ring} d="M38 38m-27.5 0a27.5 27.5 0 1 1 55 0a27.5 27.5 0 1 1-55 0" /></defs>
      <circle cx="38" cy="38" r="33" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="38" cy="38" r="21.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <text className={styles.postmarkRing}><textPath href={`#${ring}`}>OWL POST · MORNINGSIDE ·</textPath></text>
      <text className={styles.postmarkDate} x="38" y="41.5" textAnchor="middle">{date}</text>
      <path d="M73 25q6-5 12 0t12 0t12 0t10 0M73 38q6-5 12 0t12 0t12 0t10 0M73 51q6-5 12 0t12 0t12 0t10 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** One owl as a folded letter. Only the front card (depth 0) is interactive. */
export default function OwlCard({ owl, depth, priority, drag, cardRef }: {
  owl: Owl;
  depth: 0 | 1 | 2;
  priority: boolean;
  drag?: Drag;
  cardRef?: Ref<HTMLElement>;
}) {
  const behind = depth > 0;
  return (
    <article
      ref={cardRef}
      className={styles.card}
      data-depth={depth}
      data-house={owl.house}
      data-reveal="card"
      aria-hidden={behind || undefined}
      inert={behind}
      aria-label={behind ? undefined : `An owl from ${owl.writer}, sent by ${owl.authorDisplay}`}
      {...drag}
    >
      <div className={styles.picture}>
        <Image src={owl.imageUrl} alt={owl.imageAlt} fill sizes="(min-width: 1024px) 440px, 45vw" priority={priority} draggable={false} />
      </div>
      <div className={styles.letter}>
        <span className={styles.quote} aria-hidden="true">“</span>
        <div className={styles.post}>
          <span className={styles.stampWrap}>
            <span className={styles.stamp}>
              <span className={styles.stampFace}>
                <Image src={`/crests/${owl.house}.png`} alt={`${houseName(owl.house)} stamp`} width={48} height={54} />
              </span>
            </span>
          </span>
          <Postmark date={owl.postmark} />
        </div>
        <p className={styles.caption} data-size={captionSize(owl.caption)}>{owl.caption}</p>
        <div className={styles.foot}>
          <p className={styles.sign}>— {owl.writer}</p>
          <svg className={styles.swash} viewBox="0 0 96 10" aria-hidden="true"><path d="M2 6C20 1 34 9 52 5S82 2 94 6" /></svg>
          <p className={styles.by}>sent by {owl.authorDisplay}</p>
        </div>
      </div>
    </article>
  );
}

/** What the stack shows before anyone has sent an owl this week. */
export function EmptyLetter() {
  return (
    <article className={styles.card} data-depth={0} data-reveal="card">
      <div className={styles.emptyLetter}>
        <p className={styles.emptyTitle}>No owls yet this week.</p>
        <p className={styles.emptyHint}>Send the first one.</p>
      </div>
    </article>
  );
}
