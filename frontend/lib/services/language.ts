import type { LanguageCode } from "@/lib/types";

export const languageOptions: { code: LanguageCode; label: string; english: string; locale: string }[] = [
  { code: "hi", label: "हिन्दी", english: "Hindi", locale: "hi-IN" },
  { code: "en", label: "English", english: "English", locale: "en-IN" },
  { code: "gu", label: "ગુજરાતી", english: "Gujarati", locale: "gu-IN" },
  { code: "mr", label: "मराठी", english: "Marathi", locale: "mr-IN" },
  { code: "ta", label: "தமிழ்", english: "Tamil", locale: "ta-IN" },
  { code: "te", label: "తెలుగు", english: "Telugu", locale: "te-IN" },
  { code: "kn", label: "ಕನ್ನಡ", english: "Kannada", locale: "kn-IN" },
  { code: "bn", label: "বাংলা", english: "Bengali", locale: "bn-IN" },
  { code: "pa", label: "ਪੰਜਾਬੀ", english: "Punjabi", locale: "pa-IN" },
];

export function languageLocale(code: LanguageCode) {
  return languageOptions.find((language) => language.code === code)?.locale ?? "en-IN";
}
