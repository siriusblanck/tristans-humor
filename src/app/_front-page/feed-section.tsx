import type { ReactNode } from "react";
import type { FeedItem } from "@/lib/owl-post/feed";
import GenerationCard from "./generation-card";
import styles from "./front-page.module.css";

export default function FeedSection({ id, title, items, signedIn, empty, prioritizeFirst = false }: {
  id: string;
  title: string;
  items: FeedItem[];
  signedIn: boolean;
  empty?: ReactNode;
  prioritizeFirst?: boolean;
}) {
  if (items.length === 0 && !empty) return null;

  return (
    <section className={styles.feed} aria-labelledby={id}>
      <header className={styles.feedHeader}>
        <h2 id={id}>{title}</h2>
        {items.length > 0 && <p><span className={styles.count}>{items.length}</span> · most points first</p>}
      </header>
      {items.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <div className={styles.grid}>
          {items.map((item, index) => (
            <GenerationCard key={item.id} item={item} signedIn={signedIn} priority={prioritizeFirst && index < 2} />
          ))}
        </div>
      )}
    </section>
  );
}
