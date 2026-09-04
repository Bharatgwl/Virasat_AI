import { apiRequest } from "@/lib/api-client";
import type { Inquiry, InquiryStatus } from "@/lib/types";

export async function listInquiries(): Promise<Inquiry[]> {
  return apiRequest<Inquiry[]>("/api/seller/inquiries");
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<Inquiry> {
  return apiRequest<Inquiry>(`/api/seller/inquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
