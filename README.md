# riplacer-new

## Getting started

Prereqs: Node.js + npm (install via nvm if needed).

```sh
# Install dependencies
npm i

# Start the dev server
npm run dev
```

## Tech stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Postgres + Edge Functions)
- Perplexity AI (research agent)

## Product flow (current)

1. User completes onboarding on the marketing site.
2. User verifies email.
3. A single-account research report is generated via `research-target-account`.
4. User views the report in the app dashboard.

## Backend setup

1. Run the latest migration in Supabase SQL Editor:
   - `supabase/migrations/20260204120000_single_account_research.sql`
2. Set the Perplexity API key:
   ```sh
   supabase secrets set PERPLEXITY_API_KEY=...
   ```
3. Deploy the Edge Function:
   ```sh
   supabase functions deploy research-target-account
   ```

## Deployment

Use Vercel or your preferred platform. If using Vercel CLI:

```sh
npx vercel
```
