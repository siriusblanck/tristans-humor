# Humour me...

An animated character gallery with Google sign-in and a personal profile. The existing assignment #2 Supabase project and Vercel project are reused.

## App flow

1. `/` reveals **Humour me...** in the top left, followed by an underlined **Signing in** button in the bottom right.
2. Clicking the button starts Google OAuth through Supabase using the PKCE flow. The app's `redirectTo` is exactly `<current-origin>/auth/callback`, with no additional query parameters.
3. `/auth/callback` exchanges the authorization code for a cookie session. Users missing either name go to `/profile` to introduce themselves.
4. After the user saves both names, `/gallery` plays the original letter-to-card animation and shows the character images.
5. **Profile** lets users edit their names and choose an optional photo. **Sign out** ends this browser's session and returns to the opening screen.

`/gallery` and `/profile` verify the user on the server before fetching data. The Next.js 16 `src/proxy.ts` refreshes session cookies; pages and server actions independently verify identity. Reduced-motion preferences disable the entrance transitions and letter movement.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the existing project's public values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Use the same variables in the existing Vercel project's **Preview** and **Production** environments. OAuth client secrets belong in Supabase's Google provider settings; they are not application environment variables. Never commit `.env.local` or service-role credentials.

## Supabase schema and photos

Apply the migration to the existing linked project:

```bash
supabase db push
```

`supabase/migrations/20261001000000_profiles_and_avatars.sql` adds:

- `profiles`, keyed to `auth.users.id`, with nullable `first_name`, `last_name`, and `avatar_path` fields.
- An `auth.users` insertion trigger that creates one profile per new user, plus a backfill for existing users.
- An update timestamp trigger and policies allowing each user to read and update their own profile.
- A private `avatars` Storage bucket, with access restricted to each user's folder.

Both names are required to enter the gallery and are limited to 80 characters in the form. Photos are optional JPG, PNG, or WebP files up to 3 MiB. The server checks the file's type, size, and signature. Images are uploaded to Storage; the database stores only a path. The Profile page issues a temporary signed URL to show the photo. Replacing a photo removes the previous upload after the profile update succeeds.

The existing `characters` table remains the source for the seven gallery cards: `h`, `u`, `m`, `o`, `r`, `m`, `e`. Edit `name`, `image_url`, and `fact` in Supabase; `sort_order` sets the order.

## Google OAuth setup

Follow the [Supabase Google provider guide](https://supabase.com/docs/guides/auth/social-login/auth-google). There are two callback URLs in this flow:

| Setting | Value |
| --- | --- |
| Google OAuth client's authorized redirect URI | `https://<supabase-project-ref>.supabase.co/auth/v1/callback` |
| App's OAuth `redirectTo` and Supabase redirect allowlist | `https://<app-host>/auth/callback` |

Create a **Web application** OAuth client in your own Google Cloud project, configure the consent screen with the basic OpenID, email, and profile scopes, and enable the **Google** provider in Supabase with that client's ID and secret. To accept sign-ins from everyone, publish the OAuth consent screen; if you keep it in testing mode, add the required test users.

In **Supabase → Authentication → URL Configuration**, use the production app as the Site URL and add each exact callback you need:

```text
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
https://tristans-humor.vercel.app/auth/callback
https://<commit-specific-vercel-host>/auth/callback
```

Every new Vercel preview has its own origin. Add that deployment's exact callback URL before testing Google sign-in there. In the existing Vercel project's **Deployment Protection** settings, keep Vercel Authentication and password protection off for the submission deployment so it can be opened in Incognito mode. Submit the unique deployment URL tied to the assignment's commit.

## Verification

```bash
npm run lint
npm run test:coverage
npm run build
```

The automated tests cover verified-session checks, code exchange and cancellation, redirects and hostile redirect inputs, required names, file size/type/signature boundaries, private upload paths, save failures and cleanup, sign-out, and cookie refresh.

For a live check against the existing Supabase project, sign in to the Supabase CLI and run:

```bash
npm run test:integration
```

This creates two disposable test users and a tiny photo, checks the real trigger, profile and photo ownership policies, and private downloads, then cleans up its fixtures. It obtains the service-role key from the authenticated CLI in memory. To also check the app's server routes, start the local app and run:

```bash
TEST_APP_URL=http://localhost:3000 npm run test:integration
```
