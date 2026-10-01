"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveProfile } from "./actions";
import { NAME_MAX_LENGTH, type Profile, type ProfileFormState } from "@/lib/profile";
import { AVATAR_ACCEPT, validateAvatarMetadata } from "@/lib/avatars";

export default function ProfileForm({ profile, email, avatarUrl, onboarding }: {
  profile: Profile | null;
  email: string;
  avatarUrl: string | null;
  onboarding: boolean;
}) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(saveProfile, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Clear the file input after saving so a later name edit doesn't reupload it.
  useEffect(() => {
    if (state.success && fileInput.current) fileInput.current.value = "";
  }, [state]);

  const displayedPhoto = preview ?? avatarUrl;
  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}` || "?";
  const avatarError = photoError ?? state.fields?.avatar;

  return (
    <form className="profile-form" action={formAction}>
      <fieldset disabled={pending}>
        <legend className="visually-hidden">Your profile details</legend>
        <div className="photo-field">
          <div className="profile-photo">
            {displayedPhoto ? (
              <Image src={displayedPhoto} alt="Your profile photo" fill sizes="112px" unoptimized />
            ) : <span aria-label="No profile photo">{initials}</span>}
          </div>
          <div className="photo-field-copy">
            <label className="photo-upload" htmlFor="avatar">{displayedPhoto ? "Change photo" : "Add a photo"}</label>
            <input
              ref={fileInput}
              className="photo-input"
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
            <p id="photo-help">JPG, PNG or WebP. Up to 3 MB. Optional.</p>
            {avatarError && <p className="field-error" role="alert">{avatarError}</p>}
          </div>
        </div>

        <div className="name-fields">
          {(["first_name", "last_name"] as const).map((field) => (
            <div className="form-field" key={field}>
              <label htmlFor={field}>{field === "first_name" ? "First name" : "Last name"}</label>
              <input
                id={field}
                name={field}
                type="text"
                autoComplete={field === "first_name" ? "given-name" : "family-name"}
                defaultValue={profile?.[field] ?? ""}
                placeholder={field === "first_name" ? "First name" : "Last name"}
                maxLength={NAME_MAX_LENGTH}
                required
                aria-invalid={Boolean(state.fields?.[field])}
                aria-describedby={state.fields?.[field] ? `${field}-error` : undefined}
              />
              {state.fields?.[field] && <p id={`${field}-error`} className="field-error">{state.fields[field]}</p>}
            </div>
          ))}
        </div>
        <div className="profile-email"><span>Signed in with Google</span><p>{email}</p></div>
        <button className="profile-submit" type="submit">
          {pending ? "Saving..." : onboarding ? "Let's go" : "Save changes"}<span aria-hidden="true">↗</span>
        </button>
      </fieldset>
      {state.error && <p className="form-message field-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-message" role="status">{state.success}</p>}
    </form>
  );
}
