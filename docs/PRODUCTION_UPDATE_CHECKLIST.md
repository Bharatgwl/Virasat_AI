# Production Update Checklist

Use this order for the production-hardening update. Database changes must be
applied before the new backend is deployed.

## 1. Supabase SQL Editor

If migrations 001 through 005 have already been run, run only:

```text
supabase/migrations/006_production_order_integrity.sql
```

If this is a fresh Supabase project, run migrations 001 through 006 in filename
order. Confirm that migration 006 finishes without an error. It creates
`app_sessions`, installs `place_buyer_order`, changes demo defaults, and adds
order idempotency.

Existing application sessions do not have a server-side session row. Users
must sign in again once after this backend update; this is expected.

## 2. Backend Vercel variables

Confirm these values exist in the backend project, without exposing their
values in screenshots or source control:

```text
ENVIRONMENT
SUPABASE_URL
SUPABASE_SECRET_KEY
APP_SESSION_SECRET
FRONTEND_ORIGINS
AUTH_REQUESTS_PER_MINUTE
```

Use `ENVIRONMENT=production`, the exact deployed frontend origin for
`FRONTEND_ORIGINS`, and a separate random `APP_SESSION_SECRET`. Redeploy the
backend after saving variables.

## 3. Vercel Firewall

Add rate-limit rules for:

```text
/api/auth/login
/api/auth/signup
/api/auth/google
/api/seller/snaplist/generate
```

The application also limits these operations in memory, but a Vercel rule is
needed to enforce one shared limit across multiple serverless instances.

## 4. Frontend deployment

Push the source changes and redeploy the frontend. Confirm
`BACKEND_API_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL` have no trailing slash and
point to the deployed backend. The former is used by the server-side proxy;
the latter remains as a compatibility fallback.

## 5. Smoke test

1. Sign in as a seller and confirm seller pages load.
2. Upload a real JPG/PNG/WebP and create a listing.
3. Publish it, sign out, and confirm the old session no longer works.
4. Sign in as a buyer and confirm the published product appears.
5. Place one COD test order and confirm stock decreases exactly once.
6. Refresh the order page; confirm no duplicate order was created.
7. Try a seller URL as the buyer and a buyer URL as the seller; both must be rejected or redirected.
