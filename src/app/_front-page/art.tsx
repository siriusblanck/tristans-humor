import type { CSSProperties } from "react";
import controls from "./controls.module.css";

// Drawings shared by the front page. All are decorative: whatever they show is also
// said in text (or labelled on the control that holds them).

/** The Columbia-blue wax seal: Hog Wumbia's mark. */
export function Seal({ size, className, id }: { size?: number; className?: string; id?: string }) {
  // Without a size the stylesheet decides (36 px unless the context sets --d).
  const style = size ? ({ "--d": `${size}px` } as CSSProperties) : undefined;
  return (
    <span id={id} className={`${controls.seal} ${className ?? ""}`} style={style} aria-hidden="true">
      <span>HW</span>
    </span>
  );
}

/** A snowy owl in flight; its wings flap with CSS. */
export function OwlArt({ className }: { className?: string }) {
  return (
    <svg className={`${controls.owl} ${className ?? ""}`} viewBox="0 0 120 84" aria-hidden="true">
      <g className={`${controls.wing} ${controls.wingLeft}`}><path d="M54 40C44 26 24 16 4 18C12 24 14 28 18 32C22 31 25 34 27 38C31 36 35 40 38 43C42 41 46 44 50 47Z" /></g>
      <g className={`${controls.wing} ${controls.wingRight}`}><path d="M66 40C76 26 96 16 116 18C108 24 106 28 102 32C98 31 95 34 93 38C89 36 85 40 82 43C78 41 74 44 70 47Z" /></g>
      <ellipse className={controls.owlBody} cx="60" cy="50" rx="12.5" ry="17" />
      <path className={controls.owlBody} d="M49.5 27L51 17.5L55.5 23.5ZM70.5 27L69 17.5L64.5 23.5Z" />
      <circle className={controls.owlBody} cx="60" cy="31" r="11.5" />
      <circle className={controls.owlEye} cx="55.5" cy="30.5" r="3.3" />
      <circle className={controls.owlEye} cx="64.5" cy="30.5" r="3.3" />
      <circle className={controls.owlPupil} cx="55.5" cy="30.5" r="1.5" />
      <circle className={controls.owlPupil} cx="64.5" cy="30.5" r="1.5" />
      <path className={controls.owlBeak} d="M58.5 34H61.5L60 37.8Z" />
      <path className={controls.owlBreast} d="M54 46q6 3 12 0M53.5 52q6.5 3 13 0M54.5 58q5.5 2.5 11 0" />
      <path className={controls.owlTalon} d="M56 66l-1.5 6M64 66l1.5 6" />
    </svg>
  );
}

/** Award a point: a whole gem. */
export function GemIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 22" aria-hidden="true">
      <path data-part="body" d="M10 1.5L18.5 8L10 20.5L1.5 8Z" />
      <path data-part="facet" d="M1.5 8H18.5M6 8L10 1.5L14 8M6 8L10 20.5L14 8" />
    </svg>
  );
}

/** Take a point: the gem split in two. */
export function SplitGemIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 22" aria-hidden="true">
      <path data-part="body" transform="translate(-1.5 0)" d="M10 1.5L1.5 8L10 20.5L8.6 14.5L11 10.5L8.6 6.5Z" />
      <path data-part="body" transform="translate(1.5 0)" d="M10 1.5L18.5 8L10 20.5L8.6 14.5L11 10.5L8.6 6.5Z" />
    </svg>
  );
}

/** The gem that flies from the vote dock into a house's hourglass. */
export const FLYING_GEM_SVG =
  '<svg viewBox="0 0 16 20" width="16" height="20"><path d="M8 0L16 7L8 20L0 7Z" fill="var(--g)"/><path d="M8 0L11 7L8 20L5 7Z" fill="rgba(255,255,255,.35)"/><path d="M0 7H16" stroke="rgba(255,255,255,.5)" stroke-width=".8"/></svg>';

export function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
