# Viraasat AI UI and Backend Contract Plan

This document defines the final UI flow before the next frontend implementation. It also defines the backend-friendly inputs, outputs, validation rules, states, and plug-and-play service boundaries.

The goal is simple: build the complete UI first, but design every page so the backend can be connected cleanly later without rewriting the frontend.

## Canonical Role Boundary (Implemented)

Seller and buyer are independent security domains. All canonical UI and API URLs are role-prefixed. Any older unprefixed route mentioned later in this historical plan is a legacy redirect only; the table in this section is authoritative.

| Area | Frontend routes | Backend APIs |
| --- | --- | --- |
| Seller | `/seller/dashboard`, `/seller/catalog`, `/seller/products/*`, `/seller/inquiries`, `/seller/profile` | `/api/seller/dashboard/*`, `/api/seller/products/*`, `/api/seller/snaplist/*`, `/api/seller/uploads/*`, `/api/seller/inquiries/*`, `/api/seller/profile` |
| Buyer | `/buyer/marketplace`, `/buyer/products/*`, `/buyer/cart`, `/buyer/checkout`, `/buyer/orders`, `/buyer/profile` | `/api/buyer/products/*`, `/api/buyer/cart/*`, `/api/buyer/orders/*`, `/api/buyer/inquiries/*`, `/api/buyer/profile` |

Rules enforced by the implementation:

- Every role API requires an authenticated bearer session and checks the account role.
- Seller product reads, updates, publishing, dashboard data, and inquiries are filtered by the authenticated artisan ID.
- Buyer cart, orders, profile, and inquiries derive the buyer ID from the session; browser-supplied ownership IDs are not trusted.
- Seller product detail never contains cart, checkout, buy-now, or buyer navigation.
- Buyer product detail never exposes seller management actions.
- Cross-role frontend navigation is replaced with the signed-in account's own home route.
- A single account row has exactly one immutable role; its role profile is unique and database-trigger validated.
- `supabase/migrations/005_strict_role_separation.sql` is required for the final database constraints.

## 1. Product Flow

```text
First-time artisan
  -> /language
  -> /register
  -> /seller/dashboard
  -> /seller/products/new
  -> /seller/products/review
  -> /seller/catalog
  -> /seller/inquiries
  -> /seller/profile

Returning artisan
  -> /seller/dashboard

Buyer/public user
  -> /buyer/marketplace
  -> /buyer/products/[id]
  -> /buyer/cart
  -> /buyer/register
  -> /buyer/profile
  -> /buyer/checkout
  -> /buyer/orders

Buyer inquiry path
  -> /buyer/products/[id]
  -> inquiry submission to seller

Account entry
  -> /
  -> create seller account or seller login
  -> create buyer account or buyer login

Important profile separation rule:

```text
/seller/profile -> seller/artisan profile only
/buyer/profile  -> buyer/customer profile only
```

Buyer and seller profile data must never be shown on the same profile page. If the same person uses both roles, the UI must still keep both role profiles separate.
```

## 2. Frontend Architecture

The frontend must be UI-complete but backend-friendly.

```text
Next.js pages
  -> UI components
  -> frontend service functions
  -> FastAPI backend
  -> provider modules / Supabase / Sarvam / OpenAI / Ollama
```

Frontend should not call Supabase, OpenAI, Ollama, or Sarvam directly. All external services must stay behind the Python FastAPI backend.

Recommended frontend service files:

```text
frontend/lib/services/accounts.ts
frontend/lib/services/language.ts
frontend/lib/services/artisans.ts
frontend/lib/services/buyers.ts
frontend/lib/services/dashboard.ts
frontend/lib/services/products.ts
frontend/lib/services/inquiries.ts
frontend/lib/services/ai.ts
frontend/lib/services/uploads.ts
```

Each page should call service functions instead of writing raw `fetch` logic everywhere.

## 3. Shared Data Rules

### Language Codes

Use stable language codes everywhere.

