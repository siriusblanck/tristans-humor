import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/* Live behavior inventory (creates and cleans up only its own disposable fixtures):
 * auth.users trigger inserts nullable names; user can read/update their own profile.
 * Another user and anonymous requests cannot read/edit that profile or its photo.
 * Private bucket, allowed MIME types, file size limit, folder ownership, signed download.
 * Optional local HTTP checks: signed-out gate, incomplete-name gate, complete gallery,
 * relative callback redirects that preserve the browser's original cookie host.
 * No service key is stored in app files or emitted in output.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert(url && anonKey, "Set the public Supabase environment variables first.");
const ref = new URL(url).hostname.split(".")[0];
const keys = JSON.parse(execFileSync("supabase", ["projects", "api-keys", "--project-ref", ref, "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
const serviceKey = keys.find((key) => key.name === "service_role")?.api_key;
assert(serviceKey, "Supabase CLI needs access to the project's service role key.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, options);
const anon = createClient(url, anonKey, options);
const fixtures = [];
let uploadedPath;
const runId = randomUUID();
const password = `${randomUUID()}!Aa1`;
const cookies = new Map();
const owner = createServerClient(url, anonKey, {
  cookies: {
    getAll: () => Array.from(cookies, ([name, value]) => ({ name, value })),
    setAll: (values) => values.forEach(({ name, value }) => cookies.set(name, value)),
  },
});
const other = createClient(url, anonKey, options);
const check = (result, label) => { assert.equal(result.error, null, `${label}: ${result.error?.message}`); return result.data; };
const profileColumns = "id, first_name, last_name, avatar_path";

async function requestLocal(path, authenticated = false) {
  const headers = authenticated ? { cookie: Array.from(cookies, ([name, value]) => `${name}=${value}`).join("; ") } : {};
  return fetch(new URL(path, process.env.TEST_APP_URL), { redirect: "manual", headers });
}

try {
  for (const index of [1, 2]) {
    const email = `humour-check-${runId}-${index}@example.com`;
    const data = check(await admin.auth.admin.createUser({ email, password, email_confirm: true }), "create fixture user");
    fixtures.push(data.user);
  }
  const ownerId = fixtures[0].id;
  const newProfile = check(await admin.from("profiles").select(profileColumns).eq("id", ownerId).single(), "trigger profile");
  assert.deepEqual(newProfile, { id: ownerId, first_name: null, last_name: null, avatar_path: null });
  console.log("PASS auth.users trigger creates a profile with nullable names");

  check(await owner.auth.signInWithPassword({ email: fixtures[0].email, password }), "owner sign-in");
  check(await other.auth.signInWithPassword({ email: fixtures[1].email, password }), "other sign-in");
  assert.deepEqual(check(await owner.from("profiles").select(profileColumns).eq("id", ownerId).single(), "owner profile"), newProfile);
  assert.deepEqual(check(await other.from("profiles").select("id").eq("id", ownerId), "other profile read"), []);
  assert((await anon.from("profiles").select("id")).error, "anonymous profile read must be denied");
  assert.deepEqual(check(await other.from("profiles").update({ first_name: "Intruder" }).eq("id", ownerId).select("id"), "other profile update"), []);
  assert((await owner.from("profiles").update({ first_name: " " }).eq("id", ownerId)).error, "database rejects blank names");
  assert((await owner.from("profiles").update({ id: fixtures[1].id }).eq("id", ownerId)).error, "profile identity is immutable to authenticated users");
  console.log("PASS profile ownership, anonymous denial, immutable ID, and name constraints");

  if (process.env.TEST_APP_URL) {
    for (const [path, destination] of [["/auth/callback", "/?auth=error"], ["/auth/callback?error=access_denied", "/?auth=cancelled"]]) {
      const response = await requestLocal(path);
      assert.equal(response.status, 307); assert.equal(response.headers.get("location"), destination);
    }
    for (const path of ["/gallery", "/profile"]) {
      const response = await requestLocal(path);
      assert.equal(response.status, 307); assert.equal(new URL(response.headers.get("location"), process.env.TEST_APP_URL).pathname, "/");
    }
    const incompleteGallery = await requestLocal("/gallery", true);
    assert.equal(incompleteGallery.status, 307); assert.equal(new URL(incompleteGallery.headers.get("location"), process.env.TEST_APP_URL).pathname, "/profile");
    const incompleteHome = await requestLocal("/", true);
    assert.equal(incompleteHome.status, 307); assert.equal(new URL(incompleteHome.headers.get("location"), process.env.TEST_APP_URL).pathname, "/profile");
    console.log("PASS server route protection and first-sign-in onboarding");
  }

  const bucket = check(await admin.storage.getBucket("avatars"), "avatar bucket");
  assert.equal(bucket.public, false); assert.equal(bucket.file_size_limit, 3145728);
  assert.deepEqual([...bucket.allowed_mime_types].sort(), ["image/jpeg", "image/png", "image/webp"]);
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Vn8AAAAASUVORK5CYII=", "base64");
  uploadedPath = `${ownerId}/${runId}.png`;
  check(await owner.storage.from("avatars").upload(uploadedPath, image, { contentType: "image/png" }), "own avatar upload");
  assert((await other.storage.from("avatars").upload(`${ownerId}/intruder-${runId}.png`, image, { contentType: "image/png" })).error, "foreign folder upload must be denied");
  assert((await owner.storage.from("avatars").upload(`${ownerId}/invalid-${runId}.svg`, "<svg/>", { contentType: "image/svg+xml" })).error, "SVG upload must be denied");
  assert((await other.storage.from("avatars").createSignedUrl(uploadedPath, 60)).error, "another user cannot sign a photo URL");
  const signed = check(await owner.storage.from("avatars").createSignedUrl(uploadedPath, 60), "own signed avatar");
  const download = await fetch(signed.signedUrl);
  assert.equal(download.status, 200); assert.deepEqual(Buffer.from(await download.arrayBuffer()), image);
  const publicDownload = await fetch(`${url}/storage/v1/object/public/avatars/${uploadedPath}`);
  assert(publicDownload.status >= 400, "a private photo must not have a public download URL");
  console.log("PASS private photo storage, ownership, MIME restrictions, and signed download");

  const saved = check(await owner.from("profiles").update({ first_name: "Test", last_name: "User", avatar_path: uploadedPath }).eq("id", ownerId).select(profileColumns).single(), "save profile");
  assert.deepEqual(saved, { id: ownerId, first_name: "Test", last_name: "User", avatar_path: uploadedPath });
  assert((await owner.from("profiles").update({ avatar_path: `${fixtures[1].id}/photo.png` }).eq("id", ownerId)).error, "foreign avatar references must be denied");
  if (process.env.TEST_APP_URL) {
    const gallery = await requestLocal("/gallery", true);
    assert.equal(gallery.status, 200);
    assert((await gallery.text()).includes("character-card"), "signed-in gallery includes character cards");
    const profile = await requestLocal("/profile", true);
    assert.equal(profile.status, 200);
    const html = await profile.text();
    assert(html.includes('value="Test"') && html.includes('value="User"'), "profile form contains saved names");
    const home = await requestLocal("/", true);
    assert.equal(home.status, 307); assert.equal(new URL(home.headers.get("location"), process.env.TEST_APP_URL).pathname, "/gallery");
    console.log("PASS completed profile opens gallery and persists name/photo settings");
  }
} finally {
  if (uploadedPath) {
    const removed = await admin.storage.from("avatars").remove([uploadedPath]);
    assert.equal(removed.error, null, "test photo cleanup");
  }
  for (const user of fixtures) {
    check(await admin.auth.admin.deleteUser(user.id), "test user cleanup");
  }
  console.log("Cleaned up disposable test users and photo.");
}
