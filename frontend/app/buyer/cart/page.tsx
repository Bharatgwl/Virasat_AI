"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCart, removeCartItem, updateCartItem } from "@/lib/services/buyers";
import type { CartItem } from "@/lib/types";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCart()
      .then((cart) => {
        setItems(cart.items);
        setTotal(cart.total_inr);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load cart."))
      .finally(() => setLoading(false));
  }, []);

  async function updateQuantity(productId: string, quantity: number) {
    const cart = await updateCartItem(productId, Math.max(1, quantity));
    setItems(cart.items);
    setTotal(cart.total_inr);
  }

  async function removeItem(productId: string) {
    const cart = await removeCartItem(productId);
    setItems(cart.items);
    setTotal(cart.total_inr);
  }

  return (
    <div className="app-shell">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2d6a4f]">Buyer cart</p>
          <h1 className="mt-2 text-4xl font-black">Your cart</h1>
        </div>
        <Link className="secondary-button" href="/buyer/marketplace">Continue shopping</Link>
      </div>

      {loading ? (
        <section className="app-card mt-6 p-10 text-center">Loading cart...</section>
      ) : error ? (
        <section className="app-card mt-6 p-10 text-center text-red-800">{error}</section>
      ) : items.length === 0 ? (
        <section className="app-card mt-6 p-10 text-center">
          <h2 className="text-2xl font-black">Cart is empty</h2>
          <p className="mt-2 text-[#6d5145]">Browse artisan products and add something handmade.</p>
          <Link className="primary-button mt-5 inline-flex bg-[#2d6a4f]" href="/buyer/marketplace">Open marketplace</Link>
        </section>
      ) : (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-4">
            {items.map((item) => (
              <article className="app-card flex flex-col gap-4 p-4 sm:flex-row" key={item.product_id}>
                <div className="grid h-28 w-full place-items-center rounded-2xl bg-[#f4e9df] text-sm font-bold text-[#7a5b4d] sm:w-32">
                  Product
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black">{item.product_title ?? "Product"}</h2>
                  <p className="mt-2 font-black">INR {(item.unit_price_inr ?? 0).toLocaleString("en-IN")}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input className="field w-28" min="1" onChange={(event) => void updateQuantity(item.product_id, Number(event.target.value))} type="number" value={item.quantity} />
                    <button className="text-sm font-bold text-red-700" onClick={() => void removeItem(item.product_id)} type="button">Remove</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="app-card h-fit p-5">
            <h2 className="text-2xl font-black">Order summary</h2>
            <p className="mt-4 text-sm text-[#6d5145]">Items: {items.length}</p>
            <p className="mt-2 text-3xl font-black">INR {total.toLocaleString("en-IN")}</p>
            <Link className="primary-button mt-5 flex justify-center bg-[#2d6a4f]" href="/buyer/checkout">Proceed to checkout</Link>
          </aside>
        </section>
      )}
    </div>
  );
}
