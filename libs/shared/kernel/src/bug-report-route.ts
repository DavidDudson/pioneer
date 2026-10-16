/** The Report a bug page: reachable from the account menu and from a character sheet. */
export const BUG_REPORT_PATH = '/account/report-bug';

/** Query parameters a sheet adds so the report is about the character on screen. */
export const BugReportParam = {
  /** The character's id, kept on the report. */
  Character: 'character',
  /** The character's name, shown before submit so the reporter sees what is attached. */
  CharacterName: 'name',
} as const;
