"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listProducts } from "@/lib/services/products";
import type { Product, ProductStatus } from "@/lib/types";

const statuses: ("all" | ProductStatus)[] = ["all", "draft", "generated", "ready", "published"];

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"all" | ProductStatus>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load catalog."))
      .finally(() => setLoading(false));
  }, []);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesStatus = status === "all" || product.status === status;
      const term = search.trim().toLowerCase();
      const matchesSearch = !term || product.title.toLowerCase().includes(term) || product.category.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [products, search, status]);

  return (
    <div className="app-shell">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#b84f28]">Catalog</p>
          <h1 className="mt-2 text-4xl font-black">Manage craft listings</h1>
        </div>
        {products.length > 0 && <Link className="primary-button" href="/seller/products/new">Add new craft</Link>}
      </div>

      <div className="app-card mt-6 grid gap-4 p-4 md:grid-cols-[1fr_auto]">
        <input className="field" onChange={(event) => setSearch(event.target.value)} placeholder="Search products or category" value={search} />
        <select className="field md:w-48" onChange={(event) => setStatus(event.target.value as "all" | ProductStatus)} value={status}>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {loading && <section className="app-card mt-6 p-6">Loading catalog...</section>}
      {!loading && error && <section className="app-card mt-6 p-6 text-red-800">{error}</section>}
      {!loading && !error && visibleProducts.length === 0 && (
        <section className="app-card mt-6 p-10 text-center">
          <h2 className="text-2xl font-black">No products available yet</h2>
          <p className="mt-2 text-[#6d5145]">Your real products will appear here after they are saved through the backend.</p>
          <Link className="primary-button mt-5 inline-flex" href="/seller/products/new">Add your first craft</Link>
        </section>
      )}

      <section className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {!loading && !error && visibleProducts.map((product) => (
          <article className="app-card overflow-hidden" key={product.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={product.title} className="h-56 w-full object-cover" src={product.image_url} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-black">{product.title}</h2>
                <span className="pill bg-[#f4e9df] text-[#7a351d]">{product.status}</span>
              </div>
              <p className="mt-2 text-sm text-[#6d5145]">{product.category}</p>
              <p className="mt-3 text-xl font-black">INR {product.price_inr.toLocaleString("en-IN")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {product.status === "published" && <Link className="secondary-button min-h-0 px-3 py-2 text-sm" href={`/seller/products/${product.id}`}>View listing</Link>}
                {product.status !== "published" && <Link className="secondary-button min-h-0 px-3 py-2 text-sm" href={`/seller/products/review?id=${product.id}`}>Review</Link>}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
