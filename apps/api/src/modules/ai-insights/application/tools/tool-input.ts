import type { AuthenticatedUser } from '../../../../common/types/auth.types';

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolContext {
  gymId: string;
  caller: AuthenticatedUser;
}

// Tool inputs come from the model, so every field is checked. Errors are fed back to the model.

/** A problem with what the model sent. Its message is safe to show the model; other errors are not. */
export class ToolInputError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ToolInputError(`"${field}" is required`);
  }
  return value;
}

/** An id from another tool's result. `hint` says where to get it, e.g. "Use find_member to get the member_id." */
export function requireUuid(value: unknown, field: string, hint: string): string {
  const id = requireString(value, field).trim();
  if (!UUID_RE.test(id)) throw new ToolInputError(`"${field}" is not a valid id. ${hint}`);
  return id;
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function requireNumber(value: unknown, field: string): number {
  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num !== 'number' || !Number.isFinite(num)) {
    throw new ToolInputError(`"${field}" must be a number`);
  }
  return num;
}
