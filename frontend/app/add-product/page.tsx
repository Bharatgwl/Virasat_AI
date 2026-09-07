"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateListing, getProviderStatus, MAX_AI_AUDIO_BYTES, MAX_AI_IMAGE_BYTES } from "@/lib/services/ai";
import { languageOptions } from "@/lib/services/language";
import { getCurrentArtisan } from "@/lib/services/artisans";
import { isApiRequestError, uploadFile } from "@/lib/api-client";
import { createProductFromListing } from "@/lib/services/products";
import type { AiProvider, ArtisanProfile, GeneratedListing, LanguageCode, ProviderStatus } from "@/lib/types";

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function joinList(value: string[]) {
  return value.join(", ");
}

const RECORDER_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

function recorderOptions(): MediaRecorderOptions | undefined {
  const mimeType = RECORDER_MIME_TYPES.find((candidate) => MediaRecorder.isTypeSupported(candidate));
  return mimeType ? { mimeType } : undefined;
}

function audioFileFromBlob(blob: Blob): File {
  const mimeType = blob.type.split(";", 1)[0].toLowerCase() || "audio/webm";
  const extension = mimeType === "audio/mp4" || mimeType === "audio/x-m4a"
    ? "m4a"
    : mimeType === "audio/ogg"
      ? "ogg"
      : mimeType === "audio/mpeg"
        ? "mp3"
        : mimeType === "audio/aac" || mimeType === "audio/x-aac"
          ? "aac"
          : "webm";
  return new File([blob], `artisan-voice-note.${extension}`, { type: mimeType });
}

