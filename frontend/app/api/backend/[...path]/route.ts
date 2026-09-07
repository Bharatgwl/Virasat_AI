import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "viraasat_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const API_BASE_URL = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000"
).replace(/\/+$/, "");
const AUTH_SESSION_PATHS = new Set(["auth/signup", "auth/login", "auth/google"]);

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const backendPath = path.join("/");
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) headers.set("authorization", `Bearer ${sessionToken}`);

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/${backendPath}${request.nextUrl.search}`, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(115_000),
    });
  } catch {
    return NextResponse.json(
      { error: { code: "BACKEND_UNAVAILABLE", message: "The application service is temporarily unavailable.", retryable: true } },
      { status: 503 },
    );
  }

  const responseHeaders = new Headers();
  const responseType = upstream.headers.get("content-type");
  const retryAfter = upstream.headers.get("retry-after");
  if (responseType) responseHeaders.set("content-type", responseType);
  if (retryAfter) responseHeaders.set("retry-after", retryAfter);

  if (upstream.ok && AUTH_SESSION_PATHS.has(backendPath)) {
    const payload = await upstream.json() as { access_token?: string; [key: string]: unknown };
    const accessToken = payload.access_token;
    delete payload.access_token;
    const response = NextResponse.json(payload, { status: upstream.status, headers: responseHeaders });
    if (accessToken) {
      response.cookies.set(SESSION_COOKIE, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_SECONDS,
        path: "/",
        priority: "high",
      });
    }
    return response;
  }

  const response = new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
  if (backendPath === "auth/logout" && upstream.ok) {
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });
  }
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
