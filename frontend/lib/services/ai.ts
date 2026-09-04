import { apiRequest } from "@/lib/api-client";
import type { CatalogGenerationInput, GeneratedListing, ProviderStatus } from "@/lib/types";

// Vercel Functions have a 4.5 MB body limit. These limits reserve space for
// multipart metadata and the other text fields in the generation request.
export const MAX_AI_IMAGE_BYTES = 3_000_000;
export const MAX_AI_AUDIO_BYTES = 750_000;
const MAX_AI_MEDIA_BYTES = 3_750_000;

export async function getProviderStatus(): Promise<ProviderStatus> {
  try {
    return await apiRequest<ProviderStatus>("/api/seller/snaplist/providers");
  } catch {
    return {
      selected: "ollama",
      providers: { openai: false, ollama: false },
      sarvam_configured: false,
    };
  }
}

export async function generateListing(input: CatalogGenerationInput): Promise<GeneratedListing> {
  if (input.image_file.size > MAX_AI_IMAGE_BYTES) {
    throw new Error("Compress the product image to 3 MB or less before continuing.");
  }
  if (input.audio_file && input.audio_file.size > MAX_AI_AUDIO_BYTES) {
    throw new Error("The voice note is too large. Record a new note under 30 seconds.");
  }
  if (input.image_file.size + (input.audio_file?.size ?? 0) > MAX_AI_MEDIA_BYTES) {
    throw new Error("The image and voice note are too large together. Use a smaller image.");
  }

  const form = new FormData();
  form.append("image", input.image_file);
  form.append("provider", input.ai_provider);
  form.append("artisan_name", input.artisan_name);
  form.append("language_code", input.source_language);
  form.append("description", input.typed_hint ?? "");
  if (input.audio_file) form.append("audio", input.audio_file);

  try {
    return await apiRequest<GeneratedListing>("/api/seller/snaplist/generate", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(75_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("AI generation timed out safely. Please try again.");
    }
    throw error;
  }
}
