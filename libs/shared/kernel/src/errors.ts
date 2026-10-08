import { z } from 'zod';

import { FieldIssueSchema, message, MessageDescriptorSchema, ProblemMessage } from './message';
import type { FieldIssue, MessageDescriptor } from './message';
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

/**
 * Base for errors that carry domain meaning across the API boundary. `message` is for logs;
 * `descriptor` is what the viewer reads, formatted in their locale (ADR-0009).
 */
export abstract class DomainError extends Error {
  public override readonly name: string = 'DomainError';
  public abstract readonly status: HttpStatus;
  public abstract readonly type: ProblemType;
  public abstract readonly descriptor: MessageDescriptor;
}

export class NotFoundError extends DomainError {
  public override readonly name = 'NotFoundError';
  public readonly status = HttpStatus.NotFound;
  public readonly type = ProblemType.NotFound;
  public readonly descriptor: MessageDescriptor;

  public constructor(resource: string, id: string, descriptor: MessageDescriptor = message(ProblemMessage.NotFound)) {
    super(`${resource} ${id} was not found`);
    this.descriptor = descriptor;
  }
}

/** Optimistic concurrency failure: the aggregate changed since the client read it. */
export class VersionConflictError extends DomainError {
  public override readonly name = 'VersionConflictError';
  public readonly status = HttpStatus.Conflict;
  public readonly type = ProblemType.VersionConflict;
  public readonly descriptor: MessageDescriptor;

  public constructor(
    resource: string,
    id: string,
    descriptor: MessageDescriptor = message(ProblemMessage.VersionConflict),
  ) {
    super(`${resource} ${id} was changed by someone else`);
    this.descriptor = descriptor;
  }
}

export class ValidationError extends DomainError {
  public override readonly name = 'ValidationError';
  public readonly status = HttpStatus.UnprocessableContent;
  public readonly type = ProblemType.Validation;
  public readonly descriptor = message(ProblemMessage.Validation);
  public readonly issues: readonly FieldIssue[];

  public constructor(issues: readonly FieldIssue[]) {
    super(
      `The request is invalid: ${issues.map((issue) => `${issue.path.join('.')} ${issue.message.key}`).join(', ')}`,
    );
    this.issues = issues;
  }
}

/**
 * RFC 9457 problem details, the wire shape of every API error. `title` and `detail` are fixed
 * developer text; the UI shows `message` and per-field `issues`, formatted in the viewer's locale.
 */
export const ProblemSchema = z.object({
  type: z.enum(ProblemType),
  title: z.string(),
  status: z.enum(HttpStatus),
  detail: z.string().optional(),
  message: MessageDescriptorSchema,
  issues: z.array(FieldIssueSchema).optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;
