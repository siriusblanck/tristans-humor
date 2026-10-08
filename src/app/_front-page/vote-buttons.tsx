"use client";

import { useOptimistic, useState, useTransition } from "react";
import { castVote } from "./actions";
import SignInButton from "@/app/sign-in-button";
import type { VoteValue } from "@/lib/owl-post/inputs";
import styles from "./front-page.module.css";

type Tally = { score: number; myVote: VoteValue };

export default function VoteButtons({ generationId, score, myVote, isMine, signedIn }: Tally & {
  generationId: string;
  isMine: boolean;
  signedIn: boolean;
}) {
  // The optimistic tally shows instantly; the revalidated page replaces it with the real one.
  const [tally, setOptimisticVote] = useOptimistic<Tally, VoteValue>({ score, myVote }, (current, next) => ({
    score: current.score - current.myVote + next,
    myVote: next,
  }));
  // One vote at a time: overlapping requests could land out of order. aria-disabled (not
  // disabled) keeps keyboard focus on the button while the vote is in flight.
  const [voting, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [askToSignIn, setAskToSignIn] = useState(false);

  if (isMine) {
    return <p className={styles.votes}><span className={styles.mine}>Your owl</span><span className={styles.score}>{score}</span></p>;
  }

  function vote(direction: 1 | -1) {
    if (!signedIn) return setAskToSignIn(true);
    if (voting) return;
    const next: VoteValue = tally.myVote === direction ? 0 : direction;
    setMessage(undefined);
    startTransition(async () => {
      setOptimisticVote(next);
      const result = await castVote(generationId, next);
      if (!result.ok) setMessage(result.error);
    });
  }

  return (
    <div className={styles.voteArea}>
      <div className={styles.votes} role="group" aria-label="Points">
        <button type="button" className={styles.vote} aria-pressed={tally.myVote === 1} aria-label="Award a point" aria-disabled={voting} onClick={() => vote(1)}>▲</button>
        <span className={styles.score} aria-live="polite">{tally.score}</span>
        <button type="button" className={styles.vote} aria-pressed={tally.myVote === -1} aria-label="Take away a point" aria-disabled={voting} onClick={() => vote(-1)}>▼</button>
      </div>
      {askToSignIn && (
        <p className={styles.votePrompt}>
          Points come from signed-in readers. <SignInButton label="Sign in to vote" />
        </p>
      )}
      {message && <p className={`${styles.votePrompt} field-error`} role="alert">{message}</p>}
    </div>
  );
}
