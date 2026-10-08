import { HttpStatus } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';

/** A failed API call, carrying the server's problem details when it sent them. */
export class ApiError extends Error {
  public override readonly name = 'ApiError';
  public readonly status: number;
  public readonly problem: Problem | undefined;

  public constructor(status: number, problem: Problem | undefined) {
    super(problem?.title ?? `Request failed with status ${status}`);
    this.status = status;
    this.problem = problem;
  }

  public get isConflict(): boolean {
    return this.status === HttpStatus.Conflict;
  }

  public static isConflict(error: unknown): boolean {
    return error instanceof ApiError && error.isConflict;
  }
}
