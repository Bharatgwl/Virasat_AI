"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDashboardSummary } from "@/lib/services/dashboard";
import type { DashboardSummary } from "@/lib/types";

function money(value: number) {
  return "INR " + value.toLocaleString("en-IN");
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load dashboard."));
  }, []);

  if (!summary && error) {
    return (
      <div className="app-shell">
        <section className="app-card p-6 text-red-800">
          <h1 className="text-2xl font-black">Dashboard unavailable</h1>
          <p className="mt-2">{error}</p>
        </section>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="app-shell">
        <p className="app-card p-6">Loading artisan dashboard...</p>
      </div>
    );
  }

  const metrics = [
    ["Total earnings", money(summary.metrics.total_earnings), "Market estimate"],
    ["Live products", String(summary.metrics.live_products), "Published listings"],
    ["ONDC inquiries", String(summary.metrics.inquiries_count), "Buyer interest"],
    ["Active orders", String(summary.metrics.active_orders), "Confirmed orders"],
  ];

  return (
    <div className="app-shell">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f4e9df] text-xl font-black text-[#b84f28]">
            {summary.artisan.artisan_name.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-bold text-[#2d6a4f]">Seller workspace</p>
            <h1 className="text-3xl font-black">Namaste, {summary.artisan.artisan_name.split(" ")[0]}</h1>
            <p className="text-sm font-semibold text-[#7a5b4d]">{summary.artisan.location} · {summary.artisan.craft_type}</p>
          </div>
        </div>
        <span className="pill bg-[#e8f3ec] text-[#2d6a4f]">Language: {summary.artisan.preferred_language.toUpperCase()}</span>
      </div>

      {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}

      <section className="warm-card mt-6 overflow-hidden p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_260px] lg:items-center">
          <div>
            <span className="pill bg-white text-[#b84f28]">AI catalog studio</span>
            <h2 className="mt-4 text-4xl font-black">Digitize your craft with photo and voice</h2>
            <p className="mt-3 max-w-2xl text-[#6d5145]">
              Upload a product image, record artisan voice, and review AI auto-filled listing details in an editable popup.
            </p>
          </div>
          <Link className="primary-button text-center" href="/seller/products/new">
            Add Craft
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value, helper]) => (
          <article className="app-card p-5" key={label}>
            <p className="text-sm font-bold text-[#6d5145]">{label}</p>
            <p className="mt-3 text-3xl font-black text-[#211814]">{value}</p>
            <p className="mt-2 text-xs font-semibold text-[#2d6a4f]">{helper}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="app-card p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black">Recent products</h2>
            <Link className="text-sm font-bold text-[#b84f28]" href="/seller/catalog">View all</Link>
          </div>
          <div className="mt-4 space-y-3">
            {summary.recent_products.map((product) => (
              <article className="flex gap-3 rounded-2xl bg-[#fcf9f6] p-3" key={product.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={product.title} className="h-20 w-20 rounded-xl object-cover" src={product.image_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{product.title}</p>
                  <p className="mt-1 text-sm text-[#6d5145]">{product.category}</p>
                  <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-xs font-bold text-[#7a5b4d]">{product.status}</span>
                </div>
              </article>
            ))}
            {summary.recent_products.length === 0 && (
              <p className="rounded-2xl bg-[#fcf9f6] p-4 text-sm text-[#6d5145]">No products available yet.</p>
            )}
          </div>
        </div>

        <div className="app-card p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black">Buyer inquiries</h2>
            <Link className="text-sm font-bold text-[#b84f28]" href="/seller/inquiries">Open leads</Link>
          </div>
          <div className="mt-4 space-y-3">
            {summary.recent_inquiries.map((inquiry) => (
              <article className="rounded-2xl bg-[#fcf9f6] p-4" key={inquiry.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{inquiry.buyer_name}</p>
                    <p className="mt-1 text-sm text-[#6d5145]">{inquiry.product_title}</p>
                  </div>
                  <span className="pill bg-white text-[#b84f28]">{inquiry.status}</span>
                </div>
                <p className="mt-3 text-sm text-[#6d5145]">{inquiry.message}</p>
              </article>
            ))}
            {summary.recent_inquiries.length === 0 && (
              <p className="rounded-2xl bg-[#fcf9f6] p-4 text-sm text-[#6d5145]">No inquiries found.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
