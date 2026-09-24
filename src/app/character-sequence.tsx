"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Character } from "@/lib/characters";

const TOP_LINE_LENGTH = 5;

export default function CharacterSequence({
  characters,
}: {
  characters: Character[];
}) {
  const [phase, setPhase] = useState<"intro" | "revealing" | "complete">(
    "intro",
  );
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const sourceLetters = useRef<Array<HTMLSpanElement | null>>([]);
  const targetLetters = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    let cancelled = false;
    let introTimer = 0;
    const runningAnimations: Animation[] = [];
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const pause = (duration: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, duration));

    const moveGlyph = async (index: number, animate: boolean) => {
      const source = sourceLetters.current[index];
      const target = targetLetters.current[index];
      if (!source || !target) return;

      const start = source.getBoundingClientRect();
      const end = target.getBoundingClientRect();
      const x = end.left + end.width / 2 - (start.left + start.width / 2);
      const y = end.top + end.height / 2 - (start.top + start.height / 2);
      const destination = `translate(${x}px, ${y}px)`;

      if (!animate) {
        source.style.transform = destination;
        return;
      }

      const animation = source.animate(
        [
          { transform: "translate(0px, 0px)" },
          { transform: destination },
        ],
        {
          duration: 700,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );

      runningAnimations.push(animation);
      await pause(730);
    };

    const reveal = async () => {
      setPhase("revealing");

      if (prefersReducedMotion) {
        for (let index = 0; index < characters.length; index += 1) {
          await moveGlyph(index, false);
        }
        if (!cancelled) {
          setVisibleCards(characters.map((_, index) => index));
          setPhase("complete");
        }
        return;
      }

      for (let index = 0; index < characters.length; index += 1) {
        if (cancelled) return;

        await moveGlyph(index, true);
        if (cancelled) return;

        setVisibleCards((current) => [...current, index]);
        await pause(130);
      }

      if (!cancelled) setPhase("complete");
    };

    introTimer = window.setTimeout(() => void reveal(), 460);

    return () => {
      cancelled = true;
      window.clearTimeout(introTimer);
      runningAnimations.forEach((animation) => animation.cancel());
    };
  }, [characters]);

  const renderSection = (
    sectionCharacters: Character[],
    startIndex: number,
    label: string,
  ) => (
    <section
      className="word-section"
      aria-label={label}
      key={label}
      style={{ "--column-count": sectionCharacters.length } as CSSProperties}
    >
      <div className="letter-row" aria-hidden="true">
        {sectionCharacters.map((character, localIndex) => {
          const index = startIndex + localIndex;
          return (
            <div className="letter-dock" key={character.id}>
              <span
                className="letter-anchor"
                ref={(node) => {
                  targetLetters.current[index] = node;
                }}
              >
                {character.letter}
              </span>
            </div>
          );
        })}
      </div>

      <ol
        className="character-grid"
        aria-label={`${label} character cards`}
      >
        {sectionCharacters.map((character, localIndex) => {
          const index = startIndex + localIndex;
          const cardStyle = {
            "--card-hue": `${(index * 41 + 14) % 360}deg`,
          } as CSSProperties;

          return (
            <li className="character-slot" key={character.id}>
              <article
                className={`character-card${visibleCards.includes(index) ? " is-visible" : ""}`}
                style={cardStyle}
              >
                <div className="portrait-frame">
                  {character.image_url ? (
                    <Image
                      className="portrait-image"
                      src={character.image_url}
                      alt={character.name ? `${character.name} portrait` : "Character portrait"}
                      fill
                      sizes="(max-width: 760px) 20vw, 19vw"
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
                  <p className="character-fact">
                    {character.fact || "A curious fact goes here."}
                  </p>
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
      <h1 className="visually-hidden">humor me?</h1>

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
          </div>
        </div>
      </div>

      <div className={`gallery-stage gallery-stage-${phase}`}>
        {renderSection(topLine, 0, "Humor")}
        {renderSection(bottomLine, TOP_LINE_LENGTH, "Me")}
      </div>
    </main>
  );
}
