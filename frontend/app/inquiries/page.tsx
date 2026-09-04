"use client";

import { useEffect, useState } from "react";
import { listInquiries, updateInquiryStatus } from "@/lib/services/inquiries";
import type { Inquiry, InquiryStatus } from "@/lib/types";

const statuses: InquiryStatus[] = ["new", "contacted", "closed"];

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listInquiries()
      .then(setInquiries)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load inquiries."))
      .finally(() => setLoading(false));
  }, []);

  async function changeStatus(id: string, status: InquiryStatus) {
    setBusyId(id);
    setError("");
    try {
      const updated = await updateInquiryStatus(id, status);
      setInquiries((current) => current.map((inquiry) => (inquiry.id === id ? { ...inquiry, status: updated.status } : inquiry)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update inquiry.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="app-shell">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#b84f28]">Inquiries</p>
        <h1 className="mt-2 text-4xl font-black">Buyer leads</h1>
        <p className="mt-2 text-[#6d5145]">Track buyer interest and update follow-up status.</p>
      </div>

      <section className="mt-6 grid gap-4">
        {loading && <article className="app-card p-6">Loading inquiries...</article>}
        {error && <article className="app-card p-6 text-red-800">{error}</article>}
        {!loading && !error && inquiries.length === 0 && (
          <article className="app-card p-10 text-center">
            <h2 className="text-2xl font-black">No inquiries found</h2>
            <p className="mt-2 text-[#6d5145]">Buyer messages will appear once customers ask about your products.</p>
          </article>
        )}
        {!loading && !error && inquiries.map((inquiry) => (
          <article className="app-card p-5" key={inquiry.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="pill bg-[#fff6ef] text-[#b84f28]">{inquiry.status}</span>
                <h2 className="mt-3 text-xl font-black">{inquiry.buyer_name}</h2>
                <p className="mt-1 text-sm font-semibold text-[#6d5145]">{inquiry.product_title}</p>
                <p className="mt-2 text-sm text-[#6d5145]">{inquiry.buyer_contact} · Quantity {inquiry.quantity}</p>
                <p className="mt-4 text-[#211814]">{inquiry.message}</p>
              </div>
              <label>
                <span className="field-label">Status</span>
                <select className="field w-44" disabled={busyId === inquiry.id} onChange={(event) => void changeStatus(inquiry.id, event.target.value as InquiryStatus)} value={inquiry.status}>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
