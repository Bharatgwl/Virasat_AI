# Supabase Setup for Viraasat AI Version 2

Complete these steps once. Supabase credentials are used only by the Python backend.
Do not paste a secret key into chat, Next.js, Git, screenshots, or documentation.

## 1. Create the cloud project

1. Sign in at https://supabase.com/dashboard.
2. Select **New project**.
3. Choose your organization, name the project `viraasat-ai`, create a strong database password, and choose a nearby region.
4. Wait until the project reports that it is ready.

## 2. Create the schema and storage buckets

For this prototype, use the dashboard SQL Editor:

1. Open **SQL Editor** and create a new query.
2. Open `supabase/migrations/001_initial.sql` on your computer, copy all of it into the query, and select **Run**.
3. Create another query.
4. Open `supabase/migrations/002_version_2_dashboard.sql`, copy all of it, and select **Run**.
5. Continue with a new SQL query for each remaining migration: `003_multimodal_ai.sql`, `004_accounts_buyers_orders.sql`, `005_strict_role_separation.sql`, and `006_production_order_integrity.sql`.
6. In **Table Editor**, confirm that `accounts`, `artisans`, `buyers`, `products`, `inquiries`, `cart_items`, `orders`, `order_items`, and `app_sessions` exist.
7. In **Storage**, confirm that `product-images` and `product-audio` exist.

Run migrations 001 through 006 in filename order. Migration 005 intentionally stops if old profiles or products have no owner; repair those rows before continuing so seller and buyer data are never mixed. Migration 006 adds revocable sessions and atomic, stock-safe, idempotent order creation.

## 3. Copy the two backend values

1. Open the project's **Connect** dialog or **Settings > API Keys**.
2. Copy the **Project URL**.
3. Under **Secret keys**, reveal/copy a server-side key beginning with `sb_secret_`.
4. If your project only shows legacy keys, the legacy `service_role` key also works, but a new secret key is preferred.

The secret key bypasses Row Level Security. It must never be placed in `frontend/.env.local` or any variable beginning with `NEXT_PUBLIC_`.

## 4. Configure FastAPI locally

From PowerShell:

```powershell
Set-Location -LiteralPath 'C:\Users\bhara\Desktop\Viraasat AI Project\viraasat-ai\backend'
notepad .env
```

The local `backend/.env` file has already been prepared and is ignored by Git. Add your two Supabase values:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REFERENCE.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_REAL_SECRET_KEY
APP_SESSION_SECRET=GENERATE_A_SEPARATE_LONG_RANDOM_SECRET
FRONTEND_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

Save and close Notepad. Do not change `frontend/.env.local`; it should contain only:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 5. Verify the connection

Restart FastAPI after editing `.env`, then open:

- http://localhost:8000/api/health — the API itself should return `status: ok`.
- http://localhost:8000/api/health/supabase — Supabase should return `status: ready`, `configured: true`, and `connected: true`.
- http://localhost:3000/dashboard — the page should display **Supabase connected**.

If the result is `setup_required`, FastAPI did not read `backend/.env`. Start Uvicorn while the terminal is inside the `backend` folder.

If the result is `connection_failed`, check the project URL, secret key, and that all six SQL migrations completed successfully.

## Later team workflow

The manual SQL runs above are suitable for initial setup. When the team starts shared development, install the Supabase CLI, link the project, and deploy subsequent migration files with `supabase db push`. Only one designated team member should deploy remote migrations at a time.
