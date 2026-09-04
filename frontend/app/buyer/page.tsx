import Link from "next/link";

export default function BuyerHomePage() {
  return (
    <div className="app-shell">
      <section className="warm-card mx-auto max-w-3xl p-8 text-center">
        <span className="pill bg-white text-[#2d6a4f]">Customer side</span>
        <h1 className="mt-4 text-4xl font-black">Buyer experience</h1>
        <p className="mx-auto mt-3 max-w-xl text-[#6d5145]">
          Browse products, manage cart, checkout, and view orders.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="primary-button bg-[#2d6a4f]" href="/buyer/marketplace">Open marketplace</Link>
          <Link className="secondary-button" href="/buyer/profile">Buyer profile</Link>
          <Link className="secondary-button" href="/buyer/cart">View cart</Link>
          <Link className="secondary-button" href="/buyer/orders">View orders</Link>
        </div>
      </section>
    </div>
  );
}
