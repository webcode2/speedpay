import type { ApiErrorCode, ApiResponse } from "@solar/types";

export function apiSuccess<T>(data: T, init?: ResponseInit): Response {
  const body: ApiResponse<T> = { success: true, data };
  return Response.json(body, { status: 200, ...init });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = 500,
  init?: ResponseInit,
): Response {
  const body: ApiResponse<never> = {
    success: false,
    error: { code, message },
  };
  return Response.json(body, { status, ...init });
}
