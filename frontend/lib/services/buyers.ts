import { apiRequest } from "@/lib/api-client";
import { getActiveAccount } from "@/lib/services/accounts";
import type { BuyerProfile, Cart, CartItem, Order, Product } from "@/lib/types";

const buyerKey = "viraasat_buyer_profile";

export type BuyerRegistrationInput = {
  account_id?: string;
  buyer_name: string;
  phone: string;
  email?: string;
  delivery_address: string;
  preferred_language: BuyerProfile["preferred_language"];
};

export function validateBuyer(input: BuyerRegistrationInput) {
  const errors: Record<string, string> = {};
  if (input.buyer_name.trim().length < 2) errors.buyer_name = "Enter buyer name.";
  if (!/^[6-9]\d{9}$/.test(input.phone.trim())) errors.phone = "Enter a valid 10 digit Indian mobile number.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.email = "Enter a valid email.";
  if (input.delivery_address.trim().length < 5) errors.delivery_address = "Enter delivery city or address.";
  return errors;
}

export function getStoredBuyer(): BuyerProfile | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(buyerKey);
  if (!value) return null;
  try {
    return JSON.parse(value) as BuyerProfile;
  } catch {
    return null;
  }
}

export function setStoredBuyer(buyer: BuyerProfile) {
  window.localStorage.setItem(buyerKey, JSON.stringify(buyer));
}

export function clearStoredBuyer() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(buyerKey);
}

export async function createBuyer(input: BuyerRegistrationInput): Promise<BuyerProfile> {
  const buyer = await apiRequest<BuyerProfile>("/api/buyer/profile", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setStoredBuyer(buyer);
  return buyer;
}

export async function getCurrentBuyer(forceRefresh = false): Promise<BuyerProfile> {
  const account = getActiveAccount();
  if (!account || account.role !== "buyer") {
    throw new Error("Buyer login is required.");
  }
  const stored = getStoredBuyer();
  if (!forceRefresh && stored?.account_id === account.id) return stored;
  if (stored) clearStoredBuyer();

  const buyer = await apiRequest<BuyerProfile>("/api/buyer/profile");
  setStoredBuyer(buyer);
  return buyer;
}

export async function getCart(): Promise<Cart> {
  await getCurrentBuyer();
  return apiRequest<Cart>("/api/buyer/cart");
}

export async function updateCartItem(productId: string, quantity: number): Promise<Cart> {
  await getCurrentBuyer();
  return apiRequest<Cart>(`/api/buyer/cart/items/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function removeCartItem(productId: string): Promise<Cart> {
  await getCurrentBuyer();
  return apiRequest<Cart>(`/api/buyer/cart/items/${productId}`, {
    method: "DELETE",
  });
}

export async function addToCart(product: Product, quantity: number) {
  await getCurrentBuyer();
  const cart = await apiRequest<Cart>("/api/buyer/cart/items", {
    method: "POST",
    body: JSON.stringify({ product_id: product.id, quantity }),
  });
  return cart;
}

export async function getOrders(): Promise<Order[]> {
  await getCurrentBuyer();
  return apiRequest<Order[]>("/api/buyer/orders");
}

export async function placeOrder(input: {
  buyer: BuyerProfile;
  items: CartItem[];
  payment_mode: Order["payment_mode"];
}): Promise<Order> {
  return apiRequest<Order>("/api/buyer/orders", {
    method: "POST",
    body: JSON.stringify({
      buyer_id: input.buyer.id,
      items: input.items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
      payment_mode: input.payment_mode,
      delivery_address: input.buyer.delivery_address,
    }),
  });
}
