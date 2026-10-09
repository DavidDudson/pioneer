import { HttpStatus, message, ProblemMessage } from '@pioneer/shared/kernel';
import type { FieldIssue, MessageDescriptor, Problem } from '@pioneer/shared/kernel';

/** `HttpErrorResponse.status` when the request never got an answer (offline, DNS, CORS). */
const NO_RESPONSE = 0;

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

  public get isUnauthorized(): boolean {
    return this.status === HttpStatus.Unauthorized;
  }

  public get isConflict(): boolean {
    return this.status === HttpStatus.Conflict;
  }

  /** What to tell the viewer, as a message descriptor to format in their locale. */
  public get descriptor(): MessageDescriptor {
    if (this.problem !== undefined) {
      return this.problem.message;
    }
    return message(this.status === NO_RESPONSE ? ProblemMessage.Unreachable : ProblemMessage.Internal);
  }

  /** Per-field validation issues from a 422, empty otherwise. */
  public get issues(): readonly FieldIssue[] {
    return this.problem?.issues ?? [];
  }

  public static isUnauthorized(error: unknown): boolean {
    return error instanceof ApiError && error.isUnauthorized;
  }

  public static isConflict(error: unknown): boolean {
    return error instanceof ApiError && error.isConflict;
  }

  /** The viewer-facing descriptor for any failure; non-API errors read as internal. */
  public static describe(error: unknown): MessageDescriptor {
    return error instanceof ApiError ? error.descriptor : message(ProblemMessage.Internal);
  }
}