| Language | UI Label | Code | Sarvam Style Code |
|---|---|---|---|
| English | English | `en` | `en-IN` |
| Hindi | हिंदी | `hi` | `hi-IN` |
| Gujarati | ગુજરાતી | `gu` | `gu-IN` |
| Marathi | मराठी | `mr` | `mr-IN` |
| Tamil | தமிழ் | `ta` | `ta-IN` |
| Telugu | తెలుగు | `te` | `te-IN` |
| Kannada | ಕನ್ನಡ | `kn` | `kn-IN` |
| Bengali | বাংলা | `bn` | `bn-IN` |
| Punjabi | ਪੰਜਾਬੀ | `pa` | `pa-IN` |

Validation:

- Language is required before registration.
- Unknown language codes must be rejected.
- If language is missing, default UI may show English but must ask the user to select again.

### Product Status

Use one common product lifecycle.

```text
draft -> generated -> ready -> published
```

Status meaning:

- `draft`: user started product, not ready.
- `generated`: AI created catalogue data but artisan has not approved it.
- `ready`: artisan reviewed and saved final data.
- `published`: product is visible in marketplace.

Validation:

- Only `ready` products can be published.
- Published products must have title, description, price, image, artisan name, and stock.
- Draft products can have partial data.

### Inquiry Status

```text
new -> contacted -> closed
```

Validation:

- New inquiry is created by buyer.
- Artisan can move inquiry to `contacted`.
- Artisan can close inquiry when resolved.

## 4. Page Plan and Contracts

## Page 1: `/language`

Purpose: first screen for new artisans. The user selects the language for the app and voice workflow.

UI sections:

- Viraasat AI logo
- Trust badge: "AI cataloging for Indian artisans"
- 3x3 language grid
- Voice assistant hint
- Continue button

Frontend state:

```ts
type LanguageSelectionState = {
  selectedLanguage: "en" | "hi" | "gu" | "mr" | "ta" | "te" | "kn" | "bn" | "pa" | null;
};
```

Input validation:

- `selectedLanguage` is required.
- Continue button disabled until a language is selected.
- Save selected language in local storage for prototype.

Output:

```json
{
  "preferred_language": "hi",
  "preferred_language_locale": "hi-IN"
}
```

Next route:

```text
/register
```

Backend later:

```text
No required backend call in prototype.
Later: POST /api/session/language
```

## Page 2: `/register`

Purpose: create seller account credentials and collect artisan identity before dashboard.

UI sections:

- Seller phone/email login
- Password and confirm password
- Artisan name
- Mobile number
- Village/city/location
- Craft type
- Preferred language
- Optional UPI ID
- Register button

Frontend type:

```ts
type ArtisanRegistrationInput = {
  artisan_name: string;
  phone: string;
  location: string;
  craft_type: string;
  preferred_language: string;
  upi_id?: string;
};
```

Validation:

- `artisan_name`: required, 2 to 80 characters.
- `phone`: required, Indian mobile format, 10 digits.
- `location`: required, 2 to 120 characters.
- `craft_type`: required, 2 to 80 characters.
- `preferred_language`: required, must match supported language code.
- `upi_id`: optional, validate only if entered. Pattern example: `name@bank`.

Output:

```json
{
  "id": "artisan_123",
  "artisan_name": "Rameshwar Prajapati",
  "phone": "9876543210",
  "location": "Kutch, Gujarat",
  "craft_type": "Terracotta Pottery",
  "preferred_language": "hi",
  "upi_id": "rameshwar@upi",
  "onboarding_completed": true
}
```

Backend later:

```text
POST /api/artisans
GET /api/artisans/me
PATCH /api/artisans/me
```

Next route:

```text
/dashboard
```

## Page 3: `/dashboard`

Purpose: main artisan home screen.

UI sections:

- Header with artisan greeting
- Language badge
- ONDC connection status badge
- Main CTA: "Digitize Your Craft"
- Metrics cards
- Recent products
- Recent inquiries
- Bottom navigation

Frontend type:

```ts
type DashboardSummary = {
  artisan: {
    id: string;
    name: string;
    location: string;
    craft_type: string;
    preferred_language: string;
  };
  metrics: {
    total_earnings: number;
    live_products: number;
    inquiries_count: number;
    active_orders: number;
  };
  recent_products: ProductSummary[];
  recent_inquiries: InquirySummary[];
};
```

Validation:

