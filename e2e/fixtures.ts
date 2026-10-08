import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Seeds one owl by a disposable author so the feed has something to vote on.
// Deleting the author cascades to the generation; the picture is removed explicitly.
const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Vn8AAAAASUVORK5CYII=", "base64");

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("E2E fixtures need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type OwlFixture = { userId: string; generationId: string; imagePath: string; caption: string };

export async function seedOwl(newYorkDate: string): Promise<OwlFixture> {
  const client = admin();
  const runId = randomUUID();
  const { data: created, error: userError } = await client.auth.admin.createUser({
    email: `humour-e2e-${runId}@example.com`, password: `${randomUUID()}!Aa1`, email_confirm: true,
  });
  if (userError || !created.user) throw new Error(`Couldn't create the fixture author: ${userError?.message}`);

  const userId = created.user.id;
  const generationId = randomUUID();
  const imagePath = `${userId}/${generationId}.png`;
  const caption = `E2E owl ${runId.slice(0, 8)}`;
  const [{ data: character }, { data: owlPost }] = await Promise.all([
    client.from("characters").select("id").order("sort_order").limit(1).single(),
    client.from("owl_posts").select("id").limit(1).single(),
  ]);
  const upload = await client.storage.from("generations").upload(imagePath, PNG_1X1, { contentType: "image/png" });
  if (upload.error) throw new Error(`Couldn't upload the fixture picture: ${upload.error.message}`);

  const { error } = await client.from("generations").insert({
    id: generationId, author_id: userId, author_display: "E2E T.", house: "hufflepuff", character_id: character!.id,
    owl_post_id: owlPost!.id, owl_post_date: newYorkDate, caption, image_path: imagePath, image_alt: "A fixture picture.",
    caption_prompt: "e2e", image_prompt: "e2e", caption_model: "e2e", image_model: "e2e",
  });
  if (error) throw new Error(`Couldn't insert the fixture owl: ${error.message}`);
  return { userId, generationId, imagePath, caption };
}

export async function removeOwl(fixture: OwlFixture | undefined) {
  if (!fixture) return;
  const client = admin();
  await client.storage.from("generations").remove([fixture.imagePath]);
  const { error } = await client.auth.admin.deleteUser(fixture.userId);
  if (error) throw new Error(`Couldn't delete the fixture author: ${error.message}`);
}
