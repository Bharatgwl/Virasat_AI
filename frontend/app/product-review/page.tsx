"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getManagedProduct, publishProduct, updateProduct } from "@/lib/services/products";
import type { Product } from "@/lib/types";

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function editableChanges(product: Product) {
  return {
    title: product.title,
    description: product.description,
    local_description: product.local_description ?? "",
    category: product.category,
    materials: product.materials,
    price_inr: product.price_inr,
    craft_title: product.craft_title || product.title,
    craft_story: product.craft_story || product.description,
    primary_material: product.primary_material || product.materials[0],
    secondary_materials: product.secondary_materials ?? product.materials.slice(1),
    craft_technique: product.craft_technique,
    hsn_tax_code: product.hsn_tax_code || undefined,
    market_price_min: product.market_price_min,
    market_price_max: product.market_price_max,
    available_stock: product.available_stock ?? 1,
    length_cm: product.length_cm,
    width_cm: product.width_cm,
    height_cm: product.height_cm,
    weight_grams: product.weight_grams,
    color: product.color,
    care_instructions: product.care_instructions,
    production_time_days: product.production_time_days,
    artisan_location: product.artisan_location,
    tags: product.tags ?? [],
  };
}

function ProductReviewContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id") ?? "";

  if (!productId) {
    return (
      <div className="app-shell">
        <section className="app-card mx-auto max-w-xl p-8 text-center">
          <h1 className="text-3xl font-black">Product review unavailable</h1>
          <p className="mt-3 text-[#6d5145]">Choose a product from the catalog to review it.</p>
          <Link className="secondary-button mt-5 inline-flex" href="/seller/catalog">Return to catalog</Link>
        </section>
      </div>
    );
  }

  return <ProductReviewRecord key={productId} productId={productId} />;
}