- Metrics must always show fallback `0`.
- If backend fails, show a clear error state and retry guidance. Do not generate demo data.
- Empty states must be shown for no products and no inquiries.

Backend later:

```text
GET /api/dashboard/summary
GET /api/products/manage?limit=3
GET /api/inquiries?limit=3
```

Navigation:

- "Digitize Your Craft" -> `/add-product`
- Recent product -> `/product-review?id={productId}` or `/product/{id}`
- Recent inquiry -> `/inquiries`

## Page 4: `/add-product`

Purpose: collect product image and regional voice separately, then generate complete product listing information. This page is designed for rural artisans who may not be comfortable typing long product details.

UI sections:

- Product image upload
- Regional voice recording
- Optional short typed hint
- Language selector
- AI provider selector
- Generate catalogue button
- Loading/progress state
- AI auto-filled details popup
- Save draft / continue to review

Frontend type:

```ts
type CatalogGenerationInput = {
  image_file: File;
  audio_file?: File;
  typed_hint?: string;
  source_language: string;
  ai_provider: "openai" | "ollama";
};
```

Input validation:

- Image is required.
- Image must be JPG, PNG, or WebP.
- Image max size: 8 MB.
- Audio is strongly recommended for rural artisans.
- Either `audio_file` or `typed_hint` is required.
- Typed hint is optional when audio is present.
- Typed hint max length: 500 characters.
- Audio max duration: 30 seconds.
- Audio max size: 10 MB.
- Provider must be one of `openai` or `ollama` for production UI.
- Source language must be supported.

Backend processing flow:

```text
Image file
  -> image upload/storage
  -> image analysis by selected catalogue provider

Audio file
  -> audio upload/storage
  -> Sarvam speech-to-text
  -> Sarvam translation to English if regional language is used

Image analysis + voice transcript + optional typed hint
  -> selected AI catalogue provider
  -> structured listing schema
  -> editable popup in frontend
```

AI auto-filled listing popup:

The generated output must open as a popup/modal instead of directly saving final product data. The artisan should be able to edit every field before saving.

Popup fields:

- Craft title
- Craft story and details
- Local language story
- Primary material
- Secondary materials
- Craft technique
- Category
- HSN tax code
- Price
- Market price suggestion
- Available stock
- Product dimensions
- Product weight
- Color
- Care instructions
- Production time
- Artisan location
- Tags/keywords
- AI confidence
- AI warnings
- Source transcript

Output schema:

```ts
type CatalogGenerationOutput = {
  craft_title: string;
  craft_story: string;
  local_description?: string;
  primary_material: string;
  secondary_materials: string[];
  craft_technique: string;
  category: string;
  hsn_tax_code?: string;
  price_inr: number;
  market_price_min?: number;
  market_price_max?: number;
  available_stock: number;
  dimensions?: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
  };
  weight_grams?: number;
  color?: string;
  care_instructions?: string;
  production_time_days?: number;
  artisan_location?: string;
  tags: string[];
  source_language: string;
  transcript?: string;
  translated_input?: string;
  ai_provider: string;
  confidence: number;
  warnings: string[];
};
```

Output validation:

- `craft_title`: required, 3 to 120 characters.
- `craft_story`: required, 30 to 1500 characters.
- `local_description`: optional, but recommended when source language is not English.
- `primary_material`: required, 2 to 80 characters.
- `secondary_materials`: optional array, max 10 items.
- `craft_technique`: required, 2 to 120 characters.
- `category`: required.
- `hsn_tax_code`: optional, numeric string, 4 to 8 digits.
- `price_inr`: required before saving as ready/published, must be greater than 0.
- `market_price_min` and `market_price_max`: optional positive numbers.
- `available_stock`: required, integer, 0 or more.
- `dimensions`: optional, all provided values must be positive.
- `weight_grams`: optional positive number.
- `production_time_days`: optional integer, 0 or more.
- `tags`: array, max 12 items.
- `confidence`: number from 0 to 1.
- If confidence is below `0.55`, UI must show "Needs review".
- AI warnings must be shown clearly but must not block editing.

Popup edit validation:

