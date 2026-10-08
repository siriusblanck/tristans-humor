import type { CSSProperties } from "react";
import { glints, starField } from "@/lib/sky";
import styles from "./sky.module.css";

// Seeded, so the server and the browser draw the same sky: Columbia's founding year and
// the year Low Library opened.
const STARS = starField(1897, 240);
const GLINTS = glints(1754, 39);

/**
 * The night over Morningside: still stars, a few that twinkle, and sparkles that glint in turn.
 * `held` keeps the glints still, for pages that always blur the sky.
 */
export default function Starfield({ held = false }: { held?: boolean }) {
  return (
    <div className={styles.sky} data-held={held || undefined} aria-hidden="true">
      <svg className={styles.stars}>
        {STARS.map((star, index) => (
          <circle key={index} className={star.warm ? styles.warm : undefined} cx={`${star.x}%`} cy={`${star.y}%`} r={star.r} opacity={star.opacity} />
        ))}
      </svg>
      {GLINTS.map((glint, index) => (
        <span
          key={index}
          className={glint.kind === "spark" ? styles.spark : styles.dot}
          style={{ left: `${glint.x}%`, top: `${glint.y}%`, "--z": `${glint.size}px`, "--t": `${glint.duration}s`, animationDelay: `-${glint.delay}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}
