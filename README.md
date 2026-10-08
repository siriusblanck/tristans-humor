# Humour me... · Owl Post

A daily caption contest for Columbia students who are new to New York. Every day there is one **Owl Post**, a New York or Columbia moment ("The 1 train skips 116th Street. Again."). Signed-in readers pick one of seven wizarding-world writers, add an optional twist, and Gemini writes that character's caption and paints the scene. Everyone can browse the feed; signed-in readers award or take away points, and points on your owls count for your house in a weekly **House Cup**.

The existing assignment #2/#3 Supabase and Vercel projects are reused.

## App flow

1. `/` is the public front page: today's Owl Post, the House Cup, the writer picker, today's owls (most points first), and the past week's best. Signed-out visitors can read everything; the vote buttons and the writer picker invite them to sign in.
2. **Sign in** starts Google OAuth through Supabase (PKCE). The app's `redirectTo` is exactly `<current-origin>/auth/callback`.
3. `/auth/callback` exchanges the code for a cookie session. Users missing a name or a house go to `/profile`; everyone else returns to `/`.
4. The writer picker is the word **h u m o r m e**: each letter is one character (Hagrid, Umbridge, McGonagall, Ollivander, Ron, Molly, Errol). Choose a letter, add a twist (optional, 140 characters), and **Send the owl**. Each account can send 3 owls a day; the whole app sends at most 100.
5. Selecting ▲ or ▼ on someone else's owl inserts your vote; selecting it again removes it. You can't vote on your own owls.
6. `/gallery` permanently redirects to `/`.

`src/proxy.ts` refreshes session cookies; pages and server actions verify the user again before reading or writing. Reduced-motion preferences turn off the letter and photo animations.

## How a post is made

`src/lib/owl-post/create-generation.ts` holds the decisions; every side effect is injected, so the flow is unit-tested without a network or database.

1. Load the cast and today's Owl Post (picked by New York calendar day), then **reserve a slot** with `claim_generation_slot()`. It counts today's posts plus in-flight reservations and reserves one under a Postgres advisory lock, so simultaneous requests can't all slip under the limit before any of them is saved. The reservation is released when the post is saved or fails, and expires after 3 minutes if a server instance dies.
2. **Caption:** the text model writes `{ caption, scene }` as JSON in the character's voice. The reader's twist is fenced in `<twist>` tags and treated as a story detail, not instructions.
3. **Picture:** the image model paints `scene`. Character and franchise names are scrubbed from the image prompt; each character is described by their `appearance` instead, which avoids refusals for named fictional characters.
4. The picture is uploaded to the public `generations` bucket, then the row is inserted with both prompts, both model ids, and the scene as alt text. If the insert fails, the upload is removed.

## Data and row-level security

Migrations: `supabase/migrations/20261008000000_owl_post.sql`, `20261008010000_generation_alt_text.sql`, and `20261008020000_generation_claims.sql`.

Supabase grants `anon` and `authenticated` every table privilege by default, and RLS doesn't govern `TRUNCATE`. Every table therefore starts from `revoke all` and gets only what the app uses; RLS policies then filter rows.

| Table | Signed out (`anon`) | Signed in (`authenticated`) | Written by |
| --- | --- | --- | --- |
| `characters` | read | read | migrations only |
| `owl_posts` (21 prompts) | read | read | migrations only |
| `profiles` (+ `house`) | — | read/update **own row** | the user |
| `generations` | read display columns only | display columns + `author_id` | **server only** (secret key) |
| `votes` | — | read/insert/update/delete **own votes**, never on own posts | the user, through `cast_vote()` |
| `house_points` (view, `security_invoker`) | read | read | — |
| `generation_claims` (daily-limit reservations) | — | — | **server only**, via `claim_generation_slot()` |
| Storage `generations` (public) | public URLs | public URLs | **server only** |

- Prompts, model ids, and twists are stored on `generations` but not granted to clients.
- `cast_vote(target_generation, vote)` is `SECURITY INVOKER`: it runs with the caller's grants and policies. Users can only insert `(generation_id, value)`; `voter_id` always comes from `auth.uid()`.
- A `SECURITY DEFINER` trigger keeps `upvotes`/`downvotes` current, so votes can stay private to their owners.
- Users have no write access to `generations` at all, so nobody can skip Gemini (or the daily limit) and post their own text. Only `src/lib/supabase/admin.ts`, used after the server verifies the session, holds the secret key.

Check every grant and policy against the live project (the transaction is rolled back):

```bash
{ echo "begin;"; cat supabase/tests/owl_post_rls.sql; echo "rollback;"; } > /tmp/rls.sql
supabase db query --linked -f /tmp/rls.sql -o table
```

It prints one PASS/FAIL line per check (31 checks).

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

| Variable | Where it's used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser and server |
| `SUPABASE_SECRET_KEY` | server only: writes generations and their pictures |
| `GEMINI_API_KEY` | server only. **Image models have no free tier:** the key's Google Cloud project needs billing enabled (minimum $5 prepay, about $0.034 per picture). Without it, captions work but every send fails with a quota error. |
| `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL` | optional overrides (defaults: `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite-image`) |

Set the same variables in the Vercel project's **Preview** and **Production** environments. Never commit `.env.local` or the secret key.

Apply migrations to the linked project with `supabase db push`.

## Google OAuth setup

Follow the [Supabase Google provider guide](https://supabase.com/docs/guides/auth/social-login/auth-google). There are two callback URLs in this flow:

| Setting | Value |
| --- | --- |
| Google OAuth client's authorized redirect URI | `https://<supabase-project-ref>.supabase.co/auth/v1/callback` |
| App's OAuth `redirectTo` and Supabase redirect allowlist | `https://<app-host>/auth/callback` |

In **Supabase → Authentication → URL Configuration**, use the production app as the Site URL and add each exact callback you need:

```text
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
https://tristans-humor.vercel.app/auth/callback
https://<commit-specific-vercel-host>/auth/callback
```

Every new Vercel preview has its own origin. Add that deployment's exact callback URL before testing Google sign-in there. In the Vercel project's **Deployment Protection** settings, keep Vercel Authentication and password protection off so the submission deployment opens in Incognito mode. Submit the unique deployment URL tied to the assignment's commit.

The public `/privacy` and `/terms` pages describe what is public (captions, pictures, first name with last initial, house), what Gemini receives, and the SynthID watermark.

## Verification

```bash
npm run lint
npm run test:coverage
npm run build
```

The unit tests cover the New York calendar (evening and daylight-saving boundaries), Owl Post rotation, prompt fencing and name scrubbing, Gemini refusal/empty/malformed responses and image byte checks, daily limits, the generation flow's ordering and cleanup, vote input and error mapping, feed parsing, the House Cup, and the existing sign-in, profile, and photo behavior.

`npm run test:e2e` runs the signed-out journeys in Playwright (desktop and phone) against a production build on port 3200: the public front page, reading owls without being able to vote, redirects, the cancelled-sign-in message, legal pages, and no sideways scrolling. It seeds one owl by a disposable author and deletes it afterwards. Google sign-in itself isn't automated.

For a live check against the Supabase project, sign in to the Supabase CLI and run `npm run test:integration` (add `TEST_APP_URL=http://localhost:3000` to also check the app's routes). It creates disposable users and cleans them up.
