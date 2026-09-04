import { apiRequest } from "@/lib/api-client";
import { clearStoredProfile, getStoredProfile, setStoredProfile } from "@/lib/services/storage";
import { getActiveAccount } from "@/lib/services/accounts";
import type { ArtisanProfile, LanguageCode } from "@/lib/types";

export type ArtisanRegistrationInput = {
  account_id?: string;
  artisan_name: string;
  phone: string;
  location: string;
  craft_type: string;
  preferred_language: LanguageCode;
  upi_id?: string;
};

export function validateRegistration(input: ArtisanRegistrationInput) {
  const errors: Record<string, string> = {};
  if (input.artisan_name.trim().length < 2) errors.artisan_name = "Enter artisan name.";
  if (!/^[6-9]\d{9}$/.test(input.phone.trim())) errors.phone = "Enter a valid 10 digit Indian mobile number.";
  if (input.location.trim().length < 2) errors.location = "Enter village, city, or cluster.";
  if (input.craft_type.trim().length < 2) errors.craft_type = "Enter craft type.";
  if (input.upi_id && !/^[\w.-]+@[\w.-]+$/.test(input.upi_id.trim())) errors.upi_id = "Enter a valid UPI ID.";
  return errors;
}

export async function createArtisanProfile(input: ArtisanRegistrationInput): Promise<ArtisanProfile> {
  const profile = await apiRequest<ArtisanProfile>("/api/seller/profile", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setStoredProfile(profile);
  return profile;
}

export async function getCurrentArtisan(forceRefresh = false): Promise<ArtisanProfile> {
  const account = getActiveAccount();
  if (!account || account.role !== "seller") {
    throw new Error("Seller login is required.");
  }
  const stored = getStoredProfile();
  if (!forceRefresh && stored?.account_id === account.id) return stored;
  if (stored) clearStoredProfile();

  const profile = await apiRequest<ArtisanProfile>("/api/seller/profile");
  setStoredProfile(profile);
  return profile;
}
