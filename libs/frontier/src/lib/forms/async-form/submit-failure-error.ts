/** Carries an action's failure through Angular's `submit()`, which only reports success as a boolean. */
export class SubmitFailureError extends Error {
  public override readonly name = 'SubmitFailureError';

  /** What the action threw, as an `Error` for the caller's `describeError`. */
  public readonly failure: Error;

  public constructor(cause: unknown) {
    super('Form action failed', { cause });
    this.failure = cause instanceof Error ? cause : new Error(String(cause));
  }
}
