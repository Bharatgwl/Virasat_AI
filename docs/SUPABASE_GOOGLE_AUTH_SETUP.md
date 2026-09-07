# Supabase and Google Auth Setup

This backend keeps authentication and app profiles separate:

```text
Supabase Auth / Google OAuth identity
  -> backend /api/auth/google
  -> accounts table
  -> seller profile in artisans table OR buyer profile in buyers table
```

## 1. Run database migrations

In Supabase SQL Editor, run migrations in this order if not already applied:

```text
001_initial.sql
002_version_2_dashboard.sql
003_multimodal_ai.sql
004_accounts_buyers_orders.sql
005_strict_role_separation.sql
006_production_order_integrity.sql
```

Migration `004_accounts_buyers_orders.sql` adds:

- `accounts`
- `artisans`
- `buyers`
- `cart_items`
- `orders`
- `order_items`
- expanded product listing fields
- product status lifecycle: `draft`, `generated`, `ready`, `published`

Migration `005` enforces permanent seller/buyer profile ownership. Migration
`006` removes demo defaults, creates revocable app sessions, and installs the
atomic checkout function. The backend must not be deployed with the new code
until all six migrations have completed successfully.

## 2. Backend environment variables

Only backend receives Supabase service credentials.

```dotenv
SUPABASE_URL=your-supabase-project-url
SUPABASE_SECRET_KEY=your-service-role-key
APP_SESSION_SECRET=generate-a-separate-long-random-secret
FRONTEND_ORIGINS=http://localhost:3000
```

Never put `SUPABASE_SECRET_KEY` in frontend files.

## 3. Enable Google provider in Supabase

In Supabase dashboard:

```text
Authentication
  -> Providers
  -> Google
  -> Enable
```

Add your Google OAuth client credentials:

```text
Google Client ID
Google Client Secret
```

In Google Cloud, create a **Web application** OAuth client. Add this authorized JavaScript origin:

```text
http://localhost:3000
```

For its authorized redirect URI, copy the callback URL shown on the Supabase Google provider page. It normally has this form:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

In Supabase **Authentication -> URL Configuration**, set the local Site URL and redirect allow-list entry:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/auth/callback
```

Add the deployed callback later:

```text
https://your-frontend-project.vercel.app/auth/callback
```

Set the production **Site URL** to the same frontend origin. In Google Cloud,
add that frontend origin under **Authorized JavaScript origins**, but keep the
Google **Authorized redirect URI** set to the Supabase callback shown in the
provider page (`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`). Google
returns to Supabase first; Supabase then returns to the allowed frontend URL.

Add the public browser settings to `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

The publishable key is designed for browser use. A legacy anon key is also supported by the code, but new Supabase projects should use the publishable key. Never copy the service-role/secret key into the frontend.

## 4. Backend Google auth endpoint

The frontend Google buttons start Supabase PKCE OAuth and return to
`/auth/callback`. The callback receives a Supabase access token and sends it
through the same-origin Next.js proxy to:

```text
POST /api/auth/google
```

Request:

```json
{
  "role": "seller",
  "access_token": "supabase-user-access-token"
}
```

or:

```json
{
  "role": "buyer",
  "access_token": "supabase-user-access-token"
}
```

Response:

```json
{
  "account": {
    "id": "uuid",
    "role": "seller",
    "display_name": "Google User",
    "phone": null,
    "email": "user@example.com",
    "auth_provider": "google"
  },
  "token_type": "supabase",
  "access_token": "signed-opaque-app-session-token"
}
```

The Next.js proxy removes `access_token` from the browser-visible response and
stores it in a Secure, HttpOnly, SameSite cookie. Subsequent browser requests
go to `/api/backend/*`; the proxy attaches the bearer token when calling
FastAPI. Do not restore bearer-token storage in localStorage.

## 5. Password auth endpoints

For local prototype and non-Google accounts:

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

Seller and buyer accounts are separate by role. The same phone/email can exist once for seller and once for buyer.

## 6. Important security rules

- Supabase service-role key stays only in Python backend.
- Frontend uses Supabase anon key only for Google OAuth.
- Backend validates Google access token using Supabase before creating an account row.
- Logout revokes the server-side `app_sessions` row; copied logged-out tokens no longer remain valid.
- New Google users complete `/seller/onboarding` or `/buyer/onboarding` before entering role-specific features.
- Product, order, cart, and profile database access goes through FastAPI.
- RLS remains enabled; no anonymous browser table policies are needed for this prototype.
