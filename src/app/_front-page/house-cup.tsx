import type { CSSProperties } from "react";
import type { HouseStanding } from "@/lib/owl-post/houses";
import styles from "./front-page.module.css";

export default function HouseCup({ standings, weekOf }: { standings: HouseStanding[]; weekOf: string }) {
  const top = Math.max(1, ...standings.map(({ points }) => points));

  return (
    <section className={styles.cup} aria-labelledby="house-cup">
      <h2 id="house-cup" className="eyebrow">House Cup · week of {weekOf}</h2>
      <ol>
        {standings.map(({ house, name, points }) => (
          <li key={house} data-house={house}>
            <span className={styles.cupName}>{name}</span>
            <span className={styles.cupBar} style={{ "--share": Math.max(0, points) / top } as CSSProperties} aria-hidden="true" />
            <span className={styles.cupPoints}>{points}<span className="visually-hidden"> points</span></span>
          </li>
        ))}
      </ol>
      <p>Points on your owls count for your house. The cup resets every Monday.</p>
    </section>
  );
}
