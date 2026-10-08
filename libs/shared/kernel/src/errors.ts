import { z } from 'zod';

import type { ValueOf } from './value-of';

/** HTTP statuses the API answers errors with. */
export const HttpStatus = {
  NotFound: 404,
  Conflict: 409,
  UnprocessableContent: 422,
  InternalServerError: 500,
} as const;
export type HttpStatus = ValueOf<typeof HttpStatus>;

/** RFC 9457 `type` of every problem the API returns. */
export const ProblemType = {
  NotFound: 'not-found',
  VersionConflict: 'version-conflict',
  Validation: 'validation',
  Internal: 'internal',
} as const;
export type ProblemType = ValueOf<typeof ProblemType>;

/** Base for errors that carry domain meaning across the API boundary. */
export abstract class DomainError extends Error {
  public override readonly name: string = 'DomainError';
  public abstract readonly status: HttpStatus;
  public abstract readonly type: ProblemType;
}

export class NotFoundError extends DomainError {
  public override readonly name = 'NotFoundError';
  public readonly status = HttpStatus.NotFound;
  public readonly type = ProblemType.NotFound;

  public constructor(resource: string, id: string) {
    super(`${resource} ${id} was not found`);
  }
}

/** Optimistic concurrency failure: the aggregate changed since the client read it. */
export class VersionConflictError extends DomainError {
  public override readonly name = 'VersionConflictError';
  public readonly status = HttpStatus.Conflict;
  public readonly type = ProblemType.VersionConflict;

  public constructor(resource: string, id: string) {
    super(`${resource} ${id} was changed by someone else`);
  }
}

export class ValidationError extends DomainError {
  public override readonly name = 'ValidationError';
  public readonly status = HttpStatus.UnprocessableContent;
  public readonly type = ProblemType.Validation;
  public readonly issues: readonly z.core.$ZodIssue[];

  public constructor(issues: readonly z.core.$ZodIssue[]) {
    super('The request is invalid');
    this.issues = issues;
  }
}

/** RFC 9457 problem details, the wire shape of every API error. */
export const ProblemSchema = z.object({
  type: z.enum(ProblemType),
  title: z.string(),
  status: z.enum(HttpStatus),
  detail: z.string().optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;
