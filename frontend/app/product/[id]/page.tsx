"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { addToCart } from "@/lib/services/buyers";
import { getProduct } from "@/lib/services/products";
import type { Product } from "@/lib/types";

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [cartBusy, setCartBusy] = useState(false);

  useEffect(() => {
    getProduct(params.id)
      .then(setProduct)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load product."));
  }, [params.id]);

  async function handleAddToCart() {
    if (!product) return;
    setCartBusy(true);
    setCartMessage("");
    setError("");
    try {
      await addToCart(product, quantity);
      setCartMessage("Added to cart.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login as buyer before adding to cart.");
    } finally {
      setCartBusy(false);
    }
  }

  async function buyNow() {
    if (!product) return;
    setCartBusy(true);
    setError("");
    try {
      await addToCart(product, quantity);
      router.push("/buyer/cart");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login as buyer before buying.");
    } finally {
      setCartBusy(false);
    }
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest("/api/buyer/inquiries", {
        method: "POST",
        body: JSON.stringify({
          product_id: params.id,
          buyer_name: form.get("buyer_name"),
          buyer_contact: form.get("buyer_contact"),
          quantity,
          message: form.get("message"),
        }),
      });
      setSubmitted(true);
      event.currentTarget.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not submit inquiry.");
    }
  }

  if (error && !product) return <p className="app-shell text-red-800" role="alert">{error}</p>;
  if (!product) return <p className="app-shell">Loading product...</p>;

  const maxStock = product.available_stock ?? 20;

  return (
    <div className="app-shell">
      <Link className="text-sm font-bold text-[#b84f28]" href="/buyer/marketplace">Back to marketplace</Link>
      {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-red-800" role="alert">{error}</p>}
      <section className="mt-5 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="app-card overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={product.title} className="h-[430px] w-full object-cover" src={product.image_url} />
        </div>

        <div>
          <span className="pill bg-[#fff6ef] text-[#b84f28]">{product.category}</span>
          <h1 className="mt-4 text-4xl font-black">{product.title}</h1>
          <p className="mt-3 text-[#6d5145]">{product.description}</p>

          {product.local_description && product.local_description !== product.description && (
            <div className="warm-card mt-4 p-4">
              <p className="font-bold">Local craft story</p>
              <p className="mt-2 text-[#6d5145]">{product.local_description}</p>
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="app-card p-4">
              <p className="text-sm font-bold text-[#6d5145]">Price</p>
              <p className="mt-1 text-3xl font-black">INR {product.price_inr.toLocaleString("en-IN")}</p>
            </div>
            <div className="app-card p-4">
              <p className="text-sm font-bold text-[#6d5145]">Seller</p>
              <p className="mt-1 text-xl font-black">{product.artisan_name}</p>
              <p className="mt-1 text-sm text-[#6d5145]">{product.artisan_location ?? "Artisan cluster"}</p>
            </div>
          </div>

          <div className="app-card mt-5 p-5">
            <div className="grid gap-4 sm:grid-cols-[140px_1fr] sm:items-end">
              <label>
                <span className="field-label">Quantity</span>
                <input className="field" max={maxStock} min="1" onChange={(event) => setQuantity(Number(event.target.value))} type="number" value={quantity} />
              </label>
              <div className="flex flex-wrap gap-3">
                <button className="secondary-button" disabled={cartBusy} onClick={() => void handleAddToCart()} type="button">Add to cart</button>
                <button className="primary-button bg-[#2d6a4f]" disabled={cartBusy} onClick={() => void buyNow()} type="button">Buy now</button>
              </div>
            </div>
            {cartMessage && <p className="mt-3 text-sm font-bold text-[#2d6a4f]">{cartMessage}</p>}
          </div>

          <div className="mt-5 grid gap-2 text-sm text-[#6d5145] sm:grid-cols-2">
            <p>Material: {(product.materials ?? []).join(", ")}</p>
            <p>Technique: {product.craft_technique ?? "Handmade"}</p>
            <p>Stock: {maxStock} pieces available</p>
            <p>AI provider: {product.ai_provider ?? "not recorded"}</p>
          </div>
        </div>
      </section>

      <form className="app-card mt-8 grid gap-4 p-6" onSubmit={submitInquiry}>
        <div>
          <h2 className="text-2xl font-black">Ask seller before buying</h2>
          <p className="mt-1 text-sm text-[#6d5145]">For bulk order, customization, or delivery questions.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="field" name="buyer_name" placeholder="Buyer name" required />
          <input className="field" name="buyer_contact" placeholder="Email or phone" required />
        </div>
        <textarea className="field min-h-24" name="message" placeholder="Example: Can you make 20 pieces for a hotel order?" required />
        {submitted && <p className="font-bold text-[#2d6a4f]" role="status">Inquiry sent to seller.</p>}
        <button className="secondary-button w-fit" type="submit">Send inquiry</button>
      </form>
    </div>
  );
}