- Every generated field must be editable.
- Required fields should be highlighted if empty.
- User can save as draft even if some required publish fields are missing.
- User cannot publish until required publish fields are complete.
- The popup must show a small label such as "AI auto-filled from photo and voice note".
- The transcript should be visible in a collapsible section so the artisan/helper can confirm what was understood.

Backend current/near:

```text
GET /api/snaplist/providers
POST /api/snaplist/generate
POST /api/uploads/image
POST /api/uploads/audio
POST /api/products
```

Plug-and-play provider rule:

The UI only sends `ai_provider`. Backend decides the correct Python provider adapter.

```text
ai_provider=openai -> OpenAI adapter
ai_provider=ollama -> Ollama adapter
Legacy mock generation is regression-test-only and is not selectable or callable by the production UI.
```

Image/audio separation rule:

Image and audio must be treated as separate inputs in UI and backend.

```text
image_file -> upload/image analysis
audio_file -> upload/transcription/translation
typed_hint -> optional extra context
```

The backend may combine the processed text later for final catalogue generation, but storage, validation, and error handling should remain separate.

## Page 5: `/product-review`

Purpose: artisan reviews and edits the saved AI-generated listing before publishing. This page uses the same field schema as the AI auto-filled popup, but as a full page.

UI sections:

- Product image
- Editable craft title
- Editable craft story
- Editable regional/local story
- Primary material
- Secondary materials
- Craft technique
- Category
- HSN tax code
- Price
- Stock
- Dimensions
- Weight
- Color
- Care instructions
- Production time
- Tags
- Source transcript
- AI provider/confidence
- Save draft
- Mark ready
- Publish

Frontend type:

```ts
type ProductReviewInput = {
  craft_title: string;
  craft_story: string;
  local_description?: string;
  primary_material: string;
  secondary_materials: string[];
  craft_technique: string;
  category: string;
  hsn_tax_code?: string;
  price_inr: number;
  available_stock: number;
  dimensions?: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
  };
  weight_grams?: number;
  color?: string;
  care_instructions?: string;
  production_time_days?: number;
  tags: string[];
  transcript?: string;
  ai_provider?: string;
  confidence?: number;
  status: "draft" | "generated" | "ready" | "published";
};
```

Validation:

- Craft title required, 3 to 120 characters.
- Craft story required, 30 to 1500 characters.
- Local description optional but recommended for regional users.
- Primary material required.
- Craft technique required.
- Category required.
- Price required before `ready` or `published`.
- Price must be greater than 0.
- Stock must be 0 or more.
- HSN tax code optional but must be numeric if entered.
- Dimensions and weight must be positive if entered.
- Image required before publish.
- Published status requires complete product data.

Backend later/current:

```text
GET /api/products/{id}
PATCH /api/products/{id}
POST /api/products/{id}/publish
```

## Page 6: `/catalog`

Purpose: artisan manages all products.

UI sections:

- Search bar
- Status filters: All, Draft, Ready, Published
- Product cards/list
- Edit button
- Publish button
- View public page button

Frontend query:

```ts
type CatalogQuery = {
  search?: string;
  status?: "draft" | "generated" | "ready" | "published";
  page?: number;
  limit?: number;
};
```

Validation:

- Search max length: 80 characters.
- Page starts from 1.
- Limit allowed values: 10, 20, 50.
- Empty catalogue must show "Add your first craft" CTA.

Backend later/current:

```text
GET /api/products/manage
PATCH /api/products/{id}
POST /api/products/{id}/publish
```

## Page 7: `/marketplace`

Purpose: public buyer-facing product discovery.

UI sections:

- Product search
- Category filter
- Published product cards
- Product price
- Artisan name/location
- View details button

Frontend query:

```ts
type MarketplaceQuery = {
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  page?: number;
  limit?: number;
};
```

Validation:

- Only published products shown.
- Price filters must be positive.
- `min_price` cannot be greater than `max_price`.
- Product card must hide missing optional fields gracefully.

Backend current:

```text
GET /api/products
```

## Page 8: `/product/[id]`

Purpose: buyer sees product detail and submits inquiry.

UI sections:

- Product image
- Product title
- English description
- Regional/local story
- Price
- Category/materials/tags
- Artisan profile summary
- Buyer inquiry form

Inquiry input:

