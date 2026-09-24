"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Character } from "@/lib/characters";

type ConnectionStatus = "connected" | "missing" | "unavailable";
type CharacterSequenceProps = {
  characters: Character[];
  connectionStatus: ConnectionStatus;
};

export default function CharacterSequence(props: CharacterSequenceProps) {
  const [sequence, setSequence] = useState(0);

  return (
    <SequenceRun
      key={sequence}
      {...props}
      onReplay={() => setSequence((current) => current + 1)}
    />
  );
}

function SequenceRun({
  characters,
  connectionStatus,
  onReplay,
}: CharacterSequenceProps & { onReplay: () => void }) {
  const [phase, setPhase] = useState<"intro" | "revealing" | "complete">(
    "intro",
  );
  const [landedLetters, setLandedLetters] = useState<number[]>([]);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const sourceLetters = useRef<Array<HTMLSpanElement | null>>([]);
  const targetLetters = useRef<Array<HTMLSpanElement | null>>([]);
  const sourceQuestion = useRef<HTMLSpanElement | null>(null);
  const targetQuestion = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let introTimer = 0;
    const runningAnimations: Animation[] = [];
    const letters = characters.map((character) => character.letter);

    const pause = (duration: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, duration));

    const land = (index: number) => {
      setLandedLetters((current) => [...current, index]);
      window.setTimeout(() => {
        if (!cancelled) setVisibleCards((current) => [...current, index]);
      }, 110);
    };

    const moveGlyph = async (
      source: HTMLSpanElement | null,
      target: HTMLSpanElement | null,
    ) => {
      if (!source || !target) return;

      const start = source.getBoundingClientRect();
      const end = target.getBoundingClientRect();
      const animation = source.animate(
        [
          { transform: "translate(0px, 0px) scale(1, 1)" },
          {
            transform: `translate(${end.left - start.left}px, ${end.top - start.top}px) scale(${end.width / start.width}, ${end.height / start.height})`,
          },
        ],
        {
          duration: 720,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );

      runningAnimations.push(animation);
      await pause(760);

      if (!cancelled) source.style.visibility = "hidden";
    };

    const reveal = async () => {
      setPhase("revealing");

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        sourceLetters.current.forEach((letter) => {
          if (letter) letter.style.visibility = "hidden";
        });
        if (sourceQuestion.current) {
          sourceQuestion.current.style.visibility = "hidden";
        }
        if (!cancelled) {
          setLandedLetters(letters.map((_, index) => index));
          setVisibleCards(letters.map((_, index) => index));
          setPhase("complete");
        }
        return;
      }

      for (let index = 0; index < letters.length; index += 1) {
        if (cancelled) return;

        await moveGlyph(sourceLetters.current[index], targetLetters.current[index]);
        if (index === letters.length - 1) {
          await moveGlyph(sourceQuestion.current, targetQuestion.current);
        }

        if (cancelled) return;
        land(index);
        await pause(150);
      }

      if (!cancelled) setPhase("complete");
    };

    introTimer = window.setTimeout(() => void reveal(), 520);

    return () => {
      cancelled = true;
      window.clearTimeout(introTimer);
      runningAnimations.forEach((animation) => animation.cancel());
    };
  }, [characters]);

  const setupMessage =
    connectionStatus === "missing"
      ? "Local preview · add the Supabase URL and anon key to connect the cast."
      : connectionStatus === "unavailable"
        ? "The gallery is ready; the character table could not be reached."
        : "Eight letters, eight places in the cast.";

  return (
    <main className="page-shell">
      <h1 className="visually-hidden">humour me?</h1>

      <div className="intro-overlay" aria-hidden="true">
        <div className="intro-wordmark">
          <span className="intro-word">
            {characters.slice(0, 6).map((character, index) => (
              <span
                className="intro-letter"
                key={`${character.sort_order}-${character.letter}`}
                ref={(node) => {
                  sourceLetters.current[index] = node;
                }}
              >
                {character.letter}
              </span>
            ))}
          </span>
          <span className="intro-word intro-word-last">
            {characters.slice(6).map((character, index) => {
              const letterIndex = index + 6;
              return (
                <span
                  className="intro-letter"
                  key={`${character.sort_order}-${character.letter}`}
                  ref={(node) => {
                    sourceLetters.current[letterIndex] = node;
                  }}
                >
                  {character.letter}
                </span>
              );
            })}
            <span className="intro-question" ref={sourceQuestion}>
              ?
            </span>
          </span>
        </div>
      </div>

      <section
        className={`gallery-stage gallery-stage-${phase}`}
        aria-label="The humour me character gallery"
      >
        <header className="masthead">
          <p className="brand-mark">A character study</p>
          <p className="reveal-count" aria-live="polite">
            {phase === "intro"
              ? "take a moment"
              : phase === "complete"
                ? "the line-up"
                : `${visibleCards.length} / ${characters.length} revealed`}
          </p>
        </header>

        <ol className="character-grid" aria-label="Character cards, one per letter">
          {characters.map((character, index) => {
            const cardStyle = {
              "--card-hue": `${(index * 41 + 14) % 360}deg`,
            } as CSSProperties;
            const letterHasLanded = landedLetters.includes(index);
            const cardIsVisible = visibleCards.includes(index);

            return (
              <li className="character-slot" key={character.id}>
                <div className="letter-dock">
                  <span
                    className={`destination-letter${letterHasLanded ? " is-landed" : ""}`}
                    ref={(node) => {
                      targetLetters.current[index] = node;
                    }}
                    aria-hidden="true"
                  >
                    {character.letter}
                    {index === characters.length - 1 && (
                      <span
                        className={`destination-question${letterHasLanded ? " is-landed" : ""}`}
                        ref={targetQuestion}
                      >
                        ?
                      </span>
                    )}
                  </span>
                </div>

                <article
                  className={`character-card${cardIsVisible ? " is-visible" : ""}`}
                  style={cardStyle}
                  aria-label={`${character.letter.toUpperCase()} character card`}
                >
                  <div className="portrait-frame">
                    {character.image_url ? (
                      <Image
                        className="portrait-image"
                        src={character.image_url}
                        alt={character.name ? `${character.name} portrait` : "Character portrait"}
                        fill
                        sizes="(max-width: 760px) 22vw, 12vw"
                        unoptimized
                      />
                    ) : (
                      <div className="portrait-placeholder" role="img" aria-label="Portrait to come">
                        <span className="portrait-halo" />
                        <span className="portrait-head" />
                        <span className="portrait-shoulders" />
                        <span className="portrait-placeholder-caption">portrait</span>
                      </div>
                    )}
                  </div>
                  <div className="character-copy">
                    <p className="character-index">{String(index + 1).padStart(2, "0")}</p>
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

        <footer className="gallery-footer">
          <p className="connection-note">{setupMessage}</p>
          {phase === "complete" && (
            <button className="replay-button" type="button" onClick={onReplay}>
              Play it again <span aria-hidden="true">↗</span>
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}
