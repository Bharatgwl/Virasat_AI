"use client";

import { type DragEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  generateListing,
  getProviderStatus,
  MAX_AI_AUDIO_BYTES,
  MAX_AI_AUDIO_DURATION_SECONDS,
  MAX_AI_IMAGE_BYTES,
} from "@/lib/services/ai";
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
const UPLOAD_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/x-aac",
]);
const AUDIO_ACCEPT = ".webm,.ogg,.mp3,.wav,.m4a,.mp4,.aac,audio/webm,audio/ogg,audio/mpeg,audio/wav,audio/mp4,audio/aac";

function recorderOptions(): MediaRecorderOptions | undefined {
  const mimeType = RECORDER_MIME_TYPES.find((candidate) => MediaRecorder.isTypeSupported(candidate));
  return mimeType ? { mimeType } : undefined;
}

function normalizedAudioMimeType(blob: Blob, filename = "") {
  const supplied = blob.type.split(";", 1)[0].toLowerCase();
  if (supplied === "audio/mp3") return "audio/mpeg";
  if (["audio/m4a", "audio/x-m4a"].includes(supplied)) return "audio/mp4";
  if (["audio/x-aac"].includes(supplied)) return "audio/aac";
  if (["audio/x-wav", "audio/wave"].includes(supplied)) return "audio/wav";
  if (supplied) return supplied;
  const extension = filename.toLowerCase().split(".").pop();
  return extension === "m4a" || extension === "mp4"
    ? "audio/mp4"
    : extension === "mp3"
      ? "audio/mpeg"
      : extension === "wav"
        ? "audio/wav"
        : extension === "ogg"
          ? "audio/ogg"
          : extension === "aac"
            ? "audio/aac"
            : extension === "webm"
              ? "audio/webm"
              : "";
}

function audioFileFromBlob(blob: Blob, originalName = ""): File {
  const mimeType = normalizedAudioMimeType(blob, originalName) || "audio/webm";
  const extension = mimeType === "audio/mp4" || mimeType === "audio/x-m4a"
    ? "m4a"
    : mimeType === "audio/ogg"
      ? "ogg"
      : mimeType === "audio/mpeg"
        ? "mp3"
        : mimeType === "audio/aac" || mimeType === "audio/x-aac"
          ? "aac"
          : "webm";
  const name = originalName || `artisan-voice-note.${extension}`;
  return new File([blob], name, { type: mimeType });
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Audio metadata could not be read."));
    }, 10_000);

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      const duration = audio.duration;
      cleanup();
      if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error("Audio duration is invalid."));
    };
    audio.onerror = () => {
      window.clearTimeout(timeout);
      cleanup();
      reject(new Error("Audio file could not be read."));
    };
    audio.src = url;
  });
}

