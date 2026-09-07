# Multimodal AI Provider Setup

Viraasat AI Version 3 uses three backend services with separate responsibilities:

```text
Image + typed description + voice recording
  -> Sarvam: transcribe regional speech and translate input to English
  -> OpenAI or Ollama: analyze image + text and generate catalogue JSON
  -> Sarvam: translate the generated description back to the artisan language
  -> Artisan review
  -> Supabase publish
```

All keys belong only in `backend/.env`. Never place them in `frontend/.env.local`, a
`NEXT_PUBLIC_` variable, Git, screenshots, or chat messages.

## 1. Configure Ollama Cloud

1. Sign in at https://ollama.com.
2. Open https://ollama.com/settings/keys and create an API key.
3. Paste it into `OLLAMA_API_KEY` in `backend/.env`.
4. Keep `AI_PROVIDER=ollama`.

Default configuration:

```dotenv
AI_PROVIDER=ollama
OLLAMA_API_KEY=your-key
OLLAMA_MODEL=gemma4:31b
OLLAMA_BASE_URL=https://ollama.com/api
```

The model is configurable because Ollama's cloud catalogue changes. `gemma3:27b` was
retired by Ollama Cloud on July 15, 2026; do not use that older value. Choose a currently
available model marked both **Cloud** and **Vision**. This project validates the model's JSON in Python because
Ollama Cloud does not currently guarantee schema-constrained structured output.

For a local Ollama installation, change `OLLAMA_BASE_URL` to `http://localhost:11434/api`.
No Ollama API key is required for that local URL.

## 2. Configure OpenAI as an alternate provider

1. Create a project API key in the OpenAI Platform.
2. Paste it into `OPENAI_API_KEY` in `backend/.env`.
3. Keep `OPENAI_MODEL` set to a vision-capable model available to your project.
4. Select OpenAI in the web form, or set `AI_PROVIDER=openai` to make it the default.

```dotenv
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4.1-mini
```

The OpenAI adapter uses the Responses API with an image input and a strict JSON schema.
OpenAI API usage may require billing; it is an alternate provider, not the free fallback.

## 3. Configure Sarvam

1. Sign in at https://dashboard.sarvam.ai.
2. Open **API Keys**, create a key, and save it immediately.
3. Paste it into `SARVAM_API_KEY` in `backend/.env`.

```dotenv
SARVAM_API_KEY=your-key
SARVAM_BASE_URL=https://api.sarvam.ai
SARVAM_STT_MODEL=saaras:v3
```

Sarvam is required whenever the artisan records voice or selects a regional language. The
prototype sends recordings shorter than 30 seconds to Saaras v3 and uses BCP-47 language
codes such as `hi-IN`, `pa-IN`, and `ta-IN`. Auto-detection sends `unknown`.

## 4. Verify configuration without exposing keys

Restart FastAPI and open:

```text
http://localhost:8000/api/seller/snaplist/providers
```

Expected example:

```json
{
  "selected": "ollama",
  "providers": {"openai": false, "ollama": true},
  "sarvam_configured": true
}
```

This endpoint returns booleans only. It never returns key values.

Then open `http://localhost:3000/seller/products/new`, select a provider and language, add a clear
image, type a description, record a short voice note, and select **Generate listing**.

## 5. Request safety and anti-spam controls

`POST /api/seller/snaplist/generate` is protected before and during provider execution:

- A valid seller session is required.
- Oversized multipart requests are rejected with HTTP 413. AI-generation images are limited to 3 MB and voice notes to 750 KB so the combined multipart request remains below Vercel's 4.5 MB Function payload limit.
- Each seller is limited to 5 requests per minute and 30 per hour by default.
- Only one generation can run per seller and four can run globally in one API process.
- Exact completed requests are cached for five minutes; duplicate in-flight requests are rejected.
- The complete Sarvam, LLM, and localization pipeline is cancelled after 70 seconds.
- Three retryable provider failures open a 60-second circuit breaker.
- Provider output is capped at 1,200 tokens and 512 KB.
- Safe errors never expose provider bodies, prompts, credentials, or internal exception details.
- HTTP 429, 503, and 504 responses include `Retry-After` where applicable.

```env
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

These counters are in-process and require no extra service for local or single-worker use. Vercel can run multiple Function instances, so before a high-traffic public launch also configure a durable shared rate limiter (such as an atomic Supabase/Postgres counter) or a Vercel Firewall rate-limit rule for the AI endpoint.

## Adding another catalogue provider

1. Create an adapter in `backend/app/services/ai/` that implements `CatalogProvider`.
2. Return a validated `CatalogModelOutput`.
3. Register the adapter in `backend/app/services/ai/factory.py`.
4. Add only its non-secret name to the frontend provider selector.

No upload, translation, product, or marketplace code needs to change.
