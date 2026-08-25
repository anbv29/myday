# Account and notification surfaces

Section 5 adds authenticated, owner-only account routes without changing the public discovery contract.

## Routes

- `/account` shows claim totals, recent owned dates, and recent checkout activity.
- `/account/dates` shows the current ownership ledger, historical claims, and up to 50 recent checkout intents.
- `/account/settings` updates the public display name and bio. Username changes continue through the existing availability-checked onboarding route.
- `/account/notifications` persists the three email preference flags already defined in `user_settings`.

All account pages are dynamic, marked `noindex`, and require a server-verified Clerk session. The user identifier is derived on the server and is never accepted in a URL, form, or API body. A missing onboarding profile is redirected to username setup. An unavailable identity or data service produces an explicit unavailable state rather than sample account data.

## Data boundary

Migration `202608250004_account_surfaces.sql` exposes five authenticated RPCs:

- `get_my_account_summary()`
- `get_my_claims(result_limit)`
- `get_my_checkout_activity(result_limit)`
- `update_my_profile(new_display_name, new_bio)`
- `update_my_notification_settings(...)`

Each function resolves `current_app_user_id()` from the verified Supabase JWT and scopes reads or writes to that user. Limits are clamped inside the database. Execute permission is revoked from `public` and granted only to `authenticated`; existing table RLS remains the default-deny backstop.

Profile writes validate and trim content in both the API and database. Audit events record that fields changed, but never copy profile text into audit metadata. Notification audit events record the saved boolean choices.

## HTTP protections

The two PATCH APIs require a trusted mutation origin, verified Clerk identity, bounded JSON bodies, strict schemas, and an account-scoped rate limit. Production fails closed when the rate-limit service is unavailable. Responses are private and `no-store`.

## Notification delivery boundary

This section implements the preference center and durable preference storage. It does not pretend to send email: no email delivery provider is configured in this repository yet. A future notification worker must read these flags before dispatch, use an idempotency key per event and channel, and always bypass marketing delivery when `email_product_updates` is false. Required security or payment-service notices should remain separate from optional marketing preferences.

## Responsive behavior

The desktop account sidebar collapses into a horizontally scrollable section navigation on small screens. Stats move from four to two columns, ownership cards become a single column, and activity rows reflow to two columns without hiding status or payment links.
