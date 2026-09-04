"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getManagedProduct } from "@/lib/services/products";
import type { Product } from "@/lib/types";

export default function SellerProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getManagedProduct(params.id)
      .then(setProduct)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load this seller listing."));
  }, [params.id]);

  if (error) {
    return (
      <div className="app-shell">
        <section className="app-card p-8 text-center">
          <h1 className="text-2xl font-black">Seller listing unavailable</h1>
          <p className="mt-2 text-red-800">{error}</p>
          <Link className="secondary-button mt-5 inline-flex" href="/seller/catalog">Return to seller catalog</Link>
        </section>
      </div>
    );
  }

  if (!product) return <div className="app-shell"><section className="app-card p-6">Loading your listing...</section></div>;

  return (
    <div className="app-shell">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-bold text-[#b84f28]" href="/seller/catalog">Back to seller catalog</Link>
        <span className="pill bg-[#f4e9df] text-[#7a351d]">Seller view · {product.status}</span>
      </div>
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={product.title} className="app-card h-full max-h-[620px] w-full object-cover" src={product.image_url} />
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#b84f28]">Your craft listing</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">{product.title}</h1>
          <p className="mt-4 leading-7 text-[#6d5145]">{product.description}</p>
          <div className="app-card mt-6 grid gap-4 p-5 sm:grid-cols-2">
            <div><p className="text-sm text-[#7a5b4d]">Price</p><p className="mt-1 text-2xl font-black">INR {product.price_inr.toLocaleString("en-IN")}</p></div>
            <div><p className="text-sm text-[#7a5b4d]">Available stock</p><p className="mt-1 text-2xl font-black">{product.available_stock ?? 0}</p></div>
            <div><p className="text-sm text-[#7a5b4d]">Category</p><p className="mt-1 font-bold">{product.category}</p></div>
            <div><p className="text-sm text-[#7a5b4d]">Technique</p><p className="mt-1 font-bold">{product.craft_technique || "Not provided"}</p></div>
          </div>
          <p className="mt-5 rounded-xl bg-[#f5eee8] p-4 text-sm text-[#6d5145]">
            This seller-only page shows listing information. Shopping, cart, checkout, and buyer navigation are intentionally unavailable here.
          </p>
        </div>
      </section>
    </div>
  );
}