```ts
type InquiryCreateInput = {
  product_id: string;
  buyer_name: string;
  buyer_contact: string;
  message: string;
};
```

Validation:

- Product ID required.
- Buyer name required, 2 to 80 characters.
- Buyer contact required. Accept phone or email.
- Message required, 10 to 500 characters.
- Do not allow inquiry on draft products.

Backend current:

```text
GET /api/products/{id}
POST /api/inquiries
```

## Page 8.1: `/buyer/register`

Purpose: create buyer account credentials and collect buyer delivery details before checkout. This is separate from artisan registration.

UI sections:

- Buyer phone/email login
- Password and confirm password
- Buyer name
- Mobile number
- Optional email
- Delivery address/city
- Preferred language
- Continue to checkout

Frontend type:

```ts
type BuyerProfile = {
  id: string;
  buyer_name: string;
  phone: string;
  email?: string;
  delivery_address: string;
  preferred_language: string;
};
```

Validation:

- Buyer name required, 2 to 80 characters.
- Phone required, valid 10 digit Indian mobile number.
- Email optional, but must be valid if entered.
- Delivery address required, minimum 5 characters.
- Preferred language must be supported.

Backend later:

```text
POST /api/buyers
GET /api/buyers/me
PATCH /api/buyers/me
```

## Page 8.1.1: `/buyer/profile`

Purpose: buyer identity, delivery settings, language preference, and shopping account summary. This is separate from the seller/artisan profile.

UI sections:

- Buyer avatar/name
- Buyer/customer badge
- Phone number
- Optional email
- Delivery address/city
- Preferred language
- Continue shopping CTA
- Cart link
- Order history link
- Buyer login/register fallback when no buyer profile exists

Frontend type:

```ts
type BuyerProfile = {
  id: string;
  buyer_name: string;
  phone: string;
  email?: string;
  delivery_address: string;
  preferred_language: string;
};
```

Validation:

- Buyer name required, 2 to 80 characters.
- Phone required, valid 10 digit Indian mobile number.
- Email optional, valid email if entered.
- Delivery address required before checkout.
- Preferred language must be supported.
- Seller-only fields like craft type, UPI ID, ONDC status, and artisan location must not appear here.

Backend later/current:

```text
GET /api/buyers/me
PATCH /api/buyers/me
```

## Account Pages: `/seller/login` and `/buyer/login`

Purpose: let returning sellers and buyers enter their correct side of the app.

Frontend type:

```ts
type Account = {
  id: string;
  role: "seller" | "buyer";
  display_name: string;
  phone: string;
  email?: string;
  created_at: string;
};

type LoginInput = {
  role: "seller" | "buyer";
  identifier: string;
  password: string;
};
```

Validation:

- Role is required and must be `seller` or `buyer`.
- Identifier is required and can be phone or email.
- Password is required, minimum 6 characters for signup.
- Seller login redirects to `/dashboard`.
- Buyer login redirects to `/marketplace`.
- Buyer and seller accounts must stay separate even if phone number is same.

Backend later:

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

## Page 8.2: `/buyer/cart`

Purpose: buyer manages products before checkout.

UI sections:

- Cart item list
- Product image/title/artisan
- Quantity stepper/input
- Remove item
- Order total
- Proceed to checkout

Frontend type:

```ts
type CartItem = {
  product_id: string;
  quantity: number;
};
```

Validation:

- Quantity must be at least 1.
- Quantity cannot exceed available stock.
- Product must be published.
- Empty cart must show "Continue shopping".

Backend later:

```text
GET /api/cart
POST /api/cart/items
PATCH /api/cart/items/{product_id}
DELETE /api/cart/items/{product_id}
```

Prototype:

```text
localStorage.viraasat_buyer_cart
```

## Page 8.3: `/buyer/checkout`

Purpose: place a buyer order for artisan products.

UI sections:

- Delivery details
- Cart items
- Payment mode: UPI or COD
- Order total
- Place order button

Frontend type:

```ts
type OrderCreateInput = {
  buyer_id: string;
  items: {
    product_id: string;
    quantity: number;
  }[];
  delivery_address: string;
  payment_mode: "upi" | "cod";
};
```

Validation:

