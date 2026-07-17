/**
 * Formats a caught API error for display (toast, inline error text).
 * Appends a short reference from the server's request-id when present, so a user
 * can quote it and support can grep it server-side — see
 * docs/03-engineering/logging-and-observability.md.
 */
export function formatApiError(err: unknown, fallback: string): string {
  const e = err as { message?: string; requestId?: string } | null | undefined;
  const message = e?.message?.trim() || fallback;
  const requestId = e?.requestId;
  return requestId ? `${message} (Ref: ${requestId.slice(0, 8)})` : message;
}
