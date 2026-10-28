# Study Club

A responsive study companion for organizing subjects, planning study blocks, tracking focus sessions, and turning notes into revision material.

## Run locally

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. Create a production build with `pnpm build` and preview it with `pnpm preview`.

## Supabase authentication

The sign-in screen uses the existing Supabase client in `src/lib/supabase.js`. Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`; only the publishable key belongs in the browser. Never put a service-role key in a `VITE_` variable.

In the Supabase dashboard, enable the email provider and add your local app URL (for example, `http://localhost:5173/**`) to Authentication → URL Configuration → Redirect URLs. If email confirmation is enabled, new accounts see an inbox confirmation message before they can sign in.

To try the flow, start the app with `pnpm dev`, create an account using an email address you can access, follow the confirmation link if required, then log in. The dashboard is only rendered after Supabase verifies a user session. Use the log-out button at the bottom of the sidebar to return to the sign-in screen; refreshing while signed in should keep the session.

Authentication, subject records, and topic records are handled by Supabase. Subject queries include the signed-in user ID, and topic access is constrained by each subject ID; both are protected by the existing RLS policies. Topic completion and subject progress are derived from topic rows. Study-time metadata, plans, reminders, and study sessions remain browser-local under user-specific keys.

## What’s included

- Dashboard with study snapshot, subjects, recommendation, weekly rhythm, and today’s plan
- Subject and topic management with progress tracking
- Focus timer with selectable duration, subject, and topic
- AI-style flashcards and study summaries from pasted or uploaded `.txt` / `.md` material
- Study planner, analytics, and browser-local reminders
- Supabase-backed subject records, with per-user local topic progress, plans, reminders, and finished sessions

The visual system draws from the supplied references’ warm paper colors, editorial serif headlines, muted olive and blue tones, and playful stationery details.

## AI integration

`src/services/aiService.js` is the integration boundary. Its current local mock adapters keep the app usable without a backend. Replace them with requests to server routes such as `/api/summary`, `/api/flashcards`, and `/api/study-plan`. Store provider credentials in the server environment and never ship them in frontend code.

`src/services/localStore.js` is the persistence boundary. It can be replaced with API-backed data access while keeping the UI components separate from storage details.
