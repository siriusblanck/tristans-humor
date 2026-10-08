"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import type { House } from "@/lib/owl-post/houses";
import { EASE, play } from "./motion";
import styles from "./rail.module.css";

const GLASS = "M5 7C5 25 16 30 16 36C16 42 5 47 5 65L31 65C31 47 20 42 20 36C20 30 31 25 31 7Z";
const UPPER = "M5 7C5 25 16 30 16 36L20 36C20 30 31 25 31 7Z";
const LOWER = "M16 36C16 42 5 47 5 65L31 65C31 47 20 42 20 36Z";
// Sand surfaces, drawn at y = 0 and slid into place by CSS: a heap below, a dip above.
const HEAP = "M0 4Q18 -4 36 4V40H0Z";
const DIP = "M0 0Q18 6 36 0V40H0Z";
const SPARK = "M0-3L.7-.7 3 0 .7.7 0 3-.7.7-3 0-.7-.7Z";
const SPARKS = [[-3, 15], [39, 31], [-2, 50]] as const;
// Turned wood, lit from the left: the shading that makes the posts and caps round.
const WOOD = [["0", "#3d2a12"], [".3", "#b48a4e"], [".46", "#f1d9a2"], [".7", "#9c7640"], ["1", "#3a2710"]] as const;

/**
 * A turned-wood hourglass of sand in the house's gem colour, with the week's points inside
 * the glass. Sand trickles while the top still holds some; the glass jiggles now and then,
 * and shakes properly when points arrive.
 */
export default function Hourglass({ house, level, points }: { house: House; level: number; points: number }) {
  const id = useId();
  const glass = useRef<HTMLSpanElement>(null);
  const number = useRef<SVGTextElement>(null);
  const shown = useRef(points);

  // When the points change, the glass shakes and the number rolls into place.
  useEffect(() => {
    if (shown.current === points) return;
    const rising = points > shown.current;
    shown.current = points;
    void play(number.current, [{ transform: `translateY(${rising ? -7 : 7}px)`, opacity: 0.2 }, { transform: "none", opacity: 1 }], 260, EASE.out, { fill: "none" });
    void play(glass.current, [
      { transform: "none" }, { transform: "rotate(-11deg) scale(1.06)" }, { transform: "rotate(9deg) scale(1.06)" },
      { transform: "rotate(-6deg)" }, { transform: "rotate(3deg)" }, { transform: "none" },
    ], 720, EASE.out, { fill: "none", composite: "add" });
  }, [points]);

  const url = (name: string) => `url(#${id}${name})`;

  return (
    <span ref={glass} className={styles.glassWrap}>
      <span className={styles.aura} aria-hidden="true" />
      <svg className={styles.glass} viewBox="0 0 36 72" style={{ "--lvl": level } as CSSProperties} data-glass={house} aria-hidden="true">
        <defs>
          <clipPath id={`${id}u`}><path d={UPPER} /></clipPath>
          <clipPath id={`${id}l`}><path d={LOWER} /></clipPath>
          <linearGradient id={`${id}s`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" className={styles.sandEdge} />
            <stop offset=".36" className={styles.sandBody} />
            <stop offset=".5" className={styles.sandLit} />
            <stop offset=".76" className={styles.sandBody} />
            <stop offset="1" className={styles.sandEdge} />
          </linearGradient>
          <linearGradient id={`${id}g`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#b9d9eb" stopOpacity=".3" />
            <stop offset=".28" stopColor="#b9d9eb" stopOpacity=".04" />
            <stop offset=".7" stopColor="#b9d9eb" stopOpacity=".04" />
            <stop offset="1" stopColor="#b9d9eb" stopOpacity=".24" />
          </linearGradient>
          <linearGradient id={`${id}w`} x1="0" x2="1" y1="0" y2="0">
            {WOOD.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color} />)}
          </linearGradient>
        </defs>

        <ellipse className={styles.groundShadow} cx="18" cy="70.6" rx="16" ry="1.8" />
        <path d={GLASS} fill={url("g")} />
        <line className={styles.stream} x1="18" y1="35" x2="18" y2="66" clipPath={url("l")} />
        <g clipPath={url("u")}><path className={styles.sandTop} d={DIP} fill={url("s")} /></g>
        <g clipPath={url("l")}><path className={styles.sandBottom} d={HEAP} fill={url("s")} /></g>
        <path className={styles.glassShine} d="M8.7 10.5C8.7 19.5 11.5 25 14.4 29.3" />
        <path className={styles.glassShine} d="M14.4 42.7C11.5 47 8.7 52.5 8.7 61.5" />
        <path className={styles.glassRim} d="M27.4 11C27.4 18.6 25.3 23.6 22.6 27.6M22.6 44.4C25.3 48.4 27.4 53.4 27.4 61" />
        <path className={styles.glassOutline} d={GLASS} />

        <rect x="1.3" y="5" width="2.6" height="62" rx="1.2" fill={url("w")} />
        <rect x="32.1" y="5" width="2.6" height="62" rx="1.2" fill={url("w")} />
        <ellipse cx="2.6" cy="36" rx="2.1" ry="1.5" fill={url("w")} />
        <ellipse cx="33.4" cy="36" rx="2.1" ry="1.5" fill={url("w")} />
        <rect x="0.4" y="2.4" width="35.2" height="4.8" rx="1.3" fill={url("w")} />
        <ellipse className={styles.capFace} cx="18" cy="2.6" rx="17.3" ry="1.4" />
        <rect x="0.4" y="64.8" width="35.2" height="5" rx="1.3" fill={url("w")} />
        <ellipse className={styles.capFace} cx="18" cy="65" rx="17.3" ry="1.3" />

        <text ref={number} className={styles.glassNumber} x="18" y="57" style={{ transformBox: "fill-box" }}>{points}</text>

        {SPARKS.map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><path className={styles.spark} d={SPARK} /></g>
        ))}
      </svg>
    </span>
  );
}