- Buyer details required before placing order.
- Cart must not be empty.
- Every item must reference a published product.
- Quantity must not exceed stock.
- Payment mode required.

Backend later:

```text
POST /api/orders
GET /api/orders/{id}
```

## Page 8.4: `/buyer/orders`

Purpose: buyer tracks placed orders.

UI sections:

- Order list
- Order status
- Product items
- Seller/artisan name
- Total amount
- Delivery address

Backend later:

```text
GET /api/orders
```

## Page 9: `/inquiries`

Purpose: artisan manages buyer inquiries.

UI sections:

- Inquiry cards
- Linked product information
- Buyer contact
- Message
- Status selector
- Contacted / Closed actions

Frontend type:

```ts
type InquirySummary = {
  id: string;
  product_id: string;
  product_title: string;
  buyer_name: string;
  buyer_contact: string;
  message: string;
  status: "new" | "contacted" | "closed";
  created_at: string;
};
```

Validation:

- Status update must be one of `new`, `contacted`, `closed`.
- Closed inquiries should stay visible under filter.
- Missing linked product should show "Product unavailable".

Backend current:

```text
GET /api/inquiries
PATCH /api/inquiries/{id}
```

## Page 10: `/profile`

Purpose: artisan identity and settings.

UI sections:

- Artisan photo/avatar
- Name
- Craft type
- Location
- Preferred language
- UPI/payment setting
- ONDC connection status
- Help and support
- Logout and session revocation

Frontend type:

```ts
type ArtisanProfile = {
  id: string;
  artisan_name: string;
  phone: string;
  location: string;
  craft_type: string;
  preferred_language: string;
  upi_id?: string;
  ondc_status: "not_connected" | "connected";
};
```

Validation:

- Same validation as registration.
- ONDC status is backend-controlled.
- UPI can be empty but must be valid if present.

Backend later:

```text
GET /api/artisans/me
PATCH /api/artisans/me
```

## 5. Navigation Rules

Seller mobile bottom navigation:

```text
Dashboard | Catalog | Inquiries | Profile

`Add Craft` is a contextual action on the dashboard and empty/catalog states, not a repeated global navigation item.
```

Buyer mobile bottom navigation:

```text
Store | Cart | Orders | Profile | Role
```

Top header rule:

```text
Seller routes show seller navigation only.
Buyer routes show buyer navigation only.
Home route shows role selection only.
```

Top-level route guards:

```text
No language selected -> /language
Language selected but no registration -> /register
Registered user -> /dashboard
Public marketplace/product pages -> accessible without registration
```

Prototype storage:

```text
localStorage.viraasat_language
localStorage.viraasat_artisan_profile
localStorage.viraasat_buyer_profile
localStorage.viraasat_active_account
```

Production later:

```text
Backend session/auth + Supabase artisan profile
```

## 6. Error and Loading States

Every page must have:

- Loading state
- Empty state
- Error state
- Retry option where backend call is involved
- No demo fallback. Use loading, error, and empty states.

Common error messages:

```text
Image is required.
Please enter a valid mobile number.
Please select a supported language.
Voice recording is too long. Keep it under 30 seconds.
AI provider is not configured.
Catalogue generated, but confidence is low. Please review carefully.
Product must be marked ready before publishing.
```

## 7. Backend Service Boundaries

Backend should be modular and plug-and-play.

```text
FastAPI routes
  -> Pydantic schemas
  -> service layer
  -> provider adapters
  -> Supabase / Sarvam / OpenAI / Ollama
```

Recommended backend modules:

```text
backend/app/api/artisans.py
backend/app/api/dashboard.py
backend/app/api/products.py
backend/app/api/inquiries.py
backend/app/api/snaplist.py
backend/app/services/artisan_service.py
backend/app/services/dashboard_service.py
backend/app/services/product_service.py
backend/app/services/inquiry_service.py
backend/app/services/ai/
backend/app/services/sarvam_language.py
backend/app/services/supabase_client.py
```

Rules:

- Routes handle HTTP only.
- Pydantic schemas validate inputs and outputs.
- Services contain business logic.
- Provider adapters contain third-party API logic.
- Secrets stay only in backend environment variables.
- Frontend never receives OpenAI, Ollama, Sarvam, or Supabase secret keys.

