const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

function apiUrl(path: string) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

const sessionTokenKey = "viraasat_auth_token";

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
  detail?: string;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(sessionTokenKey);
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    const retryAfter = Number.parseInt(response.headers.get("Retry-After") ?? "", 10);
    throw new ApiRequestError(
      body.error?.message ??
        body.detail ??
        "The request could not be completed.",
      response.status,
      body.error?.code,
      Number.isFinite(retryAfter) ? retryAfter : undefined,
    );
  }

  return (await response.json()) as T;
}

export function getSessionToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(sessionTokenKey);
}

export function setSessionToken(token: string) {
  window.localStorage.setItem(sessionTokenKey, token);
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(sessionTokenKey);
}

export async function uploadFile(
  kind: "image" | "audio",
  file: File,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<{ url: string }>(`/api/seller/uploads/${kind}`, {
    method: "POST",
    body: form,
  });
}
