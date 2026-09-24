# humor me?

An animated character gallery. The five letters in “humor” and the two letters in “me” travel from the opening wordmark to two rows of character cards. The question mark stays with “me?” as punctuation. Each card displays a character image and name from Supabase.

## Supabase

The `characters` table has one ordered row for each of the seven cards: `h`, `u`, `m`, `o`, `r`, `m`, and `e`. Its `name`, `image_url`, and `fact` fields remain editable; the gallery currently shows the image and name. Public access is read-only through a row-level security policy.

The table schema and placeholder rows live in `supabase/migrations/`. Set these values in `.env.local` for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Use `.env.example` as a template. Add the same variables to the Production and Preview environments in Vercel. Never commit `.env.local`.

To update the gallery, edit the seven rows in Supabase and fill in `name`, `image_url`, and `fact`. The `sort_order` values determine the card order.

## Run locally

```bash
npm install
npm run dev
```

The letters reveal in sequence on page load. The gallery supports a reduced-motion preference.
