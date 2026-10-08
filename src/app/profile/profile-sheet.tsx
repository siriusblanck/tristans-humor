"use client";

import Image from "next/image";
import { useActionState, useEffect, useEffectEvent, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { signOut } from "@/app/auth/actions";
import { Seal } from "@/app/_front-page/art";
import Portrait from "@/app/_front-page/portrait";
import { AVATAR_ACCEPT, validateAvatarMetadata } from "@/lib/avatars";
import { HOUSES } from "@/lib/owl-post/houses";
import { NAME_MAX_LENGTH, initialOf, type ProfileFormState, type ProfileStep } from "@/lib/profile";
import { saveProfile } from "./actions";
import type { ProfileDetails } from "./types";
import controls from "@/app/_front-page/controls.module.css";
import styles from "./profile.module.css";

// First sign-in says what's needed; editing needs no words (its heading is for screen readers).
const HEADINGS: Record<Exclude<ProfileStep, "edit">, { eyebrow?: string; title: ReactNode; sub?: string }> = {
  name: { title: <>First, your name<span>?</span></> },
  house: { eyebrow: "One more thing", title: <>Now, your house<span>?</span></>, sub: "Pick a house for the weekly House Cup, then send your first owl." },
};

const NAME_FIELDS = [
  { field: "first_name", label: "First name", autoComplete: "given-name", value: "firstName" },
  { field: "last_name", label: "Last name", autoComplete: "family-name", value: "lastName" },
] as const;

const rise = (index: number) => ({ "--i": index } as CSSProperties);

/**
 * Your profile as one full-screen sheet over the night: photo, names, house and save, wired
 * to the same `saveProfile` action as always. Picking a house re-colours the sheet in its gem.
 * The front page opens it as a dialog; /profile shows it on its own (and for first sign-in).
 */
export default function ProfileSheet({ details, step, close, photoRef, onSaved }: {
  details: ProfileDetails;
  step: ProfileStep;
  /** The close control in the corner, if the sheet can be left. */
  close: ReactNode;
  /** The big photo, so the dialog can fly it from the avatar. */
  photoRef?: Ref<HTMLLabelElement>;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(saveProfile, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const heading = step === "edit" ? null : HEADINGS[step];

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // A successful save shows the saved photo rather than the local preview (whose object URL
  // the effect above then revokes).
  const [answered, setAnswered] = useState(state);
  if (answered !== state) {
    setAnswered(state);
    if (state.success) {
      setPreview(null);
      setPhotoError(null);
    }
  }

  const saved = useEffectEvent(() => {
    // Clear the file input after saving so a later name edit doesn't reupload it.
    if (fileInput.current) fileInput.current.value = "";
    onSaved?.();
  });

  useEffect(() => {
    if (state.success) saved();
  }, [state]);

  const photoUrl = preview ?? details.photoUrl;
  const avatarError = photoError ?? state.fields?.avatar;
  const initial = details.firstName ? initialOf(details.firstName) : "?";

  return (
    <div className={styles.sheet}>
      <div className={styles.stage}>
        <header className={styles.top} data-rise style={rise(0)}>
          <p className={styles.wordmark}>Hog Wumbia</p>
          <div className={styles.topActions}>
            <form action={signOut}><button type="submit" className={styles.signOut}>Sign out</button></form>
            {close}
          </div>
        </header>

        <form className={styles.form} action={formAction}>
          <fieldset className={styles.fields} disabled={pending}>
            <legend className="visually-hidden">Your profile details</legend>

            <div className={styles.side}>
              <div className={styles.watermark} aria-hidden="true" data-rise>
                {HOUSES.map(({ id }) => <Image key={id} data-house={id} src={`/crests/${id}.png`} alt="" width={270} height={300} loading="eager" />)}
              </div>
              {/* The photo is the way to change it: hover (or focus) shows how, a click picks a file. */}
              <label ref={photoRef} htmlFor="avatar" className={styles.photo}>
                <Portrait className={`${controls.avatarFace} ${styles.face}`} photoUrl={photoUrl} initial={initial} />
                <span className={styles.photoHint}>{photoUrl ? "Change photo" : "Add a photo"}</span>
              </label>
              <input
                ref={fileInput}
                className={styles.photoInput}
                id="avatar"
                name="avatar"
                type="file"
                accept={AVATAR_ACCEPT}
                aria-describedby="photo-help"
                aria-invalid={Boolean(avatarError)}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const error = validateAvatarMetadata(file);
                  setPhotoError(error);
                  if (error) { event.target.value = ""; setPreview(null); return; }
                  setPreview(URL.createObjectURL(file));
                }}
              />
              <p id="photo-help" className="visually-hidden">JPG, PNG or WebP. Up to 3 MB. Optional.</p>
              {avatarError && <p className={`field-error ${styles.error} ${styles.photoError}`} role="alert">{avatarError}</p>}
            </div>

            <div className={styles.main}>
              {heading ? (
                <div className={styles.heading} data-rise style={rise(1)}>
                  {heading.eyebrow && <p className={styles.eyebrow}>{heading.eyebrow}</p>}
                  <h1 id="profile-title" className={styles.title}>{heading.title}</h1>
                  {heading.sub && <p className={styles.sub}>{heading.sub}</p>}
                </div>
              ) : <h1 id="profile-title" className="visually-hidden">Your profile</h1>}

              <div className={styles.names} data-rise style={rise(2)}>
                {NAME_FIELDS.map(({ field, label, autoComplete, value }) => (
                  <div className={styles.field} key={field}>
                    <label htmlFor={field}>{label}</label>
                    <input
                      id={field}
                      name={field}
                      type="text"
                      autoComplete={autoComplete}
                      defaultValue={details[value]}
                      placeholder={label}
                      maxLength={NAME_MAX_LENGTH}
                      required
                      aria-invalid={Boolean(state.fields?.[field])}
                      aria-describedby={state.fields?.[field] ? `${field}-error` : undefined}
                    />
                    {state.fields?.[field] && <p id={`${field}-error`} className={`field-error ${styles.error}`}>{state.fields[field]}</p>}
                  </div>
                ))}
              </div>

              <fieldset className={styles.houses} data-rise style={rise(3)}>
                <legend className={styles.label}>Your house</legend>
                <div className={styles.houseOptions}>
                  {HOUSES.map((house) => (
                    <label key={house.id} className={styles.house} data-house={house.id}>
                      <input type="radio" name="house" value={house.id} defaultChecked={details.house === house.id} required />
                      <Image className={styles.houseCrest} src={`/crests/${house.id}.png`} alt="" width={64} height={72} />
                      <span className={styles.houseName}>{house.name}</span>
                      <span className={styles.houseMotto}>{house.motto}</span>
                    </label>
                  ))}
                </div>
                {state.fields?.house && <p className={`field-error ${styles.error}`} role="alert">{state.fields.house}</p>}
              </fieldset>

              <div className={styles.footer} data-rise style={rise(4)}>
                <div className={styles.email}><span>Signed in with Google</span><p>{details.email}</p></div>
                <button className={`${controls.sealButton} ${styles.savePill}`} type="submit" aria-busy={pending}>
                  <Seal size={30} />
                  {pending ? "Saving…" : step === "edit" ? "Save changes" : "Let’s go"}
                </button>
              </div>
              {state.error && <p className={`form-message field-error ${styles.error}`} role="alert">{state.error}</p>}
              {state.success && !onSaved && <p className={`form-message ${styles.saved}`} role="status">{state.success}</p>}
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
