# Hog Wumbia

Columbia humour, delivered by owl. Every week there is one **Owl Post** prompt, a New York or Columbia moment ("The halal cart on Broadway at 1 a.m."). Signed-in readers pick one of seven wizarding-world writers, add an optional twist, and Gemini writes that character's caption and paints the scene. Everyone can browse the owls; signed-in readers award or take away points, and points on your owls count for your house in the week's hourglasses.

The existing assignment #2/#3 Supabase and Vercel projects are reused.

## App flow

1. `/` is the public front page, drawn as a glittering night sky over Low Library (the stars are seeded, so server and browser draw the same sky). Once a week (per browser) an owl delivers the prompt as a letter, which flies up into the prompt bar; tap the bar to see it again. On the left, each house's crest sits beside a turned-wood hourglass holding the week's points; sand trickles while the top still holds some, and a glass shakes when points arrive. In the middle is a stack of this week's owls as letters (most points first): swipe, use ← →, or ‹ › to browse; browsing never votes. The vote dock floats under the front card. Signed-out visitors can read everything; voting or sending opens the sign-in letter, and after Google they land back on the same owl.
2. **Sign in** starts Google OAuth through Supabase (PKCE). The app's `redirectTo` is exactly `<current-origin>/auth/callback`.
3. `/auth/callback` exchanges the code for a cookie session. Users missing a name or a house go to `/profile`; everyone else returns to `/`.
4. **Send in your owl** blurs everything but the prompt bar and fans out the seven writers as cards (Hagrid, Umbridge, McGonagall, Ollivander, Ron, Molly, Errol). Choose one, add a twist (optional, 140 characters), and **Send owl**; an owl carries the letter off until the caption and picture are ready, then your owl lands on top of the stack. Each account can send 3 owls a day; the whole app sends at most 100.
5. The gem in the vote dock awards a point (a copy flies into the writer's house hourglass); the split gem takes one. Selecting it again removes your vote. Your own owls show "Your owl" instead.
6. Signed in, your avatar is your profile photo (or initial) ringed in your house's gem; it opens a small menu. **Profile** opens your profile as a full-screen sheet over the page: the photo lifts out of the corner into the sheet, and picking a house re-colours it. Saving uses the same `saveProfile` action as before, then the sheet flies back into the avatar. `/profile` shows the same sheet on its own, which is where first sign-in lands.
7. `/gallery` permanently redirects to `/`.

`src/proxy.ts` refreshes session cookies; pages and server actions verify the user again before reading or writing. With reduced motion, the delivery fades instead of flying, browsing is instant, and nothing bobs, flickers, twinkles or shakes.

The front page's look follows the approved design scope: `src/app/_front-page/` holds its components and CSS modules. On desktop it is a 1200 × 760 scene scaled to the window (an inline boot script in the root layout sets the scale and the once-a-week delivery flag before first paint); smaller windows get the compact phone layout.

## How a post is made

`src/lib/owl-post/create-generation.ts` holds the decisions; every side effect is injected, so the flow is unit-tested without a network or database.

1. Load the cast and this week's Owl Post (picked by New York week, Monday to Sunday; the rotation began the week of Oct 5 2026 with the halal cart), then **reserve a slot** with `claim_generation_slot()`. It counts today's posts plus in-flight reservations and reserves one under a Postgres advisory lock, so simultaneous requests can't all slip under the limit before any of them is saved. The reservation is released when the post is saved or fails, and expires after 3 minutes if a server instance dies.
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

The unit tests cover the New York calendar (evening and daylight-saving boundaries), the weekly Owl Post rotation and its labels, the house hourglasses, stack order and vote math, the boot script and the sign-in return note, the seeded night sky, profile steps and signed photo URLs, prompt fencing and name scrubbing, Gemini refusal/empty/malformed responses and image byte checks, daily limits, the generation flow's ordering and cleanup, vote input and error mapping, feed parsing, the House Cup, and the existing sign-in, profile, and photo behavior.

`npm run test:e2e` runs the signed-out journeys in Playwright (desktop and phone) against a production build on port 3200: the weekly delivery and Skip, the prompt bar, hourglasses and letter cards, browsing by keys, buttons, and swipe, the sign-in letter for votes and sends, redirects, the cancelled-sign-in message, legal pages, and no sideways scrolling. It seeds two owls by disposable authors and deletes them afterwards. Google sign-in itself isn't automated.

For a live check against the Supabase project, sign in to the Supabase CLI and run `npm run test:integration` (add `TEST_APP_URL=http://localhost:3000` to also check the app's routes). It creates disposable users and cleans them up.
