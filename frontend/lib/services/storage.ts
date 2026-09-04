import type { ArtisanProfile, LanguageCode } from "@/lib/types";
import { clearSessionToken } from "@/lib/api-client";

const languageKey = "viraasat_language";
const profileKey = "viraasat_artisan_profile";

export function getStoredLanguage(): LanguageCode | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(languageKey);
  return isLanguageCode(value) ? value : null;
}

export function setStoredLanguage(language: LanguageCode) {
  window.localStorage.setItem(languageKey, language);
  window.dispatchEvent(new Event("viraasat-language-change"));
}

export function subscribeToLanguage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("viraasat-language-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("viraasat-language-change", callback);
  };
}

export function getStoredProfile(): ArtisanProfile | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(profileKey);
  if (!value) return null;
  try {
    return JSON.parse(value) as ArtisanProfile;
  } catch {
    return null;
  }
}

export function setStoredProfile(profile: ArtisanProfile) {
  window.localStorage.setItem(profileKey, JSON.stringify(profile));
}

export function clearStoredProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(profileKey);
}

export function clearLocalSession() {
  window.localStorage.removeItem(languageKey);
  window.localStorage.removeItem(profileKey);
  window.localStorage.removeItem("viraasat_buyer_profile");
  window.localStorage.removeItem("viraasat_active_account");
  clearSessionToken();
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && ["en", "hi", "gu", "mr", "ta", "te", "kn", "bn", "pa"].includes(value);
}
