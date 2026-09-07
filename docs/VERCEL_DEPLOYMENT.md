# Deploy Viraasat AI on Vercel

Deploy this repository as **two Vercel projects**. Both projects use the same
repository, but each has a different Root Directory:

| Vercel project | Root Directory | Framework |
| --- | --- | --- |
| `viraasat-ai-api` | `backend` | FastAPI / Other |
| `viraasat-ai-web` | `frontend` | Next.js |

Do not place backend secrets in the frontend project. Do not upload either
local `.env` file; add values through Vercel Project Settings instead.

## 1. Push the repository

Push the current project to the GitHub repository that you want Vercel to use.
The repository must include `backend/vercel.json` and the two `.vercelignore`
files. Local `.env`, `.env.local`, virtual environments, `node_modules`, and
build output are ignored.

## 2. Create the backend project first

Before deploying the updated backend, run Supabase migrations `001` through
`006` in filename order. The backend now depends on the `app_sessions` table
and `place_buyer_order` database function from migration 006.

1. Open the Vercel dashboard and select **Add New > Project**.
2. Import the Viraasat AI GitHub repository.
3. Name the project `viraasat-ai-api`.
4. Set **Root Directory** to `backend`.
5. Leave the build and output settings on their detected/default values.
6. Add these Environment Variables for **Production, Preview, and Development**
   where appropriate:

```dotenv
ENVIRONMENT=production
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_SIDE_SUPABASE_SECRET
APP_SESSION_SECRET=GENERATE_A_DIFFERENT_LONG_RANDOM_SECRET
FRONTEND_ORIGINS=https://YOUR_FRONTEND_PROJECT.vercel.app
AUTH_REQUESTS_PER_MINUTE=20

AI_PROVIDER=ollama
OLLAMA_API_KEY=YOUR_OLLAMA_CLOUD_KEY
OLLAMA_MODEL=gemma4:31b
OLLAMA_BASE_URL=https://ollama.com/api

OPENAI_API_KEY=YOUR_OPENAI_KEY_IF_USED
OPENAI_MODEL=gpt-4.1-mini

SARVAM_API_KEY=YOUR_SARVAM_KEY
SARVAM_BASE_URL=https://api.sarvam.ai
SARVAM_STT_MODEL=saaras:v3

AI_TIMEOUT_SECONDS=45
AI_REQUEST_DEADLINE_SECONDS=70
AI_REQUESTS_PER_MINUTE=5
AI_REQUESTS_PER_HOUR=30
AI_MAX_ACCOUNT_CONCURRENCY=1
AI_MAX_GLOBAL_CONCURRENCY=4
AI_CACHE_TTL_SECONDS=300
AI_CACHE_MAX_ENTRIES=128
AI_CIRCUIT_FAILURE_THRESHOLD=3
AI_CIRCUIT_COOLDOWN_SECONDS=60
AI_MAX_RESPONSE_BYTES=524288
AI_MAX_REQUEST_BYTES=4250000
AI_MAX_IMAGE_BYTES=3000000
AI_MAX_AUDIO_BYTES=750000
UPLOAD_MAX_IMAGE_BYTES=4000000
UPLOAD_MAX_AUDIO_BYTES=4000000
```

`SUPABASE_SECRET_KEY`, `APP_SESSION_SECRET`, and all AI keys are backend-only
secrets. Generate `APP_SESSION_SECRET` locally with:

```powershell
py -c "import secrets; print(secrets.token_urlsafe(48))"
```

Deploy and copy the backend URL, for example:

```text
https://viraasat-ai-api.vercel.app
```

Verify these URLs before continuing:

```text
https://viraasat-ai-api.vercel.app/api/health
https://viraasat-ai-api.vercel.app/api/health/supabase
https://viraasat-ai-api.vercel.app/docs
```

The first route must report `ok`; the Supabase route must report `ready`.

## 3. Create the frontend project

1. Import the same GitHub repository as another Vercel project.
2. Name it `viraasat-ai-web`.
3. Set **Root Directory** to `frontend`.
4. Confirm the framework is **Next.js**.
5. Add these Environment Variables:

```dotenv
BACKEND_API_BASE_URL=https://viraasat-ai-api.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://viraasat-ai-api.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Only the Supabase publishable key belongs in the frontend. Never use the
Supabase secret/service-role key in a `NEXT_PUBLIC_` variable.

`BACKEND_API_BASE_URL` is the server-only URL used by the Next.js same-origin
proxy. `NEXT_PUBLIC_API_BASE_URL` remains as a compatibility fallback. Enter
both without a trailing slash. The browser no longer stores the app bearer
token or calls FastAPI directly.

Deploy and copy the production frontend URL. If it differs from the value used
for backend `FRONTEND_ORIGINS`, correct that backend variable and redeploy the
backend. Environment-variable changes affect only new deployments.

## 4. Configure Supabase and Google OAuth for production

In **Supabase > Authentication > URL Configuration**:

```text
Site URL: https://viraasat-ai-web.vercel.app
Redirect URL: https://viraasat-ai-web.vercel.app/auth/callback
```

Keep the localhost callback too if local development is still required.

In **Google Cloud > APIs & Services > Credentials > OAuth 2.0 Client**:

- Add `https://viraasat-ai-web.vercel.app` as an authorized JavaScript origin.
- Keep the authorized redirect URI equal to the callback URL shown by the
  Supabase Google provider, normally
  `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.

Do not put the Viraasat frontend callback in Google's redirect URI field;
Google returns to Supabase first, and Supabase returns to the frontend.

## 5. Production smoke test

Test in this order:

1. Open the frontend in an incognito window and select a language.
2. Register one seller and complete seller onboarding.
3. Sign out, sign in again, and refresh a protected page.
4. Create an AI listing using an image no larger than 3 MB and a short voice
   note; review and publish it.
5. Sign out and register a separate buyer.
6. Confirm the published product appears in the buyer marketplace.
7. Confirm seller URLs reject/redirect the buyer and buyer URLs reject/redirect
   the seller.
8. Test cart and order creation, then verify the rows in Supabase.

## Important Vercel constraints

- Vercel Function request and response bodies are limited to 4.5 MB. The
  frontend and backend therefore enforce smaller AI media limits and leave room
  for multipart metadata.
- The FastAPI function duration is set to 120 seconds; the application stops an
  AI request earlier using its own 70-second deadline.
- The current AI rate limiter, concurrency guard, cache, and circuit breaker are
  process-local. They protect each warm function instance. Before high-traffic
  public launch, add a durable distributed rate limiter (for example, a
  Supabase/Postgres atomic counter or managed rate-limit store) or configure a
  Vercel Firewall rule for the AI endpoint.
- Authentication has an application-level per-instance limit. Also configure a
  Vercel Firewall rate-limit rule for `/api/auth/login`, `/api/auth/signup`, and
  `/api/auth/google` so limits are shared across serverless instances.
- Exact `FRONTEND_ORIGINS` is safest. Add preview URLs explicitly only when a
  preview must call the production API. `FRONTEND_ORIGIN_REGEX` exists for a
  deliberately scoped preview-domain regex, but should not be broad.

## Updating deployments

Once both projects are connected to GitHub, a push to the configured production
branch creates new deployments. After changing any `NEXT_PUBLIC_` variable,
redeploy the frontend because Next.js embeds those public values at build time.
