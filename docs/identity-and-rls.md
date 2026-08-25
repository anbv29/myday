# Identity and RLS setup

MYDAY.LOL uses Clerk for authentication and Supabase PostgreSQL for application
identity and authorization. The Cloudflare runtime uses Clerk's React SDK in
the browser and Backend SDK for server verification. Supabase Auth is not used
as a second password system.

## Required provider configuration

1. Create or select a Clerk application.
2. In Supabase, enable the Clerk Third-Party Auth integration using the Clerk
   issuer domain. Do not use the deprecated shared JWT-secret template.
3. Add the values listed in `.env.example` to local and hosted secret storage.
4. Apply the migrations under `supabase/migrations` using an elevated migration
   connection, never the application runtime key.
5. Configure a Clerk webhook endpoint at `/api/webhooks/clerk` for
   `user.created`, `user.updated`, and `user.deleted`.
6. Store its signing secret as `CLERK_WEBHOOK_SIGNING_SECRET`.

## Authorization model

- Clerk verifies the browser session.
- The server obtains the Clerk session token and supplies it to Supabase through
  the `accessToken` client option.
- Supabase verifies the Clerk token through its Third-Party Auth integration.
- RLS reads the verified `sub` claim and maps it to `app_users.clerk_user_id`.
- The browser never supplies an authoritative application user ID.
- The service-role key is used only by the verified Clerk webhook handler.

## Username guarantees

- `normalized_username` is generated in PostgreSQL and has a partial unique
  index.
- Case variants such as `Vishu`, `vishu`, and `VISHU` conflict.
- Reserved names are checked inside the authoritative claim function.
- Availability checks are advisory, authenticated, private, and rate-limited.
- `claim_username` performs the final update and records an audit event.
- Unexpected request fields are rejected before reaching the database.

## Degraded behavior

Public pages continue to render without identity credentials. Sign-in and
onboarding show an explicit unavailable state rather than creating a mock user.
In production, missing Upstash configuration fails username checks and changes
closed. Missing or unverifiable Clerk tokens receive an authentication error.
