import Image from "next/image";
import type { CSSProperties } from "react";
import type { FeedItem } from "@/lib/owl-post/feed";
import { houseName } from "@/lib/owl-post/houses";
import VoteButtons from "./vote-buttons";
import styles from "./front-page.module.css";

export default function GenerationCard({ item, signedIn, priority = false }: { item: FeedItem; signedIn: boolean; priority?: boolean }) {
  const hue = { "--hue": item.character?.hue ?? 40 } as CSSProperties;

  return (
    <article id={`owl-${item.id}`} className={styles.card} style={hue}>
      <div className={styles.photo}>
        <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 400px" priority={priority} />
      </div>
      <figure className={styles.quote}>
        <blockquote><p>{item.caption}</p></blockquote>
        <figcaption>{item.character?.name ?? "A mystery writer"}</figcaption>
      </figure>
      <footer className={styles.cardFooter}>
        <p className={styles.byline}>
          Sent by {item.authorDisplay} <span className={styles.house} data-house={item.house}>{houseName(item.house)}</span>
        </p>
        <VoteButtons generationId={item.id} score={item.score} myVote={item.myVote} isMine={item.isMine} signedIn={signedIn} />
      </footer>
    </article>
  );
}
