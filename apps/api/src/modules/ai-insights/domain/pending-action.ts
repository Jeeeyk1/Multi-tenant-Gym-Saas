import type { AssistantAction } from '../../../common/enums';

/** How long a proposed action waits for the user's confirmation. */
export const PENDING_ACTION_TTL_SECONDS = 10 * 60;

/** An action the assistant proposed. It runs only when the same person confirms it in the app. */
export interface PendingAction {
  id: string;
  gymId: string;
  userId: string;
  action: AssistantAction;
  /** Validated input for the action, in the use case's own shape. */
  input: Record<string, unknown>;
  /** What will happen, in plain words, e.g. "Suspend Juan Cruz (MBR-0001)". */
  summary: string;
  /** The confirm button's text, e.g. "Suspend". */
  confirmLabel: string;
  /** Shown after it ran, e.g. "Suspended Juan Cruz." */
  doneMessage: string;
  expiresAt: string;
}

/** What the chat shows for a proposed action (no input or owner ids). */
export interface PendingActionView {
  id: string;
  action: AssistantAction;
  summary: string;
  confirmLabel: string;
  expiresAt: string;
}

export function toPendingActionView(pending: PendingAction): PendingActionView {
  const { id, action, summary, confirmLabel, expiresAt } = pending;
  return { id, action, summary, confirmLabel, expiresAt };
}
