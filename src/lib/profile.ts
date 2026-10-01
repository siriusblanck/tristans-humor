export const NAME_MAX_LENGTH = 80;

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
};

export type ProfileFormState = {
  error?: string;
  success?: string;
  fields?: { first_name?: string; last_name?: string; avatar?: string };
};

export function isProfileComplete(profile: Pick<Profile, "first_name" | "last_name"> | null) {
  return Boolean(profile?.first_name?.trim() && profile?.last_name?.trim());
}

export function validateProfileNames(formData: FormData) {
  const fields: NonNullable<ProfileFormState["fields"]> = {};
  const names = { first_name: "", last_name: "" };

  for (const field of ["first_name", "last_name"] as const) {
    const raw = formData.get(field);
    const value = typeof raw === "string" ? raw.trim() : "";
    names[field] = value;

    if (!value) {
      fields[field] = `Add your ${field === "first_name" ? "first" : "last"} name.`;
    } else if (value.length > NAME_MAX_LENGTH) {
      fields[field] = `Use ${NAME_MAX_LENGTH} characters or fewer.`;
    }
  }

  return { names, fields, valid: Object.keys(fields).length === 0 };
}
