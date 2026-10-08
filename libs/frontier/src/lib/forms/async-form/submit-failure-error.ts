/** Carries an action's failure through Angular's `submit()`, which only reports success as a boolean. */
export class SubmitFailureError extends Error {
  public override readonly name = 'SubmitFailureError';

  public constructor(cause: unknown) {
    super('Form action failed', { cause });
  }
}