## 7.1 Separate Image and Audio Services

The product generation pipeline must not treat image, audio, and typed text as one mixed input at the upload stage. They should be validated and processed separately, then combined only inside the AI catalogue service.

Recommended service responsibilities:

```text
Image service
  -> validate image type and size
  -> upload image to product-images storage
  -> return image URL/path

Audio service
  -> validate audio type, size, and duration
  -> upload audio to product-audio storage
  -> send audio to Sarvam STT
  -> return transcript and detected/source language

Translation service
  -> translate regional transcript to English
  -> translate generated product story back to local language

Catalogue AI service
  -> receive image URL/path, transcript, translated input, typed hint
  -> call selected provider: OpenAI or Ollama
  -> return structured listing schema

Product service
  -> save editable generated listing as draft/generated product
  -> update after artisan edits popup fields
  -> publish only after validation passes
```

Recommended backend internal payload:

```py
class ListingGenerationContext(BaseModel):
    image_url: str
    audio_url: str | None = None
    transcript: str | None = None
    translated_input: str | None = None
    typed_hint: str | None = None
    source_language: str
    ai_provider: Literal["openai", "ollama"]
```

Recommended generated listing model:

```py
class GeneratedListing(BaseModel):
    craft_title: str
    craft_story: str
    local_description: str | None = None
    primary_material: str
    secondary_materials: list[str] = []
    craft_technique: str
    category: str
    hsn_tax_code: str | None = None
    price_inr: float
    market_price_min: float | None = None
    market_price_max: float | None = None
    available_stock: int = 1
    length_cm: float | None = None
    width_cm: float | None = None
    height_cm: float | None = None
    weight_grams: float | None = None
    color: str | None = None
    care_instructions: str | None = None
    production_time_days: int | None = None
    artisan_location: str | None = None
    tags: list[str] = []
    source_language: str
    transcript: str | None = None
    translated_input: str | None = None
    ai_provider: str
    confidence: float
    warnings: list[str] = []
```

Recommended database additions for generated listing:

```text
image_url text not null
audio_url text
transcript text
translated_input text
craft_title text not null
craft_story text not null
local_description text
primary_material text
secondary_materials text[]
craft_technique text
category text
hsn_tax_code text
price_inr numeric
market_price_min numeric
market_price_max numeric
available_stock integer default 1
length_cm numeric
width_cm numeric
height_cm numeric
weight_grams numeric
color text
care_instructions text
production_time_days integer
artisan_location text
tags text[]
source_language text
ai_provider text
ai_confidence numeric
ai_warnings text[]
status text
```

## 8. API Contract Summary

| UI Page | Method | Endpoint | Purpose |
|---|---|---|---|
| `/seller/login` | `POST` | `/api/auth/login` | Seller login |
| `/buyer/login` | `POST` | `/api/auth/login` | Buyer login |
| `/language` | none now | later `/api/session/language` | Save selected language |
| `/seller/register` | `POST` | `/api/auth/signup` | Create seller account |
| `/seller/onboarding` | `POST` | `/api/seller/profile` | Create artisan profile |
| `/seller/dashboard` | `GET` | `/api/seller/dashboard/summary` | Seller-owned dashboard data |
| `/seller/products/new` | `GET` | `/api/seller/snaplist/providers` | Provider availability |
| `/seller/products/new` | `POST` | `/api/seller/snaplist/generate` | Generate AI catalogue |
| `/seller/products/new` | `POST` | `/api/seller/products` | Save seller-owned product |
| `/seller/products/review` | `GET` | `/api/seller/products/{id}` | Load owned product |
| `/seller/products/review` | `PATCH` | `/api/seller/products/{id}` | Edit owned product |
| `/seller/products/review` | `POST` | `/api/seller/products/{id}/publish` | Publish owned product |
| `/seller/catalog` | `GET` | `/api/seller/products` | Seller-owned product list |
| `/buyer/marketplace` | `GET` | `/api/buyer/products` | Published products for buyers |
| `/buyer/products/[id]` | `GET` | `/api/buyer/products/{id}` | Buyer product detail |
| `/buyer/products/[id]` | `POST` | `/api/buyer/inquiries` | Authenticated buyer inquiry |
| `/buyer/register` | `POST` | `/api/auth/signup` | Create buyer account |
| `/buyer/onboarding` | `POST` | `/api/buyer/profile` | Create buyer profile |
| `/buyer/profile` | `GET` | `/api/buyer/profile` | Load own buyer profile |
| `/buyer/profile` | `PATCH` | `/api/buyer/profile` | Update own buyer profile |
| `/buyer/cart` | `GET` | `/api/buyer/cart` | Load own buyer cart |
| `/buyer/cart` | `POST` | `/api/buyer/cart/items` | Add product to own cart |
| `/buyer/cart` | `PATCH` | `/api/buyer/cart/items/{product_id}` | Update own cart quantity |
| `/buyer/cart` | `DELETE` | `/api/buyer/cart/items/{product_id}` | Remove own cart item |
| `/buyer/checkout` | `POST` | `/api/buyer/orders` | Place buyer order |
| `/buyer/orders` | `GET` | `/api/buyer/orders` | Own buyer order history |
| `/seller/inquiries` | `GET` | `/api/seller/inquiries` | Inquiries for owned products |
| `/seller/inquiries` | `PATCH` | `/api/seller/inquiries/{id}` | Update owned inquiry status |
| `/seller/profile` | `GET` | `/api/seller/profile` | Load own artisan profile |
| `/seller/profile` | `PATCH` | `/api/seller/profile` | Update own artisan profile |

