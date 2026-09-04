import { apiRequest, clearSessionToken, setSessionToken } from "@/lib/api-client";
import type { Account, AccountRole } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const sessionKey = "viraasat_active_account";
let refreshRequest: Promise<Account | null> | null = null;

export type AccountSignupInput = {
  role: AccountRole;
  display_name: string;
  phone: string;
  email?: string;
  password: string;
  confirm_password: string;
};

export type AccountLoginInput = {
  role: AccountRole;
  identifier: string;
  password: string;
};

type AccountSession = {
  account: Account;
  token_type: "app" | "supabase";
  access_token: string;
};

export function validateAccountSignup(input: AccountSignupInput) {
  const errors: Record<string, string> = {};
  if (input.display_name.trim().length < 2) errors.display_name = "Enter a name.";
  if (!/^[6-9]\d{9}$/.test(input.phone.trim())) errors.phone = "Enter a valid 10 digit Indian mobile number.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.email = "Enter a valid email.";
  if (input.password.length < 6) errors.password = "Password must be at least 6 characters.";
  if (input.password !== input.confirm_password) errors.confirm_password = "Passwords do not match.";
  return errors;
}

export function validateAccountLogin(input: AccountLoginInput) {
  const errors: Record<string, string> = {};
  if (input.identifier.trim().length < 4) errors.identifier = "Enter phone or email.";
  if (input.password.length < 6) errors.password = "Enter password.";
  return errors;
}

export function getActiveAccount(): Account | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(sessionKey);
  if (!value) return null;
  try {
    return JSON.parse(value) as Account;
  } catch {
    return null;
  }
}

export function setActiveAccount(account: Account) {
  window.localStorage.setItem(sessionKey, JSON.stringify(account));
}

export function clearAccountSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(sessionKey);
    window.localStorage.removeItem("viraasat_artisan_profile");
    window.localStorage.removeItem("viraasat_buyer_profile");
  }
  clearSessionToken();
}

function saveSession(session: AccountSession) {
  const previous = getActiveAccount();
  if (typeof window !== "undefined" && previous?.id !== session.account.id) {
    window.localStorage.removeItem("viraasat_artisan_profile");
    window.localStorage.removeItem("viraasat_buyer_profile");
  }
  setActiveAccount(session.account);
  setSessionToken(session.access_token);
  return session.account;
}

export async function signupAccount(input: AccountSignupInput): Promise<Account> {
  const session = await apiRequest<AccountSession>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      role: input.role,
      display_name: input.display_name,
      phone: input.phone,
      email: input.email,
      password: input.password,
    }),
  });
  return saveSession(session);
}

export async function loginAccount(input: AccountLoginInput): Promise<Account> {
  const session = await apiRequest<AccountSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return saveSession(session);
}

export async function loginWithGoogleAccessToken(role: AccountRole, accessToken: string): Promise<Account> {
  const session = await apiRequest<AccountSession>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ role, access_token: accessToken }),
  });
  return saveSession(session);
}

export function refreshAccount(): Promise<Account | null> {
  if (refreshRequest) return refreshRequest;

  refreshRequest = apiRequest<{ account: Account | null }>("/api/auth/me")
    .then((response) => {
      if (response.account) {
        setActiveAccount(response.account);
      } else {
        clearAccountSession();
      }
      return response.account;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

export async function logoutAccount() {
  await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  await getSupabaseBrowserClient()?.auth.signOut().catch(() => undefined);
  clearAccountSession();
}
