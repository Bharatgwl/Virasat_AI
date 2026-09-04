"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOrders } from "@/lib/services/buyers";
import type { Order } from "@/lib/types";

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load orders."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-shell">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2d6a4f]">Buyer orders</p>
          <h1 className="mt-2 text-4xl font-black">Your orders</h1>
          <p className="mt-2 text-[#6d5145]">Track orders placed from your buyer account.</p>
        </div>
        <Link className="secondary-button" href="/buyer/marketplace">Shop more</Link>
      </div>

      <section className="mt-6 grid gap-4">
        {loading && <article className="app-card p-6">Loading orders...</article>}
        {error && <article className="app-card p-6 text-red-800">{error}</article>}
        {!loading && !error && orders.length === 0 && (
          <article className="app-card p-10 text-center">
            <h2 className="text-2xl font-black">No orders found</h2>
            <p className="mt-2 text-[#6d5145]">Your orders will appear here after checkout.</p>
          </article>
        )}
        {!loading && !error && orders.map((order) => (
          <article className="app-card p-5" key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="pill bg-[#e8f3ec] text-[#2d6a4f]">{order.status}</span>
                <h2 className="mt-3 text-xl font-black">Order {order.id}</h2>
                <p className="mt-1 text-sm text-[#6d5145]">Deliver to {order.delivery_address}</p>
              </div>
              <p className="text-2xl font-black">INR {order.total_inr.toLocaleString("en-IN")}</p>
            </div>
            <div className="mt-4 grid gap-3">
              {order.items.map((item) => (
                <div className="rounded-2xl bg-[#fcf9f6] p-4" key={item.product_id}>
                  <p className="font-bold">{item.product_title ?? "Product"}</p>
                  <p className="mt-1 text-sm text-[#6d5145]">Quantity {item.quantity}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
