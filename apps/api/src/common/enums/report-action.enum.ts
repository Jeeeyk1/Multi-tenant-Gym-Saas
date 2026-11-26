/** What a moderator does with a reported message. */
export enum ReportAction {
  /** Keep the message and close its reports. */
  DISMISS = 'dismiss',
  /** Remove the message and close its reports. */
  REMOVE  = 'remove',
}
