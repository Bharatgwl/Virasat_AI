import { listInquiries } from "@/lib/services/inquiries";
import { listProducts } from "@/lib/services/products";
import { getCurrentArtisan } from "@/lib/services/artisans";
import type { DashboardSummary } from "@/lib/types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [artisan, products, inquiries] = await Promise.all([
    getCurrentArtisan(),
    listProducts(),
    listInquiries(),
  ]);
  return {
    artisan,
    metrics: {
      total_earnings: 0,
      live_products: products.filter((product) => product.status === "published").length,
      inquiries_count: inquiries.length,
      active_orders: 0,
    },
    recent_products: products.slice(0, 3),
    recent_inquiries: inquiries.slice(0, 3),
  };
}
