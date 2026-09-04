"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCart, getCurrentBuyer, placeOrder } from "@/lib/services/buyers";
import type { BuyerProfile, CartItem, Order } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const [buyer, setBuyer] = useState<BuyerProfile | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [paymentMode, setPaymentMode] = useState<Order["payment_mode"]>("cod");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([getCurrentBuyer(), getCart()])
      .then(([buyerProfile, cart]) => {
        setBuyer(buyerProfile);
        setItems(cart.items);
        setTotal(cart.total_inr);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load checkout."))
  }, []);

  async function submitOrder() {
    if (!buyer) {
      router.push("/buyer/register");
      return;
    }
    if (items.length === 0) {
      router.push("/buyer/marketplace");
      return;
    }
    setBusy(true);
    try {
      await placeOrder({ buyer, items, payment_mode: paymentMode });
      router.push("/buyer/orders");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not place order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2d6a4f]">Checkout</p>
        <h1 className="mt-2 text-4xl font-black">Place order</h1>
        <p className="mt-2 text-[#6d5145]">Orders are saved through the backend and linked to your buyer profile.</p>
      </div>
      {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          {!buyer ? (
            <div className="app-card p-6">
              <h2 className="text-xl font-black">Buyer details required</h2>
              <p className="mt-2 text-[#6d5145]">Add customer delivery details before checkout.</p>
              <Link className="primary-button mt-5 inline-flex bg-[#2d6a4f]" href="/buyer/register">Add buyer details</Link>
            </div>
          ) : (
            <div className="app-card p-6">
              <h2 className="text-xl font-black">Deliver to</h2>
              <p className="mt-3 font-bold">{buyer.buyer_name}</p>
              <p className="text-[#6d5145]">{buyer.phone}</p>
              <p className="text-[#6d5145]">{buyer.delivery_address}</p>
            </div>
          )}

          <div className="app-card p-6">
            <h2 className="text-xl font-black">Payment mode</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(["upi", "cod"] as const).map((mode) => (
                <button
                  className={`rounded-2xl border p-4 text-left font-bold ${paymentMode === mode ? "border-[#2d6a4f] bg-[#e8f3ec]" : "border-[#eadbcf] bg-white"}`}
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  type="button"
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="app-card h-fit p-5">
          <h2 className="text-2xl font-black">Items</h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div className="flex justify-between gap-4 text-sm" key={item.product_id}>
                <span>{item.product_title ?? "Product"} x {item.quantity}</span>
                <strong>INR {(item.line_total_inr ?? 0).toLocaleString("en-IN")}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-[#eadbcf] pt-4">
            <p className="text-sm text-[#6d5145]">Total</p>
            <p className="text-3xl font-black">INR {total.toLocaleString("en-IN")}</p>
          </div>
          <button className="primary-button mt-5 w-full bg-[#2d6a4f]" disabled={busy} onClick={submitOrder} type="button">
            {busy ? "Placing..." : "Place order"}
          </button>
        </aside>
      </section>
    </div>
  );
}
