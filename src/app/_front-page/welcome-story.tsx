import { GemIcon, Seal, SplitGemIcon } from "./art";
import { WELCOME_STORAGE_KEY } from "./boot-script";
import type { Timing } from "./delivery-choreography";
import styles from "./welcome.module.css";

export const WELCOME_KEY = WELCOME_STORAGE_KEY;
export const WELCOME_BEATS = [2800, 3000, 2700, 1400] as const;

/** Whole panels glide into place; the copy stays still and readable. */
export async function playWelcome(root: HTMLElement | null, timing: Timing, paused: () => boolean, skipping: () => boolean) {
  if (!root) return;
  root.hidden = false;
  const beats = Array.from(root.querySelectorAll<HTMLElement>("[data-welcome-beat]"));
  try {
    for (const [index, beat] of beats.entries()) {
      if (skipping()) break;
      beat.hidden = false;
      root.dataset.step = String(index);
      await timing.animate(beat, [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], 360, "ease-out");
      await timing.wait(WELCOME_BEATS[index] ?? 2500);
      while (paused() && !skipping()) await timing.wait(1000);
      await timing.animate(beat, [{ opacity: 1 }, { opacity: 0 }], 200);
      beat.hidden = true;
    }
  } finally {
    beats.forEach(beat => { beat.hidden = true; });
    root.hidden = true;
  }
}

export default function WelcomeStory({ rootRef }: { rootRef: React.RefObject<HTMLDivElement | null> }) {
  return <div ref={rootRef} className={styles.welcome} hidden>
    <div data-welcome-beat hidden className={styles.beat}>
      <div className={styles.cards} aria-hidden="true"><span className={styles.backCard}>Campus<br/>chaos.</span><span className={styles.frontCard}><Seal size={42}/><span>Wizard-level<br/><em>pettiness.</em></span></span></div>
      <h2>Columbia is the joke.<br/><em>You write the punchline.</em></h2>
    </div>
    <div data-welcome-beat hidden className={styles.beat}>
      <div className={styles.voteArt} aria-hidden="true"><span><GemIcon/>+1</span><span><SplitGemIcon/>−1</span></div>
      <h2>Laughed? Upvote.<br/><em>Cringed? Downvote.</em></h2>
    </div>
    <div data-welcome-beat hidden className={styles.beat}>
      <div className={styles.houses} aria-hidden="true">{["gryffindor", "hufflepuff", "ravenclaw", "slytherin"].map((house,i)=><span key={house} data-house={house}><i style={{"--fill": `${36+i*14}%`} as React.CSSProperties}/><GemIcon/><small>{house.slice(0,1).toUpperCase()}</small></span>)}</div>
      <h2>Make them laugh.<br/><em>Make your house proud.</em></h2>
    </div>
    <div data-welcome-beat hidden className={`${styles.beat} ${styles.handoff}`}>
      <span className={styles.spark} aria-hidden="true">✦</span>
      <h2>Oh look.<br/><em>Here’s our owl.</em></h2>
    </div>
    <div className={styles.progress} aria-hidden="true"><i/><i/><i/><i/></div>
  </div>;
}
