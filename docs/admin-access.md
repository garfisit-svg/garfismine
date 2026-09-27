# Password-only admin access

The admin screen accepts one password. The password is checked by the Vercel Function at `/api/admin/access`; it is not stored in frontend code. After a successful check, the function creates a short-lived Supabase magic-link token for the configured administrator account. The browser exchanges that token for a normal Supabase Auth session, and the account must have `profiles.role = 'admin'`.

## Required Vercel environment variables

Set these for the Production environment (and Preview only if you want the admin flow enabled on previews):

- `ADMIN_ACCESS_PASSWORD`: the chosen admin password. Store it as a sensitive server-side environment variable. Do not prefix it with `VITE_`.
- `ADMIN_AUTH_USER_ID`: UUID of the existing administrator in Supabase Authentication. Its matching `public.profiles` row must have role `admin`.
- `SUPABASE_URL`: project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key. This is server-only and must never be exposed to the browser.
- `APP_URL`: optional canonical site URL, used as the Supabase magic-link redirect destination (for example, the production HTTPS origin).

Keep the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` settings for the frontend.

## Database setup

Apply `supabase/migrations/202609270002_admin_access_rate_limit.sql` to the same Supabase project. The endpoint uses this service-role-only RPC for persistent IP-based throttling. It blocks after five failed attempts in a rolling 15-minute window and the block lasts 15 minutes.

After setting environment variables, redeploy the Vercel Production deployment so the function receives them. If the endpoint returns an unavailable configuration message, verify the four required server variables, the admin user's UUID and role, and that the migration was applied.
