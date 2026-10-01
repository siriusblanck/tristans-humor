export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

export function validateAvatarMetadata(file: File): string | null {
  if (!AVATAR_ACCEPT.split(",").includes(file.type)) {
    return "Choose a JPG, PNG, or WebP photo.";
  }
  if (file.size === 0) return "That photo is empty. Choose another file.";
  if (file.size > AVATAR_MAX_BYTES) return "Choose a photo smaller than 3 MB.";
  return null;
}

export async function validateAvatar(value: FormDataEntryValue | null) {
  if (value === null || (value instanceof File && value.size === 0 && !value.name)) {
    return null;
  }
  if (!(value instanceof File)) {
    return { error: "Choose a JPG, PNG, or WebP photo." };
  }
  const error = validateAvatarMetadata(value);
  if (error) return { error };

  const bytes = new Uint8Array(await value.slice(0, 12).arrayBuffer());
  const matches = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);

  const valid =
    (value.type === "image/jpeg" && matches([0xff, 0xd8, 0xff])) ||
    (value.type === "image/png" && matches([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (value.type === "image/webp" && matches([0x52, 0x49, 0x46, 0x46]) && matches([0x57, 0x45, 0x42, 0x50], 8));

  if (!valid) return { error: "That file isn't a valid JPG, PNG, or WebP photo." };

  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[value.type]!;
  return { file: value, extension };
}
