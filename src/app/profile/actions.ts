"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccount, getProfile } from "@/lib/auth";
import { isProfileComplete, validateProfileNames, type ProfileFormState } from "@/lib/profile";
import { AVATAR_BUCKET, validateAvatar } from "@/lib/avatars";
import { parseHouse } from "@/lib/owl-post/houses";

export async function saveProfile(_previousState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const { supabase, user } = await requireAccount();
  const { names, fields, valid } = validateProfileNames(formData);
  if (!valid) return { error: "Check your name below.", fields };
  const house = parseHouse(formData.get("house"));
  if (!house) return { error: "Choose your house.", fields: { house: "Choose your house." } };

  const avatar = await validateAvatar(formData.get("avatar"));
  if (avatar && "error" in avatar) return { error: avatar.error, fields: { avatar: avatar.error } };

  const profile = await getProfile(supabase, user.id);
  if (!profile) return { error: "We couldn't find your profile. Please try signing in again." };
  const onboarding = !isProfileComplete(profile);
  let newAvatarPath: string | undefined;

  if (avatar && "file" in avatar) {
    newAvatarPath = `${user.id}/${crypto.randomUUID()}.${avatar.extension}`;
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(newAvatarPath, avatar.file, {
      contentType: avatar.file.type,
      upsert: false,
    });
    if (error) return { error: "We couldn't upload your photo. Please try again." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...names, house, ...(newAvatarPath ? { avatar_path: newAvatarPath } : {}) })
    .eq("id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    if (newAvatarPath) await supabase.storage.from(AVATAR_BUCKET).remove([newAvatarPath]);
    return { error: "We couldn't save your profile. Please try again." };
  }

  // Keep the previous image until the database points to the successful upload.
  if (newAvatarPath && profile.avatar_path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([profile.avatar_path]);
  }

  revalidatePath("/profile");
  revalidatePath("/");
  if (onboarding) redirect("/");
  return { success: "Profile saved." };
}
