import { NextResponse } from "next/server";

export type ApiErrorCode = "BAD_REQUEST" | "SERVICE_UNAVAILABLE" | "INTERNAL_ERROR";

export function apiSuccess<T>(data: T, meta: Record<string, unknown> = {}, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(
    { success: true, data, meta },
    {
      ...init,
      headers,
    },
  );
}

export function apiError(code: ApiErrorCode, message: string, status: number, details?: Record<string, string>) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      meta: { generatedAt: new Date().toISOString() },
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
