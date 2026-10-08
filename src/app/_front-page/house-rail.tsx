import Image from "next/image";
import type { RailHouse } from "@/lib/owl-post/houses";
import Hourglass from "./hourglass";
import styles from "./rail.module.css";

/** Each house's crest beside its hourglass; house names are for screen readers only. */
export default function HouseRail({ rail, inert }: { rail: RailHouse[]; inert: boolean }) {
  return (
    <ul className={styles.rail} aria-label="House points this week" data-reveal="rail" inert={inert}>
      {rail.map(({ house, name, points, level, leader }) => (
        <li key={house} className={styles.house} data-house={house} data-leader={leader}>
          <Image className={styles.crest} src={`/crests/${house}.png`} alt="" width={54} height={60} />
          <Hourglass house={house} level={level} points={points} />
          <span className="visually-hidden">{name}, {points} {Math.abs(points) === 1 ? "point" : "points"}{leader ? ", leading" : ""}</span>
        </li>
      ))}
    </ul>
  );
}
