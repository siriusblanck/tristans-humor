"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Character } from "@/lib/characters";

const TOP_LINE_LENGTH = 6;
const MOVE_DURATION = 700;

export default function CharacterSequence({
  characters,
}: {
  characters: Character[];
}) {
  const [phase, setPhase] = useState<"intro" | "revealing" | "complete">(
    "intro",
  );
  const [visibleCards, setVisibleCards] = useState(0);
  const sourceLetters = useRef<Array<HTMLSpanElement | null>>([]);
  const targetLetters = useRef<Array<HTMLSpanElement | null>>([]);
  const questionTarget = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let introTimer = 0;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const pause = (duration: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, duration));

    const moveGlyph = async (index: number) => {
      const source = sourceLetters.current[index];
      const target =
        index === characters.length
          ? questionTarget.current
          : targetLetters.current[index];
      if (!source || !target) return;

      const start = source.getBoundingClientRect();
      const end = target.getBoundingClientRect();
      const x = end.left + end.width / 2 - (start.left + start.width / 2);
      const y = end.top + end.height / 2 - (start.top + start.height / 2);

      source.style.transition = prefersReducedMotion
        ? "none"
        : `transform ${MOVE_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      source.style.transform = `translate(${x}px, ${y}px)`;

      if (!prefersReducedMotion) {
        // Flush the style change so the browser creates the transition, then
        // wait for its painted finish before revealing the corresponding card.
        void getComputedStyle(source).transform;
        const transition = source.getAnimations()[0];
        if (transition) await transition.finished.catch(() => undefined);
      }
    };

    const reveal = async () => {
      setPhase("revealing");

      for (let index = 0; index < characters.length; index += 1) {
        if (cancelled) return;
        await moveGlyph(index);
        if (cancelled) return;
        setVisibleCards(index + 1);
        if (!prefersReducedMotion) await pause(110);
      }

      if (cancelled) return;
      await moveGlyph(characters.length);
      if (!cancelled) setPhase("complete");
    };

    void document.fonts.ready.then(() => {
      if (cancelled) return;
      introTimer = window.setTimeout(
        () => void reveal(),
        prefersReducedMotion ? 0 : 420,
      );
    });

    return () => {
      cancelled = true;
      window.clearTimeout(introTimer);
    };
  }, [characters]);

  const renderSection = (
    sectionCharacters: Character[],
    startIndex: number,
    label: string,
  ) => (
    <section
      className={`word-section ${startIndex === 0 ? "word-section-top" : "word-section-bottom"}`}
      aria-label={label}
      key={label}
      style={{ "--column-count": sectionCharacters.length } as CSSProperties}
    >
      <div className="letter-row" aria-hidden="true">
        {sectionCharacters.map((character, localIndex) => {
          const index = startIndex + localIndex;
          const isLastLetter = index === characters.length - 1;

          return (
            <div className="letter-dock" key={character.id}>
              <span className={isLastLetter ? "letter-pair" : undefined}>
                <span
                  className="letter-anchor"
                  ref={(node) => {
                    targetLetters.current[index] = node;
                  }}
                >
                  {character.letter}
                </span>
                {isLastLetter && (
                  <span className="question-anchor" ref={questionTarget} />
                )}
              </span>
            </div>
          );
        })}
      </div>

      <ol className="character-grid" aria-label={`${label} character cards`}>
        {sectionCharacters.map((character, localIndex) => {
          const index = startIndex + localIndex;
          const cardStyle = {
            "--card-hue": `${(index * 41 + 14) % 360}deg`,
          } as CSSProperties;

          return (
            <li className="character-slot" key={character.id}>
              <article
                className={`character-card${index < visibleCards ? " is-visible" : ""}`}
                style={cardStyle}
              >
                <div className="portrait-frame">
                  {character.image_url ? (
                    <Image
                      className="portrait-image"
                      src={character.image_url}
                      alt={character.name ? `${character.name} portrait` : "Character portrait"}
                      fill
                      sizes={startIndex === 0 ? "16vw" : "50vw"}
                      loading="eager"
                      unoptimized
                    />
                  ) : (
                    <div className="portrait-placeholder" role="img" aria-label="Portrait to come">
                      <span className="portrait-halo" />
                      <span className="portrait-head" />
                      <span className="portrait-shoulders" />
                    </div>
                  )}
                </div>
                <div className="character-copy">
                  <h2>{character.name || "Name goes here"}</h2>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );

  const topLine = characters.slice(0, TOP_LINE_LENGTH);
  const bottomLine = characters.slice(TOP_LINE_LENGTH);

  return (
    <main className="page-shell">
      <h1 className="visually-hidden">humour me?</h1>

      <div className="intro-overlay" aria-hidden="true">
        <div className="intro-wordmark">
          <div className="intro-line">
            {topLine.map((character, index) => (
              <span
                className="intro-letter"
                key={character.id}
                ref={(node) => {
                  sourceLetters.current[index] = node;
                }}
              >
                {character.letter}
              </span>
            ))}
          </div>
          <div className="intro-line">
            {bottomLine.map((character, localIndex) => {
              const index = TOP_LINE_LENGTH + localIndex;
              return (
                <span
                  className="intro-letter"
                  key={character.id}
                  ref={(node) => {
                    sourceLetters.current[index] = node;
                  }}
                >
                  {character.letter}
                </span>
              );
            })}
            <span
              className="intro-letter intro-question"
              ref={(node) => {
                sourceLetters.current[characters.length] = node;
              }}
            >
              ?
            </span>
          </div>
        </div>
      </div>

      <div className={`gallery-stage gallery-stage-${phase}`}>
        {renderSection(topLine, 0, "Humour")}
        {renderSection(bottomLine, TOP_LINE_LENGTH, "Me?")}
      </div>
    </main>
  );
}
