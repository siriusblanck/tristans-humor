"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import styles from "./front-page.module.css";

export type CastOption = { id: string; letter: string; name: string; imageUrl: string | null; hue: number };

/** The word itself is the cast: each letter of "humorme" is a radio for one writer. */
export default function LetterPicker({ cast, selected, onSelect, flying, error }: {
  cast: CastOption[];
  selected: string | null;
  onSelect?: (id: string) => void;
  flying?: boolean;
  error?: string;
}) {
  const chosen = cast.find(({ id }) => id === selected);
  const interactive = Boolean(onSelect);

  return (
    <fieldset className={styles.picker} aria-describedby={error ? "picker-error" : undefined}>
      <legend className={styles.label}>Who&apos;s writing?</legend>
      <div className={styles.letters} data-interactive={interactive}>
        {cast.map((character) => (
          <label
            key={character.id}
            className={styles.letter}
            data-checked={character.id === selected}
            data-flying={flying && character.id === selected}
            style={{ "--hue": character.hue } as CSSProperties}
          >
            {interactive && (
              <input
                className="visually-hidden"
                type="radio"
                name="character_id"
                value={character.id}
                checked={character.id === selected}
                onChange={() => onSelect?.(character.id)}
                required
              />
            )}
            <span aria-hidden="true">{character.letter}</span>
            <span className="visually-hidden">{character.name}</span>
          </label>
        ))}
      </div>
      {interactive && (
        <p className={styles.writer} aria-live="polite">
          {chosen ? (
            <>
              <span className={styles.writerPortrait} style={{ "--hue": chosen.hue } as CSSProperties}>
                {chosen.imageUrl && <Image src={chosen.imageUrl} alt="" fill sizes="40px" unoptimized />}
              </span>
              <span><strong>{chosen.name}</strong> is writing today&apos;s caption.</span>
            </>
          ) : "Each letter is a writer. Pick one."}
        </p>
      )}
      {error && <p id="picker-error" className="field-error" role="alert">{error}</p>}
    </fieldset>
  );
}
