"use client";

import { useActionState, useState } from "react";
import { submitGeneration } from "./actions";
import LetterPicker, { type CastOption } from "./letter-picker";
import { TWIST_MAX_LENGTH, type ComposerState } from "@/lib/owl-post/inputs";
import { USER_DAILY_LIMIT } from "@/lib/owl-post/limits";
import styles from "./front-page.module.css";

export default function Composer({ cast, remaining }: { cast: CastOption[]; remaining: number }) {
  const [state, formAction, pending] = useActionState<ComposerState, FormData>(submitGeneration, {});
  const [selected, setSelected] = useState<string | null>(null);
  const [twist, setTwist] = useState("");
  const [landedId, setLandedId] = useState<string>();
  const outOfOwls = remaining === 0;

  // Start fresh after each owl lands (React's pattern for adjusting state during render).
  if (state.generationId && state.generationId !== landedId) {
    setLandedId(state.generationId);
    setSelected(null);
    setTwist("");
  }

  return (
    <form className={styles.composer} action={formAction} aria-busy={pending}>
      <LetterPicker cast={cast} selected={selected} onSelect={setSelected} flying={pending} error={state.fields?.character_id} />

      <fieldset className={styles.send} disabled={pending || outOfOwls}>
        <legend className="visually-hidden">Send an owl</legend>
        <div className={styles.twist}>
          <label htmlFor="twist">Add a twist <span>(optional)</span></label>
          <input
            id="twist"
            name="twist"
            type="text"
            value={twist}
            onChange={(event) => setTwist(event.target.value)}
            maxLength={TWIST_MAX_LENGTH}
            placeholder="my RA saw the whole thing"
            autoComplete="off"
            aria-invalid={Boolean(state.fields?.twist)}
            aria-describedby="owls-left"
          />
          {state.fields?.twist && <p className="field-error">{state.fields.twist}</p>}
        </div>
        <button className={styles.sendButton} type="submit">
          {pending ? "Sending..." : "Send the owl"}<span aria-hidden="true">↗</span>
        </button>
      </fieldset>

      <p id="owls-left" className={styles.owlsLeft}>
        {outOfOwls ? "No owls left today. More arrive at midnight." : `${remaining} of ${USER_DAILY_LIMIT} owls left today`}
      </p>
      {pending && (
        <p className={styles.status} role="status">
          Sending your owl. The words take a few seconds; the picture can take up to a minute.
        </p>
      )}
      {!pending && state.error && <p className={`${styles.status} field-error`} role="alert">{state.error}</p>}
      {!pending && state.success && (
        <p className={styles.status} role="status">
          {state.success} <a href={`#owl-${state.generationId}`}>See it in the feed</a>
        </p>
      )}
    </form>
  );
}
