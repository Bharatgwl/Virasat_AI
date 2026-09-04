"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listMarketplaceProducts } from "@/lib/services/products";
import type { Product } from "@/lib/types";

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listMarketplaceProducts()
      .then(setProducts)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load marketplace."))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const visibleProducts = products.filter((product) => {
    const term = search.trim().toLowerCase();
    const matchesCategory = category === "all" || product.category === category;
    const matchesSearch = !term || product.title.toLowerCase().includes(term) || product.artisan_name.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="app-shell">
      <section className="warm-card p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <span className="pill bg-white text-[#2d6a4f]">Buyer marketplace</span>
            <h1 className="mt-4 text-4xl font-black">Shop handmade products from Indian artisans</h1>
            <p className="mt-3 max-w-2xl text-[#6d5145]">
              Browse published artisan products, add items to cart, place an order, or send an inquiry to the seller.
            </p>
          </div>
          <div className="flex gap-3 lg:justify-end">
            <Link className="secondary-button" href="/buyer/orders">Orders</Link>
            <Link className="primary-button bg-[#2d6a4f]" href="/buyer/cart">Cart</Link>
          </div>
        </div>
      </section>

      <div className="app-card mt-6 grid gap-4 p-4 md:grid-cols-[1fr_220px]">
        <input className="field" onChange={(event) => setSearch(event.target.value)} placeholder="Search craft, artisan, or category" value={search} />
        <select className="field" onChange={(event) => setCategory(event.target.value)} value={category}>
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {loading && <p className="app-card mt-6 p-6">Loading buyer marketplace...</p>}
      {!loading && error && <p className="app-card mt-6 p-6 text-red-800">{error}</p>}
      {!loading && !error && visibleProducts.length === 0 && (
        <div className="app-card mt-6 p-10 text-center">
          <p className="font-bold">No products available yet.</p>
          <p className="mt-2 text-[#6d5145]">Published artisan products will appear here once sellers add them.</p>
        </div>
      )}

      <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {!error && visibleProducts.map((product) => (
          <article className="app-card overflow-hidden" key={product.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={product.title} className="h-56 w-full object-cover" src={product.image_url} />
            <div className="p-5">
              <p className="text-sm font-bold text-[#b84f28]">{product.category}</p>
              <h2 className="mt-1 text-xl font-black">{product.title}</h2>
              <p className="mt-2 text-sm text-[#6d5145]">By {product.artisan_name}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xl font-black">INR {product.price_inr.toLocaleString("en-IN")}</p>
                <span className="pill bg-[#e8f3ec] text-[#2d6a4f]">Stock {product.available_stock ?? 1}</span>
              </div>
              <Link className="primary-button mt-5 inline-flex w-full justify-center bg-[#2d6a4f]" href={`/buyer/products/${product.id}`}>
                View and buy
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