function ProductReviewRecord({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getManagedProduct(productId)
      .then((loadedProduct) => {
        if (active) setProduct(loadedProduct);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not load product.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  function change<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((current) => current ? { ...current, [key]: value } : current);
  }

  async function save() {
    if (!product) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateProduct(product.id, editableChanges(product));
      setProduct(updated);
      setMessage("Changes saved successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!product) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const ready = await updateProduct(product.id, { ...editableChanges(product), status: "ready" });
      const live = await publishProduct(ready.id);
      setProduct(live);
      setMessage("Product is now live in the marketplace.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not publish product.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="app-shell"><section className="app-card p-6">Loading product review...</section></div>;

  if (!product) {
    return (
      <div className="app-shell">
        <section className="app-card mx-auto max-w-xl p-8 text-center">
          <h1 className="text-3xl font-black">Product review unavailable</h1>
          <p className="mt-3 text-[#6d5145]">{error || "Choose a product from the catalog to review it."}</p>
          <Link className="secondary-button mt-5 inline-flex" href="/seller/catalog">Return to catalog</Link>
        </section>
      </div>
    );
  }

  const published = product.status === "published";

  return (
    <div className="app-shell">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#b84f28]">Product review · {product.status}</p>
          <h1 className="mt-2 text-4xl font-black">Review listing information</h1>
          <p className="mt-2 text-[#6d5145]">Edit the AI-filled details, save them, and publish only when every required field is correct.</p>
        </div>
        <Link className="secondary-button" href="/seller/catalog">Back to catalog</Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="app-card h-fit overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={product.title} className="h-96 w-full object-cover" src={product.image_url} />
          <div className="p-5">
            <p className="font-black">{product.artisan_name}</p>
            <p className="mt-1 text-sm text-[#6d5145]">{product.ai_provider ? `Generated with ${product.ai_provider}` : "Listing source not recorded"}</p>
            {typeof product.ai_confidence === "number" && <span className="pill mt-4 bg-[#e8f3ec] text-[#2d6a4f]">AI confidence {Math.round(product.ai_confidence * 100)}%</span>}
          </div>
        </div>

        <div className="app-card grid gap-5 p-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="field-label">Product title</span><input className="field" disabled={published} maxLength={180} onChange={(event) => change("title", event.target.value)} value={product.title} /></label>
          <label className="sm:col-span-2"><span className="field-label">Product story and description</span><textarea className="field min-h-32" disabled={published} maxLength={3000} onChange={(event) => change("description", event.target.value)} value={product.description} /></label>
          <label className="sm:col-span-2"><span className="field-label">Local language story</span><textarea className="field min-h-24" disabled={published} maxLength={3000} onChange={(event) => change("local_description", event.target.value)} value={product.local_description ?? ""} /></label>
          <label><span className="field-label">Category</span><input className="field" disabled={published} maxLength={100} onChange={(event) => change("category", event.target.value)} value={product.category} /></label>
          <label><span className="field-label">Craft technique</span><input className="field" disabled={published} maxLength={120} onChange={(event) => change("craft_technique", event.target.value)} value={product.craft_technique ?? ""} /></label>
          <label><span className="field-label">Primary material</span><input className="field" disabled={published} maxLength={120} onChange={(event) => { const primary = event.target.value; change("primary_material", primary); change("materials", [primary, ...(product.secondary_materials ?? [])].filter(Boolean)); }} value={product.primary_material ?? ""} /></label>
          <label><span className="field-label">Secondary materials</span><input className="field" disabled={published} onChange={(event) => { const secondary = splitList(event.target.value); change("secondary_materials", secondary); change("materials", [product.primary_material ?? "", ...secondary].filter(Boolean)); }} value={(product.secondary_materials ?? []).join(", ")} /></label>
          <label><span className="field-label">HSN tax code</span><input className="field" disabled={published} inputMode="numeric" maxLength={8} onChange={(event) => change("hsn_tax_code", event.target.value.replace(/\D/g, ""))} value={product.hsn_tax_code ?? ""} /></label>
          <label><span className="field-label">Selling price (INR)</span><input className="field" disabled={published} min="1" onChange={(event) => change("price_inr", Number(event.target.value))} type="number" value={product.price_inr} /></label>
          <label><span className="field-label">Market price minimum</span><input className="field" disabled={published} min="1" onChange={(event) => change("market_price_min", Number(event.target.value) || undefined)} type="number" value={product.market_price_min ?? ""} /></label>
          <label><span className="field-label">Market price maximum</span><input className="field" disabled={published} min="1" onChange={(event) => change("market_price_max", Number(event.target.value) || undefined)} type="number" value={product.market_price_max ?? ""} /></label>
          <label><span className="field-label">Available stock</span><input className="field" disabled={published} min="0" onChange={(event) => change("available_stock", Number(event.target.value))} type="number" value={product.available_stock ?? 0} /></label>
          <label><span className="field-label">Production time (days)</span><input className="field" disabled={published} min="0" onChange={(event) => change("production_time_days", Number(event.target.value) || undefined)} type="number" value={product.production_time_days ?? ""} /></label>
          <label><span className="field-label">Color</span><input className="field" disabled={published} maxLength={80} onChange={(event) => change("color", event.target.value)} value={product.color ?? ""} /></label>
          <label><span className="field-label">Weight (grams)</span><input className="field" disabled={published} min="1" onChange={(event) => change("weight_grams", Number(event.target.value) || undefined)} type="number" value={product.weight_grams ?? ""} /></label>
          <label><span className="field-label">Length (cm)</span><input className="field" disabled={published} min="0.1" step="0.1" onChange={(event) => change("length_cm", Number(event.target.value) || undefined)} type="number" value={product.length_cm ?? ""} /></label>
          <label><span className="field-label">Width (cm)</span><input className="field" disabled={published} min="0.1" step="0.1" onChange={(event) => change("width_cm", Number(event.target.value) || undefined)} type="number" value={product.width_cm ?? ""} /></label>
          <label><span className="field-label">Height (cm)</span><input className="field" disabled={published} min="0.1" step="0.1" onChange={(event) => change("height_cm", Number(event.target.value) || undefined)} type="number" value={product.height_cm ?? ""} /></label>
          <label><span className="field-label">Tags</span><input className="field" disabled={published} onChange={(event) => change("tags", splitList(event.target.value))} value={(product.tags ?? []).join(", ")} /></label>
          <label className="sm:col-span-2"><span className="field-label">Care instructions</span><textarea className="field min-h-20" disabled={published} maxLength={1000} onChange={(event) => change("care_instructions", event.target.value)} value={product.care_instructions ?? ""} /></label>

          {error && <p className="rounded-2xl bg-red-50 p-4 text-red-800 sm:col-span-2" role="alert">{error}</p>}
          {message && <p className="rounded-2xl bg-[#e8f3ec] p-4 text-[#20543d] sm:col-span-2" role="status">{message}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t border-[#eadbcf] pt-5 sm:col-span-2">
            {published ? (
              <Link className="primary-button" href={`/seller/products/${product.id}`}>View seller listing</Link>
            ) : (
              <>
                <button className="secondary-button" disabled={busy} onClick={() => void save()} type="button">{busy ? "Saving..." : "Save changes"}</button>
                <button className="primary-button" disabled={busy} onClick={() => void publish()} type="button">{busy ? "Publishing..." : "Save and publish"}</button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ProductReviewPage() {
  return (
    <Suspense fallback={<div className="app-shell"><section className="app-card p-6">Loading product review...</section></div>}>
      <ProductReviewContent />
    </Suspense>
  );
}
