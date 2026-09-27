# Supabase and Vercel deployment

This application is a Vite single-page app backed by Supabase Auth and Postgres. The local Express JSON server is for development only; on Vercel, use Supabase for shared production data.

## Supabase setup

1. Create a Supabase project and configure Auth email/password sign-in.
2. For a new project, run `SUPABASE_SCHEMA.sql` once in the Supabase SQL Editor.
3. For an existing project, apply migrations in order:
   - `supabase/migrations/202609260001_profile_auth_hardening.sql`
   - `supabase/migrations/202609270001_admin_realtime_and_indexes.sql`
4. In **Authentication → URL Configuration**, set the production Site URL and add the exact production and local callback URLs used by password reset and email confirmation.
5. Create and confirm the administrator's Auth account. Promote that account from the SQL Editor, replacing the email with the confirmed administrator email:

```sql
UPDATE public.profiles AS p
SET role = 'admin', updated_at = now()
FROM auth.users AS u
WHERE p.id = u.id::text
  AND lower(u.email) = lower('admin@example.com')
  AND u.email_confirmed_at IS NOT NULL;
```

Check that exactly one row was updated. The email/password must belong to that Auth account. Client-side signup cannot grant administrator privileges.

The profile, venue, resource, slot, and booking policies are enforced by RLS. The realtime migration adds the admin synchronization tables to Supabase's `supabase_realtime` publication when that publication exists. Realtime delivery still follows RLS.

## Vercel setup

Set the Vercel project to the Vite framework, with build command `npm run build` and output directory `dist`. Configure these variables for Production, Preview, and Development as appropriate, then redeploy:

- `VITE_SUPABASE_URL`: the Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: the Supabase publishable/anon key

Never expose a Supabase service-role key or payment secret in a `VITE_*` variable. Vite embeds those values in browser assets. If either required Supabase variable is missing in a production build, the app now fails closed with a configuration notice instead of falling back to browser-local demo data.

The repository's `vercel.json` rewrites routes to `index.html` for SPA navigation such as `/login` and `/owner/login`. If a direct refresh still returns 404, verify that Vercel is deploying this repository's current branch, that the build succeeds, and that the output directory is `dist`.

## Operational readiness

- Confirm the admin account's `profiles.role` is `admin`; a matching email alone is not an RLS grant.
- Confirm a venue registration appears in `public.gaming_cafes` with `status = 'pending'`, and its resources and initial slots exist before telling the owner submission succeeded.
- Monitor Vercel build/deployment logs and Supabase Auth, Postgres, and Realtime logs. Keep database backups and test restoring one before launch.
- Private social and operational tables currently have RLS enabled without browser policies. Their persistence needs scoped server-side operations before those features can be considered production-ready.
- Booking holds and payment confirmation still need a transactional database/server workflow and verified payment-provider callbacks. Do not treat a client-side payment confirmation as proof of payment.
- Load, concurrency, payment, account recovery, and production-browser testing are still required before claiming readiness for heavy real-world traffic.
