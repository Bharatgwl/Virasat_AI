export type LanguageCode = "en" | "hi" | "gu" | "mr" | "ta" | "te" | "kn" | "bn" | "pa";

export type AiProvider = "openai" | "ollama";

export type ProductStatus = "draft" | "generated" | "ready" | "published";

export type AccountRole = "seller" | "buyer";

export type Account = {
  id: string;
  role: AccountRole;
  display_name: string;
  phone?: string;
  email?: string;
  auth_provider?: "password" | "google";
  created_at?: string | null;
};

export type ArtisanProfile = {
  id: string;
  account_id?: string | null;
  artisan_name: string;
  phone: string;
  location: string;
  craft_type: string;
  preferred_language: LanguageCode;
  upi_id?: string;
  ondc_status: "not_connected" | "connected";
};

export type CatalogGenerationInput = {
  image_file: File;
  audio_file?: File;
  audio_duration_seconds?: number;
  typed_hint?: string;
  source_language: LanguageCode;
  ai_provider: AiProvider;
  artisan_name: string;
};

export type GeneratedListing = {
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
  source_language: LanguageCode;
  transcript?: string;
  translated_input?: string;
  ai_provider: AiProvider;
  confidence: number;
  warnings: string[];
};

export type CatalogDraft = {
  title: string;
  description: string;
  local_description: string;
  category: string;
  materials: string[];
  suggested_price: number;
  ai_provider: string;
  source_language_code: string;
  source_transcript: string;
};

export type Product = {
  id: string;
  artisan_id?: string | null;
  artisan_name: string;
  title: string;
  description: string;
  local_description?: string;
  category: string;
  materials: string[];
  price_inr: number;
  image_url: string;
  audio_url?: string | null;
  source_language_code?: string;
  ai_provider?: AiProvider | "legacy";
  status: ProductStatus;
  craft_title?: string;
  craft_story?: string;
  primary_material?: string;
  secondary_materials?: string[];
  craft_technique?: string;
  hsn_tax_code?: string;
  market_price_min?: number;
  market_price_max?: number;
  available_stock?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  weight_grams?: number;
  color?: string;
  care_instructions?: string;
  production_time_days?: number;
  artisan_location?: string;
  tags?: string[];
  ai_confidence?: number;
  ai_warnings?: string[];
  transcript?: string;
  translated_input?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
};

export type InquiryStatus = "new" | "contacted" | "closed";

export type Inquiry = {
  id: string;
  product_id: string;
  product_title: string;
  buyer_name: string;
  buyer_contact: string;
  quantity: number;
  message: string;
  status: InquiryStatus;
  created_at?: string;
};

export type SupabaseHealth = {
  status: "ready" | "setup_required" | "connection_failed";
  configured: boolean;
  connected: boolean;
};

export type ProviderStatus = {
  selected: "openai" | "ollama";
  providers: Record<"openai" | "ollama", boolean>;
  sarvam_configured: boolean;
};

export type DashboardSummary = {
  artisan: ArtisanProfile;
  metrics: {
    total_earnings: number;
    live_products: number;
    inquiries_count: number;
    active_orders: number;
  };
  recent_products: Product[];
  recent_inquiries: Inquiry[];
};

export type BuyerProfile = {
  id: string;
  account_id?: string | null;
  buyer_name: string;
  phone: string;
  email?: string;
  delivery_address: string;
  preferred_language: LanguageCode;
};

export type CartItem = {
  product_id: string;
  product_title?: string | null;
  quantity: number;
  unit_price_inr?: number | null;
  line_total_inr?: number | null;
  image_url?: string | null;
  artisan_name?: string | null;
};

export type Cart = {
  buyer_id: string;
  items: CartItem[];
  total_inr: number;
};

export type OrderItem = {
  id?: string | null;
  order_id?: string | null;
  product_id: string;
  artisan_id?: string | null;
  product_title?: string | null;
  quantity: number;
  unit_price_inr: number;
  line_total_inr: number;
};

export type OrderStatus = "placed" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  buyer_name: string;
  buyer_contact: string;
  delivery_address: string;
  items: OrderItem[];
  total_inr: number;
  status: OrderStatus;
  payment_mode: "upi" | "cod" | "unpaid";
  created_at?: string | null;
};
