import { z } from 'zod';

/** Base for errors that carry domain meaning across the API boundary. */
export abstract class DomainError extends Error {
  public override readonly name: string = 'DomainError';
  public abstract readonly status: number;
  public abstract readonly type: string;
}

export class NotFoundError extends DomainError {
  public override readonly name = 'NotFoundError';
  public readonly status = 404;
  public readonly type = 'not-found';

  public constructor(resource: string, id: string) {
    super(`${resource} ${id} was not found`);
  }
}

/** Optimistic concurrency failure: the aggregate changed since the client read it. */
export class VersionConflictError extends DomainError {
  public override readonly name = 'VersionConflictError';
  public readonly status = 409;
  public readonly type = 'version-conflict';

  public constructor(resource: string, id: string) {
    super(`${resource} ${id} was changed by someone else`);
  }
}

export class ValidationError extends DomainError {
  public override readonly name = 'ValidationError';
  public readonly status = 422;
  public readonly type = 'validation';
  public readonly issues: readonly z.core.$ZodIssue[];

  public constructor(issues: readonly z.core.$ZodIssue[]) {
    super('The request is invalid');
    this.issues = issues;
  }
}

/** RFC 9457 problem details, the wire shape of every API error. */
export const ProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;
