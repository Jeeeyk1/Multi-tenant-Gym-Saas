/** The AI assistant's tools that change data. Each needs the user to confirm in the app before it runs. */
export enum AssistantAction {
  REGISTER_MEMBER   = 'register_member',
  RENEW_MEMBERSHIP  = 'renew_membership',
  SUSPEND_MEMBER    = 'suspend_member',
  REACTIVATE_MEMBER = 'reactivate_member',
}
