# Viraasat AI - Version 3

Production-oriented SIH application with a Next.js frontend, Python FastAPI services, Supabase persistence, plug-and-play multimodal catalogue providers, and Sarvam regional-language processing. FastAPI owns application data validation, AI calls, and database/storage access.

## Repository

```text
frontend/             Next.js user interface
backend/              Python FastAPI services
supabase/migrations/  Database schema
docs/                 Architecture and team workflow
```

## Run the backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Add your Supabase project URL and server-side secret key to backend/.env.
uvicorn app.main:app --reload --port 8000
```

API documentation: `http://localhost:8000/docs`

Run backend tests:

```powershell
cd backend
pytest
```

## Run the frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Frontend: `http://localhost:3000`

For Google OAuth, `frontend/.env.local` also needs `NEXT_PUBLIC_SUPABASE_URL` and the public `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Supabase secret/service-role credentials belong only in `backend/.env` and must never be exposed to the browser.

Complete [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) before testing uploads, publishing, the marketplace, or the artisan dashboard. Google OAuth setup is documented in [docs/SUPABASE_GOOGLE_AUTH_SETUP.md](docs/SUPABASE_GOOGLE_AUTH_SETUP.md).

Complete [docs/AI_PROVIDER_SETUP.md](docs/AI_PROVIDER_SETUP.md) to configure Ollama Cloud or OpenAI plus Sarvam. The web form uses the real multimodal `/api/snaplist/generate` pipeline, uploads real media, creates a database product, and supports review/publish. The legacy `/api/snaplist/process` route is hidden and disabled when `ENVIRONMENT=production`.

For production deployment, follow [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md). The monorepo is deployed as two Vercel projects: `backend` for FastAPI and `frontend` for Next.js.

## Git workflow

1. Update local `develop`: `git switch develop` then `git pull origin develop`.
2. Create a short task branch such as `git switch -c feature/snaplist/product-form`.
3. Commit and push that branch.
4. Open a Pull Request from the feature branch into `develop`.
5. Release through a reviewed Pull Request from `develop` into `main`.

See `docs/TEAM_WORKFLOW.md` for the four-member division.
