import { NextResponse } from 'next/server';

export function mobileSuccess<T>(
  data: T,
  options?: {
    message?: string;
    status?: number;
    meta?: Record<string, unknown>;
  },
) {
  return NextResponse.json(
    {
      success: true,
      message: options?.message ?? null,
      data,
      meta: options?.meta ?? null,
    },
    { status: options?.status ?? 200 },
  );
}

export function mobileError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details: details ?? null,
      },
    },
    { status },
  );
}