## 9. Database Planning

Current tables:

```text
products
inquiries
```

Recommended next table:

```text
accounts
artisans
buyers
carts
cart_items
orders
order_items
```

Recommended `accounts` fields:

```text
id uuid primary key
role text not null check role in ('seller', 'buyer')
display_name text not null
phone text not null
email text
password_hash text not null
created_at timestamptz default now()
updated_at timestamptz default now()
unique(role, phone)
unique(role, email)
```

Recommended `artisans` fields:

```text
id uuid primary key
artisan_name text not null
phone text not null unique
location text not null
craft_type text not null
preferred_language text not null
upi_id text
ondc_status text default 'not_connected'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Recommended `buyers` fields:

```text
id uuid primary key
buyer_name text not null
phone text not null unique
email text
delivery_address text not null
preferred_language text default 'en'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Recommended `orders` fields:

```text
id uuid primary key
buyer_id uuid references buyers(id)
buyer_name text not null
buyer_contact text not null
delivery_address text not null
total_inr numeric not null
status text default 'placed'
payment_mode text default 'cod'
created_at timestamptz default now()
updated_at timestamptz default now()
```

Recommended `order_items` fields:

```text
id uuid primary key
order_id uuid references orders(id)
product_id uuid references products(id)
artisan_id uuid references artisans(id)
quantity integer not null
unit_price_inr numeric not null
line_total_inr numeric not null
created_at timestamptz default now()
```

Recommended product additions later:

```text
artisan_id uuid
stock_quantity integer default 1
status text
price numeric
local_description text
source_language_code text
ai_provider text
ai_confidence numeric
```

## 10. Implementation Order

Build UI first:

```text
1. Theme, shared layout, header, bottom nav
2. /language
3. /register
4. /dashboard
5. /add-product
6. /product-review
7. /catalog
8. /marketplace
9. /product/[id]
10. /inquiries
11. /profile
```

Then align backend:

```text
1. Add artisan profile schemas/table/routes
2. Add dashboard summary route
3. Align product status lifecycle
4. Strengthen validation in Pydantic schemas
5. Connect UI service functions to real FastAPI routes
6. Keep empty/error states honest; do not use demo fallback for production UI
```

## 11. Definition of Done

Frontend is ready when:

- Every route exists.
- Every form has validation.
- Every backend call goes through a service function.
- Every page has loading, empty, and error states.
- Mobile layout works first.
- Desktop layout does not break.
- No secret keys are used in frontend.

Backend is ready when:

- Every UI action has a matching endpoint.
- Every endpoint has Pydantic validation.
- OpenAI, Ollama, and Sarvam remain plug-and-play providers.
- Supabase schema matches frontend contracts.
- Tests cover health, AI generation, products, inquiries, artisans, and dashboard.
