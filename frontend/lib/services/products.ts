import { apiRequest } from "@/lib/api-client";
import type { ArtisanProfile, GeneratedListing, Product, ProductStatus } from "@/lib/types";

export async function listProducts(status?: ProductStatus): Promise<Product[]> {
  const path = status ? `/api/seller/products?status=${status}` : "/api/seller/products";
  return apiRequest<Product[]>(path);
}

export async function listMarketplaceProducts(): Promise<Product[]> {
  return apiRequest<Product[]>("/api/buyer/products");
}

export async function getProduct(id: string): Promise<Product> {
  return apiRequest<Product>(`/api/buyer/products/${id}`);
}

export async function getManagedProduct(id: string): Promise<Product> {
  return apiRequest<Product>(`/api/seller/products/${id}`);
}

export async function createProductFromListing(input: {
  listing: GeneratedListing;
  artisan: ArtisanProfile;
  imageUrl: string;
  audioUrl?: string;
}): Promise<Product> {
  const { listing, artisan, imageUrl, audioUrl } = input;
  const created = await apiRequest<Product>("/api/seller/products", {
    method: "POST",
    body: JSON.stringify({
      artisan_id: artisan.id,
      artisan_name: artisan.artisan_name,
      title: listing.craft_title,
      description: listing.craft_story,
      local_description: listing.local_description ?? "",
      category: listing.category,
      materials: [listing.primary_material, ...listing.secondary_materials],
      price_inr: listing.price_inr,
      image_url: imageUrl,
      audio_url: audioUrl,
      source_language_code: listing.source_language,
      ai_provider: listing.ai_provider,
      craft_title: listing.craft_title,
      craft_story: listing.craft_story,
      primary_material: listing.primary_material,
      secondary_materials: listing.secondary_materials,
      craft_technique: listing.craft_technique,
      hsn_tax_code: listing.hsn_tax_code || undefined,
      market_price_min: listing.market_price_min,
      market_price_max: listing.market_price_max,
      available_stock: listing.available_stock,
      length_cm: listing.dimensions?.length_cm,
      width_cm: listing.dimensions?.width_cm,
      height_cm: listing.dimensions?.height_cm,
      weight_grams: listing.weight_grams,
      color: listing.color,
      care_instructions: listing.care_instructions,
      production_time_days: listing.production_time_days,
      artisan_location: listing.artisan_location || artisan.location,
      tags: listing.tags,
      transcript: listing.transcript,
      translated_input: listing.translated_input,
      ai_confidence: listing.confidence,
      ai_warnings: listing.warnings,
    }),
  });
  return updateProduct(created.id, { status: "generated" });
}

export async function updateProduct(id: string, changes: Partial<Product>): Promise<Product> {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, published_at: _publishedAt, ...editable } = changes;
  void _id;
  void _createdAt;
  void _updatedAt;
  void _publishedAt;
  return apiRequest<Product>(`/api/seller/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(editable),
  });
}

export async function publishProduct(id: string): Promise<Product> {
  return apiRequest<Product>(`/api/seller/products/${id}/publish`, { method: "POST" });
}
