# humour me?

An animated character gallery. The letters in “humor” and “me?” travel from the opening wordmark to two rows of character cards. Each card reads its image, name, and fact from Supabase.

## Supabase

The `characters` table has one ordered row for each of the eight cards: `h`, `u`, `m`, `o`, `r`, `m`, `e`, and `?`. Its `name`, `image_url`, and `fact` fields are blank placeholders until the character choices are ready. Public access is read-only through a row-level security policy.

The table schema and placeholder rows live in `supabase/migrations/`. Set these values in `.env.local` for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Use `.env.example` as a template. Add the same variables to the Production and Preview environments in Vercel. Never commit `.env.local`.

To update the gallery, edit the eight rows in Supabase and fill in `name`, `image_url`, and `fact`. The `sort_order` values determine the card order.

## Run locally

```bash
npm install
npm run dev
```

The letters reveal in sequence on page load. The gallery supports a reduced-motion preference.