export default function AddProductPage() {
  const router = useRouter();
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>("hi");
  const [aiProvider, setAiProvider] = useState<AiProvider>("ollama");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioSource, setAudioSource] = useState<"recorded" | "uploaded" | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [draggingAudio, setDraggingAudio] = useState(false);
  const [typedHint, setTypedHint] = useState("");
  const [listing, setListing] = useState<GeneratedListing | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

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
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const activeStream = stream;
      const options = recorderOptions();
      const recorder = options ? new MediaRecorder(activeStream, options) : new MediaRecorder(activeStream);
      chunksRef.current = [];
      setAudioFile(null);
      setAudioSource(null);
      setAudioDuration(null);
      if (audioInputRef.current) audioInputRef.current.value = "";
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const recordingBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const elapsedSeconds = recordingStartedAtRef.current
          ? Math.max(0.1, (Date.now() - recordingStartedAtRef.current) / 1000)
          : 0;
        recordingStartedAtRef.current = null;
        if (!recordingBlob.size) {
          setAudioFile(null);
          setError("No voice was captured. Please record again.");
        } else if (recordingBlob.size > MAX_AI_AUDIO_BYTES) {
          setAudioFile(null);
          setError("The voice note is too large. Please record a shorter note.");
        } else if (elapsedSeconds >= MAX_AI_AUDIO_DURATION_SECONDS) {
          setAudioFile(null);
          setError("The voice note must be shorter than 30 seconds. Please record again.");
        } else {
          setAudioFile(audioFileFromBlob(recordingBlob));
          setAudioSource("recorded");
          setAudioDuration(elapsedSeconds);
        }
        activeStream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recordingStartedAtRef.current = Date.now();
      recorderRef.current = recorder;
      setRecording(true);
      timerRef.current = setTimeout(() => stopRecording(), 29_000);
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      setError("Microphone access was not available. You can type a short hint instead.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  function clearVoice() {
    setAudioFile(null);
    setAudioSource(null);
    setAudioDuration(null);
    if (audioInputRef.current) audioInputRef.current.value = "";
  }

  async function chooseUploadedVoice(file: File | null) {
    setDraggingAudio(false);
    setError("");
    if (!file) return;
    if (recording) {
      setError("Stop the current recording before uploading a voice note.");
      return;
    }

    const mimeType = normalizedAudioMimeType(file, file.name);
    if (!mimeType || !UPLOAD_AUDIO_TYPES.has(mimeType)) {
      clearVoice();
      setError("Upload a WebM, OGG, MP3, WAV, M4A, MP4, or AAC voice note.");
      return;
    }
    if (!file.size) {
      clearVoice();
      setError("The selected voice file is empty.");
      return;
    }
    if (file.size > MAX_AI_AUDIO_BYTES) {
      clearVoice();
      setError(`The voice file must be ${Math.floor(MAX_AI_AUDIO_BYTES / 1000)} KB or smaller.`);
      return;
    }

    const normalizedFile = audioFileFromBlob(file, file.name);
    try {
      const duration = await readAudioDuration(normalizedFile);
      if (duration >= MAX_AI_AUDIO_DURATION_SECONDS) {
        clearVoice();
        setError("The prerecorded voice note must be shorter than 30 seconds.");
        return;
      }
      setAudioFile(normalizedFile);
      setAudioSource("uploaded");
      setAudioDuration(duration);
      setListing(null);
    } catch {
      clearVoice();
      setError("The selected audio could not be verified. Choose another supported voice file.");
    }
  }

  function dropUploadedVoice(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (recording || busy) {
      setDraggingAudio(false);
      setError(recording ? "Stop the current recording before uploading a voice note." : "Wait for the current request to finish.");
      return;
    }
    void chooseUploadedVoice(event.dataTransfer.files?.[0] ?? null);
  }

  async function submitForGeneration(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!image) {
      setError("Product image is required.");
      return;
    }
    if (!audioFile && typedHint.trim().length < 2) {
      setError("Add a voice note or a small typed hint.");
      return;
    }
    if (!artisan) {
      setError("Seller profile is required before generating a listing.");
      return;
    }

    setBusy(true);
    try {
      const generated = await generateListing({
        image_file: image,
        audio_file: audioFile ?? undefined,
        audio_duration_seconds: audioDuration ?? undefined,
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
            <p className="font-bold">Add one voice note</p>
            <p className="mt-1 text-sm text-[#6d5145]">
              Record now or upload one prerecorded file. Use only one option at a time; choosing another replaces the current voice note.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className={`rounded-2xl border p-4 ${audioSource === "recorded" ? "border-[#2d6a4f] bg-[#f1f8f3]" : "border-[#eadbcf] bg-white"}`}>
                <p className="font-bold">Record now</p>
                <p className="mt-1 text-xs text-[#6d5145]">Speak about material, use, technique, location, and story.</p>
                {!recording ? (
                  <button className="secondary-button mt-4" disabled={busy} onClick={() => void startRecording()} type="button">
                    {audioSource === "uploaded" ? "Replace with recording" : "Start voice"}
                  </button>
                ) : (
                  <button className="primary-button mt-4 bg-red-700" onClick={stopRecording} type="button">Stop voice</button>
                )}
              </div>

              <label
                className={`cursor-pointer rounded-2xl border border-dashed p-4 transition ${
                  draggingAudio ? "border-[#b84f28] bg-[#fff3ec]" : audioSource === "uploaded" ? "border-[#2d6a4f] bg-[#f1f8f3]" : "border-[#d8c2b3] bg-white"
                } ${recording || busy ? "cursor-not-allowed opacity-60" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (!recording && !busy) setDraggingAudio(true);
                }}
                onDragLeave={() => setDraggingAudio(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={dropUploadedVoice}
              >
                <span className="block font-bold">Upload prerecorded voice</span>
                <span className="mt-1 block text-xs text-[#6d5145]">Drop audio here or select a file. Maximum 750 KB and shorter than 30 seconds.</span>
                <span className="secondary-button mt-4 inline-flex">Choose audio</span>
                <input
                  accept={AUDIO_ACCEPT}
                  className="sr-only"
                  disabled={recording || busy}
                  onChange={(event) => void chooseUploadedVoice(event.target.files?.[0] ?? null)}
                  ref={audioInputRef}
                  type="file"
                />
              </label>
            </div>

            {audioFile && audioSource && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e8f3ec] p-3 text-sm text-[#285c45]">
                <div>
                  <p className="font-bold">{audioSource === "recorded" ? "Recorded voice ready" : "Uploaded voice ready"}</p>
                  <p className="mt-0.5 break-all text-xs">
                    {audioFile.name} · {audioDuration?.toFixed(1)} seconds · {Math.ceil(audioFile.size / 1000)} KB
                  </p>
                </div>
                <button className="secondary-button" disabled={busy} onClick={clearVoice} type="button">Remove</button>
              </div>
            )}
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