export default function AddProductPage() {
  const router = useRouter();
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>("hi");
  const [aiProvider, setAiProvider] = useState<AiProvider>("ollama");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [typedHint, setTypedHint] = useState("");
  const [listing, setListing] = useState<GeneratedListing | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getCurrentArtisan().then((profile) => {
      setArtisan(profile);
      setSourceLanguage(profile.preferred_language);
    });
    getProviderStatus().then(setProviderStatus);
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function chooseImage(file: File | null) {
    setError("");
    if (!file) {
      setImage(null);
      setImagePreview("");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Image must be JPG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_AI_IMAGE_BYTES) {
      setError("Image must be 3 MB or smaller for secure cloud processing.");
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = recorderOptions();
      const recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      chunksRef.current = [];
      setAudioBlob(null);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const recordingBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (recordingBlob.size > MAX_AI_AUDIO_BYTES) {
          setAudioBlob(null);
          setError("The voice note is too large. Please record a shorter note.");
        } else {
          setAudioBlob(recordingBlob);
        }
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      timerRef.current = setTimeout(() => stopRecording(), 29_000);
    } catch {
      setError("Microphone access was not available. You can type a short hint instead.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  async function submitForGeneration(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!image) {
      setError("Product image is required.");
      return;
    }
    if (!audioBlob && typedHint.trim().length < 2) {
      setError("Add a voice note or a small typed hint.");
      return;
    }
    if (!artisan) {
      setError("Seller profile is required before generating a listing.");
      return;
    }

    const audioFile = audioBlob ? audioFileFromBlob(audioBlob) : undefined;

    setBusy(true);
    try {
      const generated = await generateListing({
        image_file: image,
        audio_file: audioFile,
        typed_hint: typedHint,
        source_language: sourceLanguage,
        ai_provider: aiProvider,
        artisan_name: artisan.artisan_name,
      });
      setListing(generated);
    } catch (requestError) {
      const retryText = isApiRequestError(requestError) && requestError.retryAfterSeconds
        ? ` Please retry in about ${requestError.retryAfterSeconds} seconds.`
        : "";
      setError(`${requestError instanceof Error ? requestError.message : "Could not generate listing."}${retryText}`);
    } finally {
      setBusy(false);
    }
  }

  function updateListing<K extends keyof GeneratedListing>(key: K, value: GeneratedListing[K]) {
    if (!listing) return;
    setListing({ ...listing, [key]: value });
  }

  async function continueToReview() {
    if (!listing || !image || !artisan) return;
    setSaving(true);
    setError("");
    try {
      const imageUpload = await uploadFile("image", image);
      const audioFile = audioBlob ? audioFileFromBlob(audioBlob) : null;
      const audioUpload = audioFile ? await uploadFile("audio", audioFile) : null;
      const product = await createProductFromListing({
        listing,
        artisan,
        imageUrl: imageUpload.url,
        audioUrl: audioUpload?.url,
      });
      router.push(`/seller/products/review?id=${product.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save the generated product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#b84f28]">Add craft</p>
          <h1 className="mt-2 text-4xl font-black">Photo and voice to product listing</h1>
          <p className="mt-3 max-w-2xl text-[#6d5145]">
            The artisan only needs a clear product image and a short voice note. AI fills listing fields, then the user can edit every field in a popup.
          </p>

          <div className="warm-card mt-6 p-5">
            <p className="font-bold">Separate input handling</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {["Image analysis", "Sarvam voice transcript", "Editable listing popup"].map((item) => (
                <div className="rounded-2xl bg-white p-4 text-sm font-bold text-[#6d5145]" key={item}>{item}</div>
              ))}
            </div>
          </div>
        </section>

        <form className="app-card grid gap-5 p-5" onSubmit={submitForGeneration}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">AI provider</span>
              <select className="field" onChange={(event) => setAiProvider(event.target.value as AiProvider)} value={aiProvider}>
                <option value="ollama">Ollama</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>
            <label>
              <span className="field-label">Spoken language</span>
              <select className="field" onChange={(event) => setSourceLanguage(event.target.value as LanguageCode)} value={sourceLanguage}>
                {languageOptions.map((language) => (
                  <option key={language.code} value={language.code}>{language.label}</option>
                ))}
              </select>
            </label>
          </div>

          {providerStatus && (
            <div className="rounded-2xl bg-[#fcf9f6] p-4 text-sm text-[#6d5145]">
              <p><strong>Backend readiness:</strong> Ollama {providerStatus.providers.ollama ? "ready" : "not configured"}, OpenAI {providerStatus.providers.openai ? "ready" : "not configured"}, Sarvam {providerStatus.sarvam_configured ? "ready" : "not configured"}.</p>
            </div>
          )}

          <label>
            <span className="field-label">Product image required</span>
            <input accept="image/jpeg,image/png,image/webp" className="field" onChange={(event) => chooseImage(event.target.files?.[0] ?? null)} type="file" />
          </label>
          {imagePreview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img alt="Selected product preview" className="h-64 w-full rounded-2xl object-cover" src={imagePreview} />
          )}

          <div className="rounded-2xl border border-dashed border-[#d8c2b3] p-4">
            <p className="font-bold">Voice note strongly recommended</p>
            <p className="mt-1 text-sm text-[#6d5145]">Ask the artisan to say material, use, technique, location, and story. Recording auto-stops before 30 seconds.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!recording ? (
                <button className="secondary-button" onClick={startRecording} type="button">Start voice</button>
              ) : (
                <button className="primary-button bg-red-700" onClick={stopRecording} type="button">Stop voice</button>
              )}
              {audioBlob && <span className="pill bg-[#e8f3ec] text-[#2d6a4f]">Voice ready</span>}
            </div>
          </div>

          <label>
            <span className="field-label">Optional typed hint</span>
            <textarea className="field min-h-24" maxLength={500} onChange={(event) => setTypedHint(event.target.value)} placeholder="Example: clay water pitcher, keeps water cool, made in Kutch" value={typedHint} />
          </label>

          {error && <p className="rounded-2xl bg-red-50 p-4 text-red-800" role="alert">{error}</p>}
          <button className="primary-button w-full" disabled={busy} type="submit">
            {busy ? "Generating auto-filled details..." : "Generate auto-filled listing"}
          </button>
        </form>
      </div>

      {listing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#211814]/55 p-4 backdrop-blur-sm">
          <section className="app-card mx-auto my-8 max-w-5xl overflow-hidden">
            <div className="bg-[#b84f28] px-5 py-4 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">AI auto-filled from photo and voice note</p>
              <h2 className="mt-1 text-2xl font-black">Review listing information</h2>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <label className="lg:col-span-2">
                <span className="field-label">Craft title</span>
                <input className="field" onChange={(event) => updateListing("craft_title", event.target.value)} value={listing.craft_title} />
              </label>
              <label className="lg:col-span-2">
                <span className="field-label">Craft story and details</span>
                <textarea className="field min-h-28" onChange={(event) => updateListing("craft_story", event.target.value)} value={listing.craft_story} />
              </label>
              <label className="lg:col-span-2">
                <span className="field-label">Local language story</span>
                <textarea className="field min-h-24" onChange={(event) => updateListing("local_description", event.target.value)} value={listing.local_description ?? ""} />
              </label>
              <label>
                <span className="field-label">Primary material</span>
                <input className="field" onChange={(event) => updateListing("primary_material", event.target.value)} value={listing.primary_material} />
              </label>
              <label>
                <span className="field-label">Secondary materials comma separated</span>
                <input className="field" onChange={(event) => updateListing("secondary_materials", splitList(event.target.value))} value={joinList(listing.secondary_materials)} />
              </label>
              <label>
                <span className="field-label">Craft technique</span>
                <input className="field" onChange={(event) => updateListing("craft_technique", event.target.value)} value={listing.craft_technique} />
              </label>
              <label>
                <span className="field-label">Category</span>
                <input className="field" onChange={(event) => updateListing("category", event.target.value)} value={listing.category} />
              </label>
              <label>
                <span className="field-label">HSN tax code</span>
                <input className="field" inputMode="numeric" onChange={(event) => updateListing("hsn_tax_code", event.target.value)} value={listing.hsn_tax_code ?? ""} />
              </label>
              <label>
                <span className="field-label">Price INR</span>
                <input className="field" min="1" onChange={(event) => updateListing("price_inr", Number(event.target.value))} type="number" value={listing.price_inr} />
              </label>
              <label>
                <span className="field-label">Market price min</span>
                <input className="field" min="1" onChange={(event) => updateListing("market_price_min", Number(event.target.value))} type="number" value={listing.market_price_min ?? ""} />
              </label>
              <label>
                <span className="field-label">Market price max</span>
                <input className="field" min="1" onChange={(event) => updateListing("market_price_max", Number(event.target.value))} type="number" value={listing.market_price_max ?? ""} />
              </label>
              <label>
                <span className="field-label">Available stock</span>
                <input className="field" min="0" onChange={(event) => updateListing("available_stock", Number(event.target.value))} type="number" value={listing.available_stock} />
              </label>
              <label>
                <span className="field-label">Color</span>
                <input className="field" onChange={(event) => updateListing("color", event.target.value)} value={listing.color ?? ""} />
              </label>
              <label>
                <span className="field-label">Production time days</span>
                <input className="field" min="0" onChange={(event) => updateListing("production_time_days", Number(event.target.value))} type="number" value={listing.production_time_days ?? ""} />
              </label>
              <label>
                <span className="field-label">Tags comma separated</span>
                <input className="field" onChange={(event) => updateListing("tags", splitList(event.target.value))} value={joinList(listing.tags)} />
              </label>
              <label className="lg:col-span-2">
                <span className="field-label">Care instructions</span>
                <input className="field" onChange={(event) => updateListing("care_instructions", event.target.value)} value={listing.care_instructions ?? ""} />
              </label>

              <details className="warm-card p-4 lg:col-span-2">
                <summary className="cursor-pointer font-bold">Transcript, AI confidence, and warnings</summary>
                <p className="mt-3 text-sm text-[#6d5145]">Transcript: {listing.transcript ?? "No transcript available yet."}</p>
                <p className="mt-2 text-sm text-[#6d5145]">Confidence: {Math.round(listing.confidence * 100)}%</p>
                {listing.warnings.map((warning) => (
                  <p className="mt-2 text-sm font-semibold text-[#9a4a16]" key={warning}>{warning}</p>
                ))}
              </details>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#eadbcf] p-5">
              <button className="secondary-button" onClick={() => setListing(null)} type="button">Close</button>
              <button className="primary-button" disabled={saving} onClick={() => void continueToReview()} type="button">
                {saving ? "Uploading and saving..." : "Save and continue to review"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
